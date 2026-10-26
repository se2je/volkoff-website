import { buildApp } from './app';
import { prisma } from './db';
import { env } from './env';
import { startMailWorker } from './mail/outbox';
import { startOrderExpiryJob } from './routes/orders';

const app = await buildApp();
const stopMail = startMailWorker(app.log);
const stopExpiry = startOrderExpiryJob(app.log);

const shutdown = async (signal: string) => {
    app.log.info(`${signal} — останавливаемся`);
    stopMail();
    stopExpiry();
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

// Почты из ADMIN_EMAILS получают админку — но только если почта уже подтверждена
if (env.ADMIN_EMAILS.length) {
    const promoted = await prisma.user.updateMany({
        where: { email: { in: env.ADMIN_EMAILS }, emailVerifiedAt: { not: null }, role: 'USER' },
        data: { role: 'ADMIN' },
    });
    if (promoted.count) app.log.info({ count: promoted.count }, 'ADMIN_EMAILS: выданы права админа');
}

await app.listen({ port: env.PORT, host: env.HOST });
