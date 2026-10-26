import type { FastifyInstance } from 'fastify';
import { changePasswordSchema, generateNickname, updateProfileSchema, type Locale } from '@volkoff/shared';
import { prisma } from '../db';
import { unauthorized } from '../lib/errors';
import { hashPassword, randomToken, verifyPassword } from '../lib/security';
import { orderInclude, toOrderDto, toUserDto } from '../lib/serializers';
import { parse, requireAuth } from '../plugins/auth';

export default async function meRoutes(app: FastifyInstance) {
    app.addHook('preHandler', requireAuth);

    app.get('/', async (req) => {
        const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } });
        if (!user) throw unauthorized();
        return toUserDto(user);
    });

    app.patch('/', async (req) => {
        const input = parse(updateProfileSchema, req.body);
        const user = await prisma.user.update({ where: { id: req.auth!.sub }, data: input });
        return toUserDto(user);
    });

    // Перегенерировать аватарку (новый seed)
    app.post('/avatar/reroll', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req) => {
        const user = await prisma.user.update({ where: { id: req.auth!.sub }, data: { avatarSeed: randomToken(12) } });
        return toUserDto(user);
    });

    // Перегенерировать никнейм
    app.post('/nickname/reroll', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req) => {
        const current = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.sub } });
        for (let i = 0; i < 20; i++) {
            const nickname = generateNickname(current.locale as Locale);
            const taken = await prisma.user.findUnique({ where: { nickname }, select: { id: true } });
            if (!taken) {
                const user = await prisma.user.update({ where: { id: current.id }, data: { nickname } });
                return toUserDto(user);
            }
        }
        return toUserDto(current);
    });

    app.post('/password', { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (req) => {
        const input = parse(changePasswordSchema, req.body);
        const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.sub } });
        if (!(await verifyPassword(user.passwordHash, input.currentPassword))) throw unauthorized('INVALID_CREDENTIALS');
        await prisma.$transaction([
            prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.newPassword) } }),
            // Все остальные сессии закрываем, текущую оставляем
            prisma.session.updateMany({
                where: { userId: user.id, revokedAt: null, id: { not: req.auth!.sid } },
                data: { revokedAt: new Date() },
            }),
        ]);
        return { ok: true };
    });

    app.get('/orders', async (req) => {
        const orders = await prisma.order.findMany({
            where: { userId: req.auth!.sub },
            include: orderInclude,
            orderBy: { createdAt: 'desc' },
        });
        return orders.map((o) => toOrderDto(o));
    });
}
