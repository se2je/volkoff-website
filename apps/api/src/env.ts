import { z } from 'zod';

const bool = z
    .enum(['true', 'false', '1', '0', ''])
    .default('false')
    .transform((v) => v === 'true' || v === '1');

const schema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4000),
    HOST: z.string().default('0.0.0.0'),
    DATABASE_URL: z.string().min(1),
    WEB_URL: z.string().url(),
    API_URL: z.string().url(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET должен быть не короче 32 символов'),
    ADMIN_EMAILS: z
        .string()
        .default('')
        .transform((v) =>
            v
                .split(',')
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean),
        ),

    MAIL_TRANSPORT: z.enum(['smtp', 'direct', 'log']).default('log'),
    MAIL_FROM: z.string().default('VOLKOFF <no-reply@volkoffmvs.com>'),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().default(1025),
    SMTP_SECURE: bool,
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    MAIL_HELO_NAME: z.string().default('localhost'),
    DKIM_DOMAIN: z.string().default(''),
    DKIM_SELECTOR: z.string().default(''),
    DKIM_PRIVATE_KEY_PATH: z.string().default(''),
    /** PEM-ключ в base64 одной строкой — удобно хранить в Vault / .env */
    DKIM_PRIVATE_KEY_B64: z.string().default(''),

    PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
    UPLOADS_DIR: z.string().default('./uploads'),
    /** Сколько минут держим резерв неоплаченного заказа */
    ORDER_RESERVATION_MINUTES: z.coerce.number().default(30),
    /** Сколько reverse-proxy перед API (traefik + nginx = 2). 0 — не доверять X-Forwarded-For */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Некорректные переменные окружения:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
