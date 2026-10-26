import type { Currency } from './constants';
import { DEFAULT_CART_MOODS, type CartMoodLevel, type MoodKey } from './settings';

export interface CartMood {
    key: MoodKey;
    label: { ru: string; en: string };
}

/**
 * Рожица корзины по сумме. Чем больше в корзине — тем довольнее.
 * total — в минорных единицах (копейки / центы); пороги — из настроек админки.
 */
export const getCartMood = (
    totalMinor: number,
    currency: Currency,
    levels: CartMoodLevel[] = DEFAULT_CART_MOODS,
): CartMood => {
    const total = totalMinor / 100;
    let mood = levels[0];
    if (total > 0) {
        for (const level of levels.slice(1)) {
            const threshold = currency === 'RUB' ? level.rub : level.usd;
            if (total >= threshold) mood = level;
        }
        // любая непустая корзина — уже не «пустая»
        if (mood === levels[0] && levels[1]) mood = levels[1];
    }
    return { key: mood.key, label: mood.label };
};
