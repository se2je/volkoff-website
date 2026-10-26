import type { Localized } from './types';

// Достижения в кабинете. server — бэк считает сам по заказам и профилю,
// client — открываются на сайте (игры, пасхалки) и присылаются на бэк.
export const ACHIEVEMENTS = [
    { key: 'verified', source: 'server', icon: '✓', title: { ru: 'настоящий', en: 'the real one' }, hint: { ru: 'подтвердил почту', en: 'verified the email' } },
    { key: 'first_blood', source: 'server', icon: '1', title: { ru: 'первая кровь', en: 'first blood' }, hint: { ru: 'первая оплаченная вещь', en: 'first paid order' } },
    { key: 'regular', source: 'server', icon: '×3', title: { ru: 'свой в стае', en: 'one of the pack' }, hint: { ru: 'три оплаченных заказа', en: 'three paid orders' } },
    { key: 'night_wolf', source: 'server', icon: '☾', title: { ru: 'ночной волк', en: 'night wolf' }, hint: { ru: 'заказ между полуночью и пятью утра', en: 'ordered between midnight and 5 am' } },
    { key: 'last_one', source: 'server', icon: '!', title: { ru: 'последний экземпляр', en: 'the last one' }, hint: { ru: 'забрал вещь, которой больше нет', en: 'got a piece that is gone now' } },
    { key: 'runner_1000', source: 'client', icon: '1K', title: { ru: 'не выступаю', en: 'no circus' }, hint: { ru: 'пробежал 1000 м от цирка', en: 'ran 1000 m from the circus' } },
    { key: 'runner_3000', source: 'client', icon: '3K', title: { ru: 'беглец', en: 'fugitive' }, hint: { ru: 'пробежал 3000 м', en: 'ran 3000 m' } },
    { key: 'flyer_20', source: 'client', icon: '▲', title: { ru: 'реактивный', en: 'jet wolf' }, hint: { ru: 'пролетел 20 сосен на ранце', en: 'flew past 20 pines' } },
    { key: 'konami', source: 'client', icon: '↑↑', title: { ru: 'олдскул', en: 'old school' }, hint: { ru: 'набрал тот самый код', en: 'entered that very code' } },
    { key: 'howl', source: 'client', icon: 'ау', title: { ru: 'вой', en: 'howl' }, hint: { ru: 'написал «awoo» прямо на сайте', en: 'typed «awoo» right on the site' } },
    { key: 'lost', source: 'client', icon: '404', title: { ru: 'заблудился', en: 'lost' }, hint: { ru: 'ткнул волка на несуществующей странице', en: 'poked the wolf on a missing page' } },
    { key: 'bitten', source: 'client', icon: 'ам', title: { ru: 'покусан', en: 'bitten' }, hint: { ru: 'волк тебя догнал', en: 'the wolf caught you' } },
    { key: 'moon', source: 'client', icon: '○', title: { ru: 'лунатик', en: 'moonwalker' }, hint: { ru: 'зашёл в полнолуние', en: 'came by on a full moon' } },
] as const satisfies readonly { key: string; source: 'server' | 'client'; icon: string; title: Localized; hint: Localized }[];

export type AchievementKey = (typeof ACHIEVEMENTS)[number]['key'];
export const CLIENT_ACHIEVEMENTS = ACHIEVEMENTS.filter((a) => a.source === 'client').map((a) => a.key) as AchievementKey[];

/** Сколько раз в сутки можно перегенерировать аватарку и ник */
export const REROLL_COOLDOWN_MS = 24 * 60 * 60 * 1000;
