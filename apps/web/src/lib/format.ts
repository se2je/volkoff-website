import { useTranslation } from 'react-i18next';
import { formatMoney, getCartMood, type ContentKey, type Currency, type Locale, type Localized } from '@volkoff/shared';
import { useSiteContent, useSiteSettings } from '@/api/queries';
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

/** Текст сайта из админки; если там пусто — значение по умолчанию из переводов */
export const useSiteText = () => {
    const { t, i18n } = useTranslation();
    const { data } = useSiteContent();
    const locale = toLocale(i18n.language);
    return (key: ContentKey) => data?.[key]?.[locale]?.trim() || t(key);
};

/** Настроение корзины по сумме — пороги и подписи из админки */
export const useCartMood = (totalMinor: number, currency: Currency) => {
    const { i18n } = useTranslation();
    const { cartMoods } = useSiteSettings();
    const mood = getCartMood(totalMinor, currency, cartMoods);
    return { key: mood.key, label: mood.label[toLocale(i18n.language)] || mood.label.ru };
};
