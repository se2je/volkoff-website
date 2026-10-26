export const LOCALES = ['ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const CURRENCIES = ['RUB', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Способы оплаты. crypto всегда считается в USD (USDT и т.п.). */
export const PAYMENT_METHODS = ['card_rub', 'card_intl', 'crypto'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_CURRENCY: Record<PaymentMethod, Currency> = {
    card_rub: 'RUB',
    card_intl: 'USD',
    crypto: 'USD',
};

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ORDER_STATUSES = [
    'PENDING_PAYMENT',
    'PAID',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ROLES = ['USER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

/** Размерная сетка, в которой админка предлагает размеры (можно вписать и свой). */
export const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE SIZE', '28', '30', '32', '34', '36'];

/** Цены храним в минорных единицах: копейки / центы. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const formatMoney = (minor: number, currency: Currency, _locale: Locale = 'ru'): string => {
    const value = minor / 100;
    // Рубли всегда «35 000 ₽», доллары — «$400», независимо от языка интерфейса
    return new Intl.NumberFormat(currency === 'RUB' ? 'ru-RU' : 'en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: value % 1 === 0 ? 0 : 2,
        minimumFractionDigits: 0,
    }).format(value);
};

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Сортировка размеров: сначала буквенная сетка, потом числовая, остальное — по алфавиту */
export const compareSizes = (a: string, b: string): number => {
    const order = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const ia = order.indexOf(a.toUpperCase());
    const ib = order.indexOf(b.toUpperCase());
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    if (!Number.isNaN(na)) return -1;
    if (!Number.isNaN(nb)) return 1;
    return a.localeCompare(b);
};

/** Сколько дней вещь считается новинкой после выхода */
export const NEW_DAYS = 14;

export const isNewProduct = (p: { releasedAt: string }, now = Date.now()): boolean =>
    now - new Date(p.releasedAt).getTime() < NEW_DAYS * 86400_000;
