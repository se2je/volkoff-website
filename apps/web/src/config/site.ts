export const CONTACTS = {
    email: 'marcvolkov@icloud.com',
    instagram: 'https://www.instagram.com/volkoff_mv',
    instagramHandle: '@volkoff_mv',
};

/**
 * Реквизиты продавца для юр. документов (подставляются в {{PLACEHOLDER}} в markdown).
 * ⚠️ Заполнить до запуска продаж! Пока не заполнено — на страницах документов видно «[заполнить: ...]».
 */
export const LEGAL: Record<string, string> = {
    SELLER_NAME: '',
    SELLER_TYPE: '',
    INN: '',
    OGRNIP: '',
    ADDRESS: '',
    SITE_URL: 'https://volkoffmvs.com',
    EFFECTIVE_DATE: '',
    RKN_REGISTRY_NUMBER: '',
    HOSTING_PROVIDER: '',
    PAYMENT_PROVIDERS: '',
};

/** Сколько минут держим резерв неоплаченного заказа (должно совпадать с ORDER_RESERVATION_MINUTES на бэке) */
export const RESERVATION_MINUTES = 30;
