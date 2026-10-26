import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, type User } from '@prisma/client';
import {
    forgotPasswordSchema,
    generateNickname,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    type Locale,
} from '@volkoff/shared';
import { prisma } from '../db';
import { env, isProd } from '../env';
import { badRequest, conflict, forbidden, unauthorized } from '../lib/errors';
import {
    REFRESH_TTL_DAYS,
    burnPasswordCheck,
    hashPassword,
    randomToken,
    sha256,
    signAccessToken,
    verifyPassword,
} from '../lib/security';
import { toUserDto } from '../lib/serializers';
import { enqueueMail } from '../mail/outbox';
import { resetPasswordTemplate, verifyEmailTemplate } from '../mail/templates';
import { parse, requireAuth } from '../plugins/auth';

const REFRESH_COOKIE = 'vk_rt';
/** Сколько старый refresh-токен ещё принимается после замены — на случай одновременных запросов из нескольких вкладок */
const REFRESH_REUSE_GRACE_MS = 30_000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict' as const,
    path: '/api/auth',
};

/** Refresh-эндпоинты работают по cookie, поэтому дополнительно сверяем Origin (защита от CSRF). */
const assertSameOrigin = (req: FastifyRequest) => {
    const origin = req.headers.origin;
    if (origin && origin !== new URL(env.WEB_URL).origin && origin !== new URL(env.API_URL).origin) {
        throw forbidden('BAD_ORIGIN');
    }
};

const uniqueNickname = async (locale: Locale) => {
    for (let i = 0; i < 20; i++) {
        const nickname = generateNickname(locale);
        const exists = await prisma.user.findUnique({ where: { nickname }, select: { id: true } });
        if (!exists) return nickname;
    }
    return `${generateNickname(locale)}${Date.now().toString(36)}`;
};

export const issueEmailToken = async (user: Pick<User, 'id'>, type: 'VERIFY_EMAIL' | 'RESET_PASSWORD') => {
    const token = randomToken();
    // Старые неиспользованные токены этого типа гасим
    await prisma.emailToken.updateMany({
        where: { userId: user.id, type, usedAt: null },
        data: { usedAt: new Date() },
    });
    await prisma.emailToken.create({
        data: {
            userId: user.id,
            type,
            tokenHash: sha256(token),
            expiresAt: new Date(Date.now() + (type === 'VERIFY_EMAIL' ? VERIFY_TTL_MS : RESET_TTL_MS)),
        },
    });
    return token;
};

export const sendVerificationEmail = async (user: User) => {
    const token = await issueEmailToken(user, 'VERIFY_EMAIL');
    const link = `${env.WEB_URL}/verify-email?token=${token}`;
    await enqueueMail({ to: user.email, ...verifyEmailTemplate(user.locale as Locale, user.nickname, link) });
};

const startSession = async (req: FastifyRequest, reply: FastifyReply, user: User) => {
    const refresh = randomToken(48);
    const session = await prisma.session.create({
        data: {
            userId: user.id,
            tokenHash: sha256(refresh),
            userAgent: req.headers['user-agent']?.slice(0, 300),
            ip: req.ip,
            expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86400_000),
        },
    });
    reply.setCookie(REFRESH_COOKIE, refresh, { ...cookieOptions, maxAge: REFRESH_TTL_DAYS * 86400 });
    const accessToken = await signAccessToken({ sub: user.id, role: user.role, sid: session.id });
    return { accessToken, user: toUserDto(user) };
};

