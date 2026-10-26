import type { FastifyInstance } from 'fastify';
import {
    createOrderSchema,
    PAYMENT_METHOD_CURRENCY,
    type CreateOrderResponse,
    type Currency,
} from '@volkoff/shared';
import { prisma } from '../db';
import { env } from '../env';
import { HttpError, badRequest, forbidden, notFound } from '../lib/errors';
import { orderInclude, toOrderDto } from '../lib/serializers';
import { providerFor } from '../payments';
import { parse, requireAuth } from '../plugins/auth';

/** Доставка: по России бесплатно, международная — фикс. Поменять можно здесь. */
const shippingCost = (currency: Currency, country: string) => {
    const isRussia = /^(ru|rus|russia|россия|рф)$/i.test(country.trim());
    if (currency === 'RUB') return isRussia ? 0 : 3000_00;
    return isRussia ? 0 : 35_00;
};

export default async function orderRoutes(app: FastifyInstance) {
    app.addHook('preHandler', requireAuth);

    app.post('/', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
        const input = parse(createOrderSchema, req.body);
        const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.sub } });
        if (!user.emailVerifiedAt) throw forbidden('EMAIL_NOT_VERIFIED');

        const currency = PAYMENT_METHOD_CURRENCY[input.paymentMethod];
        const provider = providerFor(input.paymentMethod);

        // Схлопываем дубли (одна вещь одного размера несколько раз)
        const lines = new Map<string, { productId: string; size: string; quantity: number }>();
        for (const item of input.items) {
            const key = `${item.productId}::${item.size}`;
            const prev = lines.get(key);
            lines.set(key, { ...item, quantity: (prev?.quantity ?? 0) + item.quantity });
        }

        const order = await prisma.$transaction(async (tx) => {
            let subtotal = 0;
            const itemsData = [];
            for (const line of lines.values()) {
                const product = await tx.product.findUnique({
                    where: { id: line.productId },
                    include: { variants: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
                });
                if (!product || product.status !== 'ACTIVE') throw badRequest('PRODUCT_UNAVAILABLE', line.productId);
                const variant = product.variants.find((v) => v.size === line.size);
                if (!variant) throw badRequest('SIZE_UNAVAILABLE', `${product.nameEn} ${line.size}`);

                // Атомарный резерв: списываем только если остатка хватает
                const reserved = await tx.productVariant.updateMany({
                    where: { id: variant.id, stock: { gte: line.quantity } },
                    data: { stock: { decrement: line.quantity } },
                });
                if (reserved.count === 0) {
                    throw new HttpError(409, 'OUT_OF_STOCK', `${product.nameEn} ${line.size}`, {
                        productId: product.id,
                        size: line.size,
                        available: variant.stock,
                    });
                }

                const unitPrice = currency === 'RUB' ? product.priceRub : product.priceUsd;
                subtotal += unitPrice * line.quantity;
                itemsData.push({
                    productId: product.id,
                    variantId: variant.id,
                    nameRu: product.nameRu,
                    nameEn: product.nameEn,
                    image: product.images[0]?.url ?? null,
                    size: line.size,
                    unitPrice,
                    quantity: line.quantity,
                });
            }

            const shipping = shippingCost(currency, input.shipping.country);
            return tx.order.create({
                data: {
                    userId: user.id,
                    currency,
                    paymentMethod: input.paymentMethod,
                    subtotal,
                    shippingCost: shipping,
                    total: subtotal + shipping,
                    email: user.email,
                    ...input.shipping,
                    expiresAt: new Date(Date.now() + env.ORDER_RESERVATION_MINUTES * 60_000),
                    items: { create: itemsData },
                },
            });
        });

        const payment = await prisma.payment.create({
            data: { orderId: order.id, provider: provider.name, amount: order.total, currency: order.currency },
        });
        const created = await provider.createPayment({
            paymentId: payment.id,
            orderId: order.id,
            orderNumber: order.number,
            amount: order.total,
            currency: order.currency,
            method: input.paymentMethod,
            description: `VOLKOFF order #${order.number}`,
            customerEmail: user.email,
            returnUrl: `${env.WEB_URL}/account/orders/${order.id}`,
        });
        await prisma.payment.update({
            where: { id: payment.id },
            data: { providerPaymentId: created.providerPaymentId, redirectUrl: created.redirectUrl },
        });

        const full = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
        reply.code(201);
        const body: CreateOrderResponse = { order: toOrderDto(full), redirectUrl: created.redirectUrl };
        return body;
    });

    app.get<{ Params: { id: string } }>('/:id', async (req) => {
        const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
        if (!order || order.userId !== req.auth!.sub) throw notFound();
        return toOrderDto(order);
    });

    // Отмена неоплаченного заказа покупателем — резерв возвращается на склад
    app.post<{ Params: { id: string } }>('/:id/cancel', async (req) => {
        const order = await prisma.order.findUnique({ where: { id: req.params.id } });
        if (!order || order.userId !== req.auth!.sub) throw notFound();
        if (order.status !== 'PENDING_PAYMENT') throw badRequest('CANNOT_CANCEL');
        await cancelOrder(order.id);
        const full = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
        return toOrderDto(full);
    });
}

/** Отменяет заказ и возвращает товар на склад. Вызывается покупателем, админом и джобой по таймауту. */
export const cancelOrder = (orderId: string, status: 'CANCELLED' | 'REFUNDED' = 'CANCELLED') =>
    prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
        if (!order || order.status === 'CANCELLED' || order.status === 'REFUNDED') return;
        for (const item of order.items) {
            if (item.variantId) {
                await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
            }
        }
        await tx.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'CANCELED' } });
        await tx.order.update({ where: { id: orderId }, data: { status, expiresAt: null } });
    });

export const startOrderExpiryJob = (log: FastifyInstance['log']) => {
    const tick = async () => {
        try {
            const expired = await prisma.order.findMany({
                where: { status: 'PENDING_PAYMENT', expiresAt: { lt: new Date() } },
                select: { id: true, number: true },
            });
            for (const o of expired) {
                await cancelOrder(o.id);
                log.info({ order: o.number }, 'Неоплаченный заказ отменён по таймауту, резерв снят');
            }
        } catch (err) {
            log.error(err, 'order expiry job failed');
        }
    };
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
};
