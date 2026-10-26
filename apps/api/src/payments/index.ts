import type { Locale, PaymentMethod } from '@volkoff/shared';
import { prisma } from '../db';
import { env } from '../env';
import { enqueueMail } from '../mail/outbox';
import { orderPaidTemplate } from '../mail/templates';
import { mockProvider } from './mock';
import type { PaymentProvider } from './provider';
import { tkassaConfigured, tkassaProvider } from './tkassa';

const providers: Record<string, PaymentProvider> = {
    mock: mockProvider,
    tkassa: tkassaProvider,
};

/**
 * Какой провайдер обслуживает способ оплаты:
 * рубли — Т-Касса, если заданы её ключи; остальное (и рубли без ключей) — тестовый mock.
 */
export const providerFor = (method: PaymentMethod): PaymentProvider => {
    if (method === 'card_rub' && tkassaConfigured()) return tkassaProvider;
    return providers[env.PAYMENT_PROVIDER];
};

export const getProvider = (name: string): PaymentProvider | undefined => providers[name];

/** Идемпотентно помечает платёж успешным, а заказ — оплаченным. */
export const markPaymentSucceeded = async (paymentId: string, raw?: unknown) => {
    const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
        if (!payment || payment.status === 'SUCCEEDED') return null;
        await tx.payment.update({
            where: { id: paymentId },
            data: { status: 'SUCCEEDED', raw: raw === undefined ? undefined : (raw as object) },
        });
        if (payment.order.status !== 'PENDING_PAYMENT' && payment.order.status !== 'CANCELLED') return null;
        // Если заказ успел отмениться по таймауту, а оплата всё же пришла — восстанавливаем резерв
        if (payment.order.status === 'CANCELLED') {
            const items = await tx.orderItem.findMany({ where: { orderId: payment.orderId } });
            for (const item of items) {
                if (item.variantId) {
                    await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { decrement: item.quantity } } });
                }
            }
        }
        return tx.order.update({
            where: { id: payment.orderId },
            data: { status: 'PAID', expiresAt: null },
            include: { items: true, user: true },
        });
    });

    if (result) {
        const locale = result.user.locale as Locale;
        await enqueueMail({
            to: result.email,
            ...orderPaidTemplate(
                locale,
                {
                    number: result.number,
                    total: result.total,
                    currency: result.currency,
                    items: result.items.map((i) => ({ name: locale === 'en' ? i.nameEn : i.nameRu, size: i.size, quantity: i.quantity })),
                },
                `${env.WEB_URL}/account/orders/${result.id}`,
            ),
        });
    }
    return result;
};

export const markPaymentFailed = async (paymentId: string, status: 'FAILED' | 'CANCELED', raw?: unknown) => {
    await prisma.payment.updateMany({
        where: { id: paymentId, status: 'PENDING' },
        data: { status, raw: raw === undefined ? undefined : (raw as object) },
    });
};
