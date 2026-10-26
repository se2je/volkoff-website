import path from 'node:path';
import { mkdirSync } from 'node:fs';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { Prisma } from '@prisma/client';
import { env, isProd } from './env';
import { HttpError } from './lib/errors';
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import catalogRoutes from './routes/catalog';
import meRoutes from './routes/me';
import orderRoutes from './routes/orders';
import paymentRoutes from './routes/payments';

export const buildApp = async () => {
    const app = Fastify({
        logger: isProd
            ? { level: 'info', redact: ['req.headers.authorization', 'req.headers.cookie'] }
            : { level: 'debug', transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } },
        // Fastify в рантайме принимает число хопов, но в типах его нет
        trustProxy: (env.TRUST_PROXY > 0 ? env.TRUST_PROXY : false) as boolean,
        bodyLimit: 1024 * 1024,
    });

    await app.register(helmet, {
        // API отдаёт JSON и картинки; картинки должны грузиться с домена сайта
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: false,
    });
    await app.register(cors, {
        origin: [new URL(env.WEB_URL).origin],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    });
    await app.register(cookie);
    await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
    await app.register(multipart);

    const uploadsDir = path.resolve(env.UPLOADS_DIR);
    mkdirSync(uploadsDir, { recursive: true });
    await app.register(fastifyStatic, {
        root: uploadsDir,
        prefix: '/uploads/',
        maxAge: '30d',
        immutable: true,
        decorateReply: false,
    });

    app.setErrorHandler((err, req, reply) => {
        if (err instanceof HttpError) {
            return reply.code(err.statusCode).send({ error: err.code, message: err.message, details: err.details });
        }
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
            return reply.code(404).send({ error: 'NOT_FOUND', message: 'Not found' });
        }
        const status = (err as { statusCode?: number }).statusCode ?? 500;
        if (status >= 500) req.log.error(err);
        return reply.code(status).send({
            error: status === 429 ? 'RATE_LIMITED' : status >= 500 ? 'INTERNAL' : 'BAD_REQUEST',
            message: status >= 500 && isProd ? 'Internal error' : (err as Error).message,
        });
    });

    app.get('/api/health', async () => ({ ok: true }));

    await app.register(authRoutes, { prefix: '/api/auth' });
    await app.register(meRoutes, { prefix: '/api/me' });
    await app.register(catalogRoutes, { prefix: '/api' });
    await app.register(orderRoutes, { prefix: '/api/orders' });
    await app.register(paymentRoutes, { prefix: '/api/payments' });
    await app.register(adminRoutes, { prefix: '/api/admin' });

    return app;
};
