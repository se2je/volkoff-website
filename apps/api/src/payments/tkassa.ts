import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../env';
import { HttpError } from '../lib/errors';
import type { PaymentItem, PaymentProvider, WebhookResult } from './provider';

// Т-Касса (интернет-эквайринг Т-Банка), API v2.
// Поток: Init → редирект покупателя на PaymentURL → уведомление на NotificationURL → статус CONFIRMED = деньги списаны.

type Scalar = string | number | boolean;

/**
 * Подпись запроса/уведомления (Token):
 * берём параметры корневого уровня (вложенные объекты Receipt, DATA и сам Token не участвуют),
 * добавляем Password, сортируем по ключу, склеиваем значения и считаем SHA-256 (hex).
 */
export const tkassaToken = (params: Record<string, unknown>, password: string): string => {
    const flat: Record<string, string> = { Password: password };
    for (const [key, value] of Object.entries(params)) {
        if (key === 'Token' || value === undefined || value === null) continue;
        if (typeof value === 'object') continue;
        flat[key] = String(value as Scalar);
    }
    const joined = Object.keys(flat)
        .sort()
        .map((k) => flat[k])
        .join('');
    return createHash('sha256').update(joined, 'utf8').digest('hex');
};

export const verifyTkassaToken = (params: Record<string, unknown>, password: string): boolean => {
    const received = typeof params.Token === 'string' ? params.Token : '';
    const expected = tkassaToken(params, password);
    if (received.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
};

// Чек по 54-ФЗ: товары + доставка отдельной позицией
const buildReceipt = (items: PaymentItem[], shippingCost: number, email: string) => {
    const positions = items.map((i) => ({
        Name: i.name.slice(0, 128),
        Price: i.unitPrice,
        Quantity: i.quantity,
        Amount: i.unitPrice * i.quantity,
        Tax: env.TKASSA_VAT,
        PaymentMethod: 'full_payment',
        PaymentObject: 'commodity',
    }));
    if (shippingCost > 0) {
        positions.push({
            Name: 'Доставка',
            Price: shippingCost,
            Quantity: 1,
            Amount: shippingCost,
            Tax: env.TKASSA_VAT,
            PaymentMethod: 'full_payment',
            PaymentObject: 'service',
        });
    }
    return { Email: email, Taxation: env.TKASSA_TAXATION, Items: positions };
};

interface TkassaResponse {
    Success: boolean;
    ErrorCode: string;
    Message?: string;
    Details?: string;
    PaymentId?: string | number;
    PaymentURL?: string;
    Status?: string;
}

const call = async (method: 'Init' | 'Cancel' | 'GetState', body: Record<string, unknown>): Promise<TkassaResponse> => {
    const payload = { TerminalKey: env.TKASSA_TERMINAL_KEY, ...body };
    const signed = { ...payload, Token: tkassaToken(payload, env.TKASSA_PASSWORD) };
    let res: Response;
    try {
        res = await fetch(`${env.TKASSA_API_URL}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signed),
            signal: AbortSignal.timeout(20_000),
        });
    } catch (err) {
        // Частая причина в проде — нет сертификата Минцифры (см. docs/PAYMENTS-TKASSA.md, NODE_EXTRA_CA_CERTS)
        throw new HttpError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', `T-Kassa ${method}: ${(err as Error).message}`);
    }
    const data = (await res.json().catch(() => null)) as TkassaResponse | null;
    if (!data || !data.Success || data.ErrorCode !== '0') {
        throw new HttpError(
            502,
            'PAYMENT_PROVIDER_ERROR',
            `T-Kassa ${method}: ${data?.ErrorCode ?? res.status} ${data?.Message ?? ''} ${data?.Details ?? ''}`.trim(),
        );
    }
    return data;
};

// Т-Касса ждёт дату в формате ISO 8601 с часовым поясом
const toTkassaDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '+00:00');

const STATUS_MAP: Record<string, WebhookResult['status']> = {
    CONFIRMED: 'SUCCEEDED',
    REJECTED: 'FAILED',
    AUTH_FAIL: 'FAILED',
    CANCELED: 'CANCELED',
    DEADLINE_EXPIRED: 'CANCELED',
    REVERSED: 'REFUNDED',
    REFUNDED: 'REFUNDED',
    PARTIAL_REFUNDED: 'REFUNDED',
};

export const tkassaProvider: PaymentProvider = {
    name: 'tkassa',
    methods: ['card_rub'],
    webhookAck: { contentType: 'text/plain', body: 'OK' },

    async createPayment(args) {
        if (args.currency !== 'RUB') throw new HttpError(400, 'UNSUPPORTED_CURRENCY', 'T-Kassa accepts RUB only');
        const body: Record<string, unknown> = {
            Amount: args.amount,
            // наш id платежа: уникален на каждую попытку оплаты, ≤ 36 символов
            OrderId: args.paymentId,
            Description: args.description.slice(0, 140),
            NotificationURL: `${env.API_URL}/api/payments/webhook/tkassa`,
            SuccessURL: args.returnUrl,
            FailURL: args.returnUrl,
            Language: 'ru',
            DATA: { Email: args.customerEmail, OrderNumber: String(args.orderNumber) },
        };
        if (args.expiresAt) body.RedirectDueDate = toTkassaDate(args.expiresAt);
        if (env.TKASSA_SEND_RECEIPT) body.Receipt = buildReceipt(args.items, args.shippingCost, args.customerEmail);

        const res = await call('Init', body);
        if (!res.PaymentId || !res.PaymentURL) throw new HttpError(502, 'PAYMENT_PROVIDER_ERROR', 'T-Kassa Init: no PaymentURL');
        return { providerPaymentId: String(res.PaymentId), redirectUrl: res.PaymentURL };
    },

    async parseWebhook(req) {
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (body.TerminalKey !== env.TKASSA_TERMINAL_KEY || !verifyTkassaToken(body, env.TKASSA_PASSWORD)) {
            throw new HttpError(403, 'BAD_SIGNATURE', 'T-Kassa notification signature mismatch');
        }
        const status = STATUS_MAP[String(body.Status)];
        // AUTHORIZED / NEW / FORM_SHOWED и прочие промежуточные статусы нам не нужны
        if (!status) return null;
        return {
            providerPaymentId: String(body.PaymentId),
            status,
            amount: typeof body.Amount === 'number' ? body.Amount : Number(body.Amount),
            raw: { Status: body.Status, ErrorCode: body.ErrorCode, Pan: body.Pan, Amount: body.Amount },
        };
    },

    async refund({ providerPaymentId, amount, items, shippingCost, customerEmail }) {
        const body: Record<string, unknown> = { PaymentId: providerPaymentId, Amount: amount };
        if (env.TKASSA_SEND_RECEIPT) body.Receipt = buildReceipt(items, shippingCost, customerEmail);
        await call('Cancel', body);
    },
};

export const tkassaConfigured = () => !!(env.TKASSA_TERMINAL_KEY && env.TKASSA_PASSWORD);
