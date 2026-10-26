import { readFileSync, existsSync } from 'node:fs';
import { resolveMx } from 'node:dns/promises';
import nodemailer from 'nodemailer';
import type { FastifyBaseLogger } from 'fastify';
import { env } from '../env';

export interface MailMessage {
    to: string;
    subject: string;
    html: string;
    text: string;
}

type Send = (msg: MailMessage) => Promise<void>;

const loadDkim = () => {
    if (!env.DKIM_DOMAIN || !env.DKIM_SELECTOR) return undefined;
    let privateKey = '';
    if (env.DKIM_PRIVATE_KEY_B64) privateKey = Buffer.from(env.DKIM_PRIVATE_KEY_B64, 'base64').toString('utf8');
    else if (env.DKIM_PRIVATE_KEY_PATH && existsSync(env.DKIM_PRIVATE_KEY_PATH)) privateKey = readFileSync(env.DKIM_PRIVATE_KEY_PATH, 'utf8');
    if (!privateKey.includes('PRIVATE KEY')) return undefined;
    return { domainName: env.DKIM_DOMAIN, keySelector: env.DKIM_SELECTOR, privateKey };
};

/**
 * smtp   — через SMTP-релей (Mailpit в dev, свой postfix / любой SMTP в проде)
 * direct — «мини-почтовик»: бэкенд сам находит MX домена получателя и
 *          доставляет письмо на 25 порт, подписывая DKIM. Без Google и прочих.
 * log    — просто пишет письмо в лог
 */
export const createTransport = (log: FastifyBaseLogger): Send => {
    const dkim = loadDkim();

    if (env.MAIL_TRANSPORT === 'log') {
        return async (msg) => {
            log.info({ to: msg.to, subject: msg.subject }, `📧 [mail:log]\n${msg.text}`);
        };
    }

    if (env.MAIL_TRANSPORT === 'smtp') {
        const transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
            dkim,
        });
        return async (msg) => {
            await transporter.sendMail({ from: env.MAIL_FROM, ...msg });
        };
    }

    if (!dkim) {
        log.warn('MAIL_TRANSPORT=direct без DKIM-ключа — письма почти наверняка попадут в спам');
    }

    // direct
    return async (msg) => {
        const domain = msg.to.split('@')[1];
        if (!domain) throw new Error(`Некорректный адрес: ${msg.to}`);
        const mx = await resolveMx(domain).catch(() => []);
        // Нет MX — по RFC 5321 пробуем сам домен (A-запись)
        const hosts = mx.length ? mx.sort((a, b) => a.priority - b.priority).map((r) => r.exchange) : [domain];

        let lastError: unknown;
        for (const host of hosts) {
            try {
                const transporter = nodemailer.createTransport({
                    host,
                    port: 25,
                    secure: false,
                    name: env.MAIL_HELO_NAME,
                    // STARTTLS если сервер умеет; самоподписанные сертификаты у MX — норма
                    tls: { rejectUnauthorized: false },
                    connectionTimeout: 15_000,
                    greetingTimeout: 15_000,
                    dkim,
                });
                await transporter.sendMail({ from: env.MAIL_FROM, ...msg });
                return;
            } catch (err) {
                lastError = err;
                log.warn({ host, err: (err as Error).message }, 'MX недоступен, пробуем следующий');
            }
        }
        throw lastError ?? new Error('Не удалось доставить письмо');
    };
};
