import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { env } from '../env';
import { badRequest, notFound } from '../lib/errors';
import { getProvider, markPaymentFailed, markPaymentSucceeded } from '../payments';
import { requireAuth } from '../plugins/auth';

export default async function paymentRoutes(app: FastifyInstance) {
    // Вебхуки реальных провайдеров: POST /api/payments/webhook/:provider
    app.post<{ Params: { provider: string } }>('/webhook/:provider', async (req) => {
        const provider = getProvider(req.params.provider);
        if (!provider?.parseWebhook) throw notFound();
        const event = await provider.parseWebhook(req);
        if (!event) return { ok: true };
        const payment = await prisma.payment.findUnique({
            where: { provider_providerPaymentId: { provider: provider.name, providerPaymentId: event.providerPaymentId } },
        });
        if (!payment) return { ok: true };
        if (event.status === 'SUCCEEDED') await markPaymentSucceeded(payment.id, event.raw);
        else if (event.status === 'FAILED' || event.status === 'CANCELED') await markPaymentFailed(payment.id, event.status, event.raw);
        return { ok: true };
    });

    // ---------- Тестовый провайдер ----------
    app.get<{ Params: { id: string } }>('/mock/:id', { preHandler: requireAuth }, async (req) => {
        const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { order: true } });
        if (!payment || payment.provider !== 'mock' || payment.order.userId !== req.auth!.sub) throw notFound();
        return {
            id: payment.id,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            orderId: payment.orderId,
            orderNumber: payment.order.number,
            method: payment.order.paymentMethod,
        };
    });

    app.post<{ Params: { id: string; action: string } }>('/mock/:id/:action', { preHandler: requireAuth }, async (req) => {
        if (env.PAYMENT_PROVIDER !== 'mock') throw notFound();
        const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { order: true } });
        if (!payment || payment.provider !== 'mock' || payment.order.userId !== req.auth!.sub) throw notFound();
        if (payment.status !== 'PENDING') throw badRequest('PAYMENT_NOT_PENDING');
        if (req.params.action === 'succeed') await markPaymentSucceeded(payment.id, { mock: true });
        else if (req.params.action === 'fail') await markPaymentFailed(payment.id, 'FAILED', { mock: true });
        else throw notFound();
        return { ok: true, orderId: payment.orderId };
    });
}