export default async function authRoutes(app: FastifyInstance) {
    // Жёсткий лимит на всё, что связано с паролями и почтой
    const strict = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

    app.post('/register', strict, async (req, reply) => {
        const input = parse(registerSchema, req.body);
        const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
        if (existing) throw conflict('EMAIL_TAKEN');

        const passwordHash = await hashPassword(input.password);
        let user: User;
        try {
            user = await prisma.user.create({
                data: {
                    email: input.email,
                    passwordHash,
                    locale: input.locale,
                    nickname: await uniqueNickname(input.locale),
                    avatarSeed: randomToken(12),
                    consentAt: new Date(),
                },
            });
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw conflict('EMAIL_TAKEN');
            throw err;
        }
        await sendVerificationEmail(user);
        reply.code(201);
        return startSession(req, reply, user);
    });

    app.post('/login', strict, async (req, reply) => {
        const input = parse(loginSchema, req.body);
        const user = await prisma.user.findUnique({ where: { email: input.email } });
        if (!user) {
            await burnPasswordCheck(input.password);
            throw unauthorized('INVALID_CREDENTIALS');
        }
        if (!(await verifyPassword(user.passwordHash, input.password))) throw unauthorized('INVALID_CREDENTIALS');
        return startSession(req, reply, user);
    });

    app.post('/refresh', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
        assertSameOrigin(req);
        const token = req.cookies[REFRESH_COOKIE];
        if (!token) throw unauthorized('NO_SESSION');

        const session = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
        if (!session) {
            reply.clearCookie(REFRESH_COOKIE, cookieOptions);
            throw unauthorized('NO_SESSION');
        }
        if (session.expiresAt < new Date()) {
            reply.clearCookie(REFRESH_COOKIE, cookieOptions);
            throw unauthorized('SESSION_EXPIRED');
        }

        // Токен только что заменили (две вкладки обновились одновременно) — это не кража, выдаём новую сессию
        const inGrace = (s: { rotatedAt: Date | null }) =>
            !!s.rotatedAt && Date.now() - s.rotatedAt.getTime() < REFRESH_REUSE_GRACE_MS;

        if (session.revokedAt) {
            if (inGrace(session)) return startSession(req, reply, session.user);
            // Повторное использование давно заменённого или отозванного токена — вероятная кража. Гасим все сессии.
            await prisma.session.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: new Date() } });
            reply.clearCookie(REFRESH_COOKIE, cookieOptions);
            app.log.warn({ userId: session.userId }, 'refresh token reuse detected');
            throw unauthorized('SESSION_REVOKED');
        }

        // Ротация: старую сессию закрываем (атомарно — параллельный запрос попадёт в «льготу» выше), выдаём новую
        const now = new Date();
        await prisma.session.updateMany({
            where: { id: session.id, revokedAt: null },
            data: { revokedAt: now, rotatedAt: now, lastUsedAt: now },
        });
        return startSession(req, reply, session.user);
    });

    app.post('/logout', async (req, reply) => {
        assertSameOrigin(req);
        const token = req.cookies[REFRESH_COOKIE];
        if (token) {
            await prisma.session.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
        }
        reply.clearCookie(REFRESH_COOKIE, cookieOptions);
        return { ok: true };
    });

    app.post('/logout-all', { preHandler: requireAuth }, async (req, reply) => {
        await prisma.session.updateMany({ where: { userId: req.auth!.sub, revokedAt: null }, data: { revokedAt: new Date() } });
        reply.clearCookie(REFRESH_COOKIE, cookieOptions);
        return { ok: true };
    });

    app.post('/verify-email', strict, async (req) => {
        const { token } = parse(verifyEmailSchema, req.body);
        const record = await prisma.emailToken.findUnique({ where: { tokenHash: sha256(token) } });
        if (!record || record.type !== 'VERIFY_EMAIL' || record.usedAt || record.expiresAt < new Date()) {
            throw badRequest('TOKEN_INVALID');
        }
        const [, user] = await prisma.$transaction([
            prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
            prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
        ]);
        // Админку по ADMIN_EMAILS выдаём только после подтверждения владения почтой
        if (env.ADMIN_EMAILS.includes(user.email) && user.role !== 'ADMIN') {
            const admin = await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
            return { ok: true, user: toUserDto(admin) };
        }
        return { ok: true, user: toUserDto(user) };
    });

    app.post(
        '/resend-verification',
        { preHandler: requireAuth, config: { rateLimit: { max: 3, timeWindow: '10 minutes' } } },
        async (req) => {
            const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.sub } });
            if (user.emailVerifiedAt) return { ok: true, alreadyVerified: true };
            await sendVerificationEmail(user);
            return { ok: true };
        },
    );

    app.post('/forgot-password', { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (req) => {
        const input = parse(forgotPasswordSchema, req.body);
        const user = await prisma.user.findUnique({ where: { email: input.email } });
        // Отвечаем одинаково, чтобы нельзя было перебором узнать зарегистрированные email
        if (user) {
            const token = await issueEmailToken(user, 'RESET_PASSWORD');
            const link = `${env.WEB_URL}/reset-password?token=${token}`;
            await enqueueMail({ to: user.email, ...resetPasswordTemplate((input.locale ?? user.locale) as Locale, link) });
        }
        return { ok: true };
    });

    app.post('/reset-password', strict, async (req) => {
        const input = parse(resetPasswordSchema, req.body);
        const record = await prisma.emailToken.findUnique({ where: { tokenHash: sha256(input.token) } });
        if (!record || record.type !== 'RESET_PASSWORD' || record.usedAt || record.expiresAt < new Date()) {
            throw badRequest('TOKEN_INVALID');
        }
        const passwordHash = await hashPassword(input.password);
        await prisma.$transaction([
            prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
            // Ссылка пришла на почту — значит почта подтверждена
            prisma.user.update({
                where: { id: record.userId },
                data: { passwordHash, emailVerifiedAt: new Date() },
            }),
            prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
        ]);
        return { ok: true };
    });
}
