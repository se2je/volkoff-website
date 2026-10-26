import type { FastifyInstance } from 'fastify';
import type { OrderStatus } from '@prisma/client';
import {
    ACHIEVEMENTS,
    CLIENT_ACHIEVEMENTS,
    REROLL_COOLDOWN_MS,
    changePasswordSchema,
    generateNickname,
    unlockAchievementsSchema,
    updateProfileSchema,
    type AchievementKey,
    type Locale,
} from '@volkoff/shared';
import { prisma } from '../db';
import { tooMany, unauthorized } from '../lib/errors';

const PAID_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
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

    // Перегенерировать аватарку и ник — каждое не чаще раза в сутки, чтобы был азарт
    const assertCanReroll = (at: Date | null) => {
        if (at && Date.now() - at.getTime() < REROLL_COOLDOWN_MS) throw tooMany('REROLL_COOLDOWN');
    };

    app.post('/avatar/reroll', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req) => {
        const current = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.sub } });
        assertCanReroll(current.avatarRerolledAt);
        const user = await prisma.user.update({
            where: { id: current.id },
            data: { avatarSeed: randomToken(12), avatarRerolledAt: new Date() },
        });
        return toUserDto(user);
    });

    app.post('/nickname/reroll', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req) => {
        const current = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.sub } });
        assertCanReroll(current.nicknameRerolledAt);
        for (let i = 0; i < 20; i++) {
            const nickname = generateNickname(current.locale as Locale);
            const taken = await prisma.user.findUnique({ where: { nickname }, select: { id: true } });
            if (!taken) {
                const user = await prisma.user.update({ where: { id: current.id }, data: { nickname, nicknameRerolledAt: new Date() } });
                return toUserDto(user);
            }
        }
        return toUserDto(current);
    });

    // Достижения: серверные считаем по заказам, клиентские — из того, что прислал сайт
    app.get('/achievements', async (req) => {
        const userId = req.auth!.sub;
        const [user, paid] = await Promise.all([
            prisma.user.findUniqueOrThrow({ where: { id: userId } }),
            prisma.order.findMany({
                where: { userId, status: { in: PAID_STATUSES } },
                select: { createdAt: true, items: { select: { product: { select: { variants: { select: { stock: true } } } } } } },
            }),
        ]);
        const got = new Set<string>(user.achievements.filter((k) => CLIENT_ACHIEVEMENTS.includes(k as AchievementKey)));
        if (user.emailVerifiedAt) got.add('verified');
        if (paid.length >= 1) got.add('first_blood');
        if (paid.length >= 3) got.add('regular');
        // ночь по Москве: 00:00–04:59 (UTC+3)
        if (paid.some((o) => (o.createdAt.getUTCHours() + 3) % 24 < 5)) got.add('night_wolf');
        if (paid.some((o) => o.items.some((i) => i.product && i.product.variants.every((v) => v.stock === 0)))) got.add('last_one');
        return { keys: ACHIEVEMENTS.map((a) => a.key).filter((k) => got.has(k)) };
    });

    app.post('/achievements', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req) => {
        const { keys } = parse(unlockAchievementsSchema, req.body);
        const allowed = keys.filter((k) => CLIENT_ACHIEVEMENTS.includes(k as AchievementKey));
        const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.sub }, select: { achievements: true } });
        const merged = [...new Set([...user.achievements, ...allowed])];
        if (merged.length !== user.achievements.length) {
            await prisma.user.update({ where: { id: req.auth!.sub }, data: { achievements: merged } });
        }
        return { ok: true };
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
