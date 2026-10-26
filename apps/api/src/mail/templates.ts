import type { Locale } from '@volkoff/shared';
import { formatMoney } from '@volkoff/shared';

interface Rendered {
    subject: string;
    html: string;
    text: string;
}

const escape = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Письма — в стиле сайта: белый фон, чёрные плашки, моноширинный шрифт.
const layout = (title: string, body: string, cta?: { href: string; label: string }, locale: Locale = 'ru') => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(title)}</title></head>
<body style="margin:0;background:#f2f0eb;font-family:'IBM Plex Mono',Menlo,Consolas,monospace;color:#0b0b0b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #0b0b0b">
<tr><td style="background:#0b0b0b;color:#ffffff;padding:10px 20px;font-size:12px;letter-spacing:.08em">#volkoff #rawstuff #handmade</td></tr>
<tr><td style="padding:28px 24px 8px;font-size:28px;letter-spacing:.12em;font-weight:700">VOLKOFF</td></tr>
<tr><td style="padding:0 24px"><span style="display:inline-block;background:#0b0b0b;color:#fff;padding:8px 12px;font-size:14px">${escape(title)}</span></td></tr>
<tr><td style="padding:20px 24px;font-size:14px;line-height:1.6">${body}</td></tr>
${
    cta
        ? `<tr><td style="padding:0 24px 28px"><a href="${cta.href}" style="display:inline-block;background:#c8ff00;color:#0b0b0b;border:1px solid #0b0b0b;padding:12px 20px;text-decoration:none;font-weight:700;letter-spacing:.05em">${escape(cta.label)} →</a>
<div style="margin-top:14px;font-size:11px;color:#777;word-break:break-all">${cta.href}</div></td></tr>`
        : ''
}
<tr><td style="border-top:1px solid #0b0b0b;padding:14px 24px;font-size:11px;color:#777">//volkoffmvs.com — ${locale === 'en' ? 'automated email, no need to reply.' : 'письмо отправлено автоматически, отвечать на него не нужно.'}</td></tr>
</table></td></tr></table></body></html>`;

export const verifyEmailTemplate = (locale: Locale, nickname: string, link: string): Rendered => {
    if (locale === 'en') {
        const subject = 'Confirm your email — Volkoff';
        return {
            subject,
            html: layout(
                'confirm email',
                `Yo, <b>${escape(nickname)}</b>.<br><br>That's your new street name. Confirm your email to place orders. The link is valid for 24 hours.`,
                { href: link, label: 'CONFIRM' }, 'en',
            ),
            text: `Yo, ${nickname}. Confirm your email: ${link} (valid for 24 hours)`,
        };
    }
    const subject = 'Подтверди почту — Volkoff';
    return {
        subject,
        html: layout(
            'подтверждение почты',
            `Здорово, <b>${escape(nickname)}</b>.<br><br>Это твой новый позывной. Подтверди почту, чтобы оформлять заказы. Ссылка живёт 24 часа.`,
            { href: link, label: 'ПОДТВЕРДИТЬ' },
        ),
        text: `Здорово, ${nickname}. Подтверди почту: ${link} (ссылка действует 24 часа)`,
    };
};

export const resetPasswordTemplate = (locale: Locale, link: string): Rendered => {
    if (locale === 'en') {
        return {
            subject: 'Password reset — Volkoff',
            html: layout(
                'password reset',
                'Someone (hopefully you) asked to reset the password. The link is valid for 1 hour. If it wasn\'t you — just ignore this email.',
                { href: link, label: 'RESET PASSWORD' }, 'en',
            ),
            text: `Reset your password: ${link} (valid for 1 hour). If it wasn't you, ignore this email.`,
        };
    }
    return {
        subject: 'Сброс пароля — Volkoff',
        html: layout(
            'сброс пароля',
            'Кто-то (надеемся, ты) запросил сброс пароля. Ссылка действует 1 час. Если это был не ты — просто проигнорируй письмо.',
            { href: link, label: 'СБРОСИТЬ ПАРОЛЬ' },
        ),
        text: `Сброс пароля: ${link} (ссылка действует 1 час). Если это был не ты — проигнорируй письмо.`,
    };
};

interface OrderMailData {
    number: number;
    total: number;
    currency: 'RUB' | 'USD';
    items: { name: string; size: string; quantity: number }[];
}

export const orderPaidTemplate = (locale: Locale, order: OrderMailData, link: string): Rendered => {
    const list = order.items.map((i) => `— ${escape(i.name)} [${escape(i.size)}] ×${i.quantity}`).join('<br>');
    const total = formatMoney(order.total, order.currency, locale);
    if (locale === 'en') {
        return {
            subject: `Order #${order.number} paid — Volkoff`,
            html: layout(`order #${order.number} paid`, `Payment received, we're packing.<br><br>${list}<br><br><b>Total: ${total}</b>`, {
                href: link,
                label: 'VIEW ORDER',
            }, 'en'),
            text: `Order #${order.number} paid. Total: ${total}. ${link}`,
        };
    }
    return {
        subject: `Заказ #${order.number} оплачен — Volkoff`,
        html: layout(`заказ #${order.number} оплачен`, `Оплата пришла, собираем посылку.<br><br>${list}<br><br><b>Итого: ${total}</b>`, {
            href: link,
            label: 'СМОТРЕТЬ ЗАКАЗ',
        }),
        text: `Заказ #${order.number} оплачен. Итого: ${total}. ${link}`,
    };
};

export const orderShippedTemplate = (locale: Locale, number: number, tracking: string | null, link: string): Rendered => {
    const tr = tracking ? escape(tracking) : '—';
    if (locale === 'en') {
        return {
            subject: `Order #${number} shipped — Volkoff`,
            html: layout(`order #${number} shipped`, `It's on the way.<br><br>Tracking: <b>${tr}</b>`, { href: link, label: 'VIEW ORDER' }, 'en'),
            text: `Order #${number} shipped. Tracking: ${tracking ?? '—'}. ${link}`,
        };
    }
    return {
        subject: `Заказ #${number} отправлен — Volkoff`,
        html: layout(`заказ #${number} отправлен`, `Посылка в пути.<br><br>Трек-номер: <b>${tr}</b>`, { href: link, label: 'СМОТРЕТЬ ЗАКАЗ' }),
        text: `Заказ #${number} отправлен. Трек-номер: ${tracking ?? '—'}. ${link}`,
    };
};
