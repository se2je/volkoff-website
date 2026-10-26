import type { Locale } from './constants';
import { pick } from './random';

// Пулы слов для никнеймов вида «КрутойБро11» / «ГигаСтайл885».
// Прилагательные — в мужском роде, чтобы стыковались с существительными.
const RU_ADJECTIVES = [
    'Крутой', 'Дерзкий', 'Грязный', 'Кожаный', 'Дикий', 'Злой', 'Ржавый', 'Тихий', 'Бешеный',
    'Ночной', 'Лесной', 'Болотный', 'Кислотный', 'Бетонный', 'Уличный', 'Мятый', 'Рваный',
    'Чёрный', 'Хмурый', 'Сонный', 'Ледяной', 'Лютый', 'Стальной', 'Жёсткий', 'Пыльный',
];
const RU_PREFIXES = ['Гига', 'Мега', 'Турбо', 'Кибер', 'Ультра', 'Хард', 'Нео', 'Панк', 'Вайб', 'Хайп'];
const RU_NOUNS = [
    'Бро', 'Стайл', 'Волк', 'Панк', 'Ковбой', 'Байкер', 'Денди', 'Шаман', 'Рейвер', 'Скейтер',
    'Бандит', 'Кот', 'Ворон', 'Гонщик', 'Призрак', 'Хулиган', 'Деним', 'Кожан', 'Бомбер',
    'Гоблин', 'Сталкер', 'Бунтарь', 'Модник', 'Дрифтер', 'Чел',
];

const EN_ADJECTIVES = [
    'Dirty', 'Wild', 'Leather', 'Rusty', 'Acid', 'Concrete', 'Street', 'Night', 'Feral', 'Raw',
    'Ripped', 'Grim', 'Sleepy', 'Frozen', 'Savage', 'Steel', 'Dusty', 'Swamp', 'Loud', 'Cursed',
];
const EN_PREFIXES = ['Giga', 'Mega', 'Turbo', 'Cyber', 'Ultra', 'Hard', 'Neo', 'Punk', 'Hype', 'Vibe'];
const EN_NOUNS = [
    'Bro', 'Style', 'Wolf', 'Cowboy', 'Rider', 'Ghost', 'Raven', 'Rebel', 'Denim', 'Outlaw',
    'Goblin', 'Drifter', 'Raver', 'Skater', 'Bandit', 'Cat', 'Stalker', 'Shaman', 'Dandy', 'Dude',
];

export const generateNickname = (locale: Locale, rnd: () => number = Math.random): string => {
    const ru = locale === 'ru';
    const usePrefix = rnd() < 0.4;
    const first = usePrefix ? pick(rnd, ru ? RU_PREFIXES : EN_PREFIXES) : pick(rnd, ru ? RU_ADJECTIVES : EN_ADJECTIVES);
    const noun = pick(rnd, ru ? RU_NOUNS : EN_NOUNS);
    // 1–3 цифры, иногда «красивые» числа
    const pretty = [69, 77, 88, 99, 228, 404, 666, 777, 911, 1337];
    const num = rnd() < 0.15 ? pick(rnd, pretty) : Math.floor(rnd() * 999) + 1;
    return `${first}${noun}${num}`;
};
