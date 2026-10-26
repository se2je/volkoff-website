import type { Currency } from './constants';

export interface CartMood {
    emoji: string;
    key: string;
}

// Пороги в основных единицах валюты. Чем больше в корзине — тем довольнее смайлик.
const LEVELS: { rub: number; usd: number; emoji: string; key: string }[] = [
    { rub: 0, usd: 0, emoji: '😡', key: 'empty' },
    { rub: 1, usd: 1, emoji: '🤨', key: 'tiny' },
    { rub: 8000, usd: 90, emoji: '🙂', key: 'ok' },
    { rub: 20000, usd: 230, emoji: '😏', key: 'taste' },
    { rub: 40000, usd: 460, emoji: '🤑', key: 'rich' },
    { rub: 80000, usd: 900, emoji: '🔥', key: 'fire' },
    { rub: 150000, usd: 1700, emoji: '👑', key: 'king' },
    { rub: 300000, usd: 3500, emoji: '💀', key: 'dead' },
];

/** total — в минорных единицах (копейки / центы) */
export const getCartMood = (totalMinor: number, currency: Currency): CartMood => {
    const total = totalMinor / 100;
    let mood = LEVELS[0];
    for (const level of LEVELS) {
        const threshold = currency === 'RUB' ? level.rub : level.usd;
        if (total >= threshold && (threshold > 0 || total === 0)) mood = level;
    }
    return { emoji: mood.emoji, key: mood.key };
};
