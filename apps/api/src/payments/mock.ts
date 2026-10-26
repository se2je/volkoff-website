import { env } from '../env';
import type { PaymentProvider } from './provider';

/**
 * Тестовый провайдер: ведёт на страницу сайта /pay/mock/:id, где можно «оплатить» или «отклонить».
 * Деньги не списываются. Подходит для разработки и тестового стенда.
 */
export const mockProvider: PaymentProvider = {
    name: 'mock',
    methods: ['card_rub', 'card_intl', 'crypto'],
    async createPayment({ paymentId }) {
        return {
            providerPaymentId: `mock_${paymentId}`,
            redirectUrl: `${env.WEB_URL}/pay/mock/${paymentId}`,
        };
    },
};
