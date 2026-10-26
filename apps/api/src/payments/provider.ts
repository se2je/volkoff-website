import type { FastifyRequest } from 'fastify';
import type { Currency, PaymentMethod } from '@volkoff/shared';

export interface PaymentItem {
    name: string;
    /** цена за штуку, минорные единицы */
    unitPrice: number;
    quantity: number;
}

export interface CreatePaymentArgs {
    paymentId: string;
    orderId: string;
    orderNumber: number;
    amount: number; // минорные единицы
    currency: Currency;
    method: PaymentMethod;
    description: string;
    customerEmail: string;
    customerPhone?: string;
    /** позиции для фискального чека (54-ФЗ) */
    items: PaymentItem[];
    shippingCost: number;
    returnUrl: string;
    /** до какого момента ссылка на оплату действительна (= резерв товара) */
    expiresAt?: Date | null;
}

export interface CreatePaymentResult {
    providerPaymentId: string;
    redirectUrl: string;
}

export interface WebhookResult {
    providerPaymentId: string;
    status: 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'REFUNDED' | 'PENDING';
    /** сумма из уведомления — сверяем с суммой платежа */
    amount?: number;
    raw?: unknown;
}

export interface RefundArgs {
    providerPaymentId: string;
    amount: number;
    items: PaymentItem[];
    shippingCost: number;
    customerEmail: string;
}

/**
 * Единый интерфейс для платёжных шлюзов (Т-Касса / Prodamus / крипто-процессинг и т.д.).
 * Новый провайдер = новый файл, реализующий этот интерфейс, + регистрация в payments/index.ts.
 * Сравнение провайдеров и план подключения — docs/PAYMENTS.md.
 */
export interface PaymentProvider {
    readonly name: string;
    /** Какие способы оплаты обслуживает провайдер */
    readonly methods: readonly PaymentMethod[];
    createPayment(args: CreatePaymentArgs): Promise<CreatePaymentResult>;
    /** Проверка подписи и разбор вебхука. null — событие нас не интересует. Бросает ошибку при неверной подписи. */
    parseWebhook?(req: FastifyRequest): Promise<WebhookResult | null>;
    /** Что ответить провайдеру на принятый вебхук (Т-Касса ждёт текст «OK») */
    webhookAck?: { contentType: string; body: string };
    refund?(args: RefundArgs): Promise<void>;
}
