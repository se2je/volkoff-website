import { LocalizedText } from '../data/catalogItems';

export type SupportedLang = 'ru' | 'en';

export const toLang = (lang: string): SupportedLang => (lang === 'ru' ? 'ru' : 'en');

export const localized = (text: LocalizedText, lang: string): string => {
    return text[toLang(lang)] ?? text.en;
};

export const getCurrency = (lang: string): string => (toLang(lang) === 'ru' ? '₽' : '$');

export const formatPrice = (price: { ru: number; en: number }, lang: string): string => {
    const value = price[toLang(lang)];
    return toLang(lang) === 'ru' ? new Intl.NumberFormat('ru-RU').format(value) : String(value);
};
