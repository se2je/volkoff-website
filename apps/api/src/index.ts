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

await app.listen({ port: env.PORT, host: env.HOST });
