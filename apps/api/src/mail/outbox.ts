import type { FastifyBaseLogger } from 'fastify';
import { prisma } from '../db';
import { createTransport, type MailMessage } from './transport';

const MAX_ATTEMPTS = 6;
const POLL_MS = 5_000;

/** Ставит письмо в очередь. Отправит воркер — запрос не ждёт SMTP. */
export const enqueueMail = (msg: MailMessage) => prisma.mailOutbox.create({ data: msg });

export const startMailWorker = (log: FastifyBaseLogger) => {
    const send = createTransport(log);
    let running = false;

    const tick = async () => {
        if (running) return;
        running = true;
        try {
            const batch = await prisma.mailOutbox.findMany({
                where: { status: 'PENDING', sendAfter: { lte: new Date() } },
                orderBy: { createdAt: 'asc' },
                take: 10,
            });
            for (const mail of batch) {
                try {
                    await send(mail);
                    await prisma.mailOutbox.update({
                        where: { id: mail.id },
                        data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } },
                    });
                } catch (err) {
                    const attempts = mail.attempts + 1;
                    // экспоненциальный бэкофф: 1, 2, 4, 8, 16 минут
                    const delayMs = 60_000 * 2 ** (attempts - 1);
                    await prisma.mailOutbox.update({
                        where: { id: mail.id },
                        data: {
                            attempts,
                            lastError: (err as Error).message.slice(0, 1000),
                            status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
                            sendAfter: new Date(Date.now() + delayMs),
                        },
                    });
                    log.error({ to: mail.to, attempts, err: (err as Error).message }, 'Не удалось отправить письмо');
                }
            }
        } catch (err) {
            log.error(err, 'mail worker tick failed');
        } finally {
            running = false;
        }
    };

    const timer = setInterval(tick, POLL_MS);
    void tick();
    return () => clearInterval(timer);
};
