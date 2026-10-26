import { useTranslation } from 'react-i18next';
import { formatMoney, type Currency, type Locale, type Localized } from '@volkoff/shared';
import { usePrefs } from '@/store/prefs';

export const toLocale = (lang: string): Locale => (lang.startsWith('en') ? 'en' : 'ru');

/** Хелперы, зависящие от текущего языка и валюты */
export const useFmt = () => {
    const { i18n } = useTranslation();
    const currency = usePrefs((s) => s.currency);
    const locale = toLocale(i18n.language);
    return {
        locale,
        currency,
        l: (text: Localized | null | undefined) => (text ? text[locale] || text.ru || text.en : ''),
        money: (minor: number, cur: Currency = currency) => formatMoney(minor, cur, locale),
        price: (p: { priceRub: number; priceUsd: number }, cur: Currency = currency) =>
            formatMoney(cur === 'RUB' ? p.priceRub : p.priceUsd, cur, locale),
        date: (iso: string) =>
            new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
                new Date(iso),
            ),
    };
};

export const errorText = (t: (k: string) => string, err: unknown): string => {
    const code = (err as { code?: string })?.code;
    if (code) {
        const key = `errors.${code}`;
        const translated = t(key);
        if (translated !== key) return translated;
    }
    return t('errors.generic');
};
