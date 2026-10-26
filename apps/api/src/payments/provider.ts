import type { FastifyRequest } from 'fastify';
import type { Currency, PaymentMethod } from '@volkoff/shared';

export interface CreatePaymentArgs {
    paymentId: string;
    orderId: string;
    orderNumber: number;
    amount: number; // минорные единицы
    currency: Currency;
    method: PaymentMethod;
    description: string;
    customerEmail: string;
    returnUrl: string;
}

export interface CreatePaymentResult {
    providerPaymentId: string;
    redirectUrl: string;
}

export interface WebhookResult {
    providerPaymentId: string;
    status: 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'REFUNDED';
    raw?: unknown;
}

/**
 * Единый интерфейс для платёжных шлюзов (ЮKassa / CloudPayments / крипто-процессинг и т.д.).
 * Новый провайдер = новый файл, реализующий этот интерфейс, + регистрация в payments/index.ts.
 * Сравнение провайдеров и план подключения — docs/PAYMENTS.md.
 */
export interface PaymentProvider {
    readonly name: string;
    /** Какие способы оплаты обслуживает провайдер */
    readonly methods: readonly PaymentMethod[];
    createPayment(args: CreatePaymentArgs): Promise<CreatePaymentResult>;
    /** Проверка подписи/IP и разбор вебхука. null — событие нас не интересует. */
    parseWebhook?(req: FastifyRequest): Promise<WebhookResult | null>;
    refund?(providerPaymentId: string, amount: number): Promise<void>;
}
