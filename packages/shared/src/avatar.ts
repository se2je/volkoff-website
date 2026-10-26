import { hashString, mulberry32, pick } from './random';

// Генератор аватарок: пиксельный персонаж 10×10 в стиле волка-логотипа и рожиц корзины.
// Сетка целочисленная (1 клетка = 1 единица viewBox) и рисуется одним path — никаких щелей и полос.
// Глаза и рот — «прорези» строго внутри головы, поэтому лицо всегда читается.
// Детерминирован по seed: в БД хранится только строка-сид.

const N = 10;

/** Чёрно-белые сочетания под монохром сайта: [фон, тело, прорези] */
const PALETTES: [bg: string, body: string, cut: string][] = [
    ['#f5f5f5', '#0b0b0b', '#f5f5f5'],
    ['#ffffff', '#0b0b0b', '#ffffff'],
    ['#e6e6e6', '#0b0b0b', '#ffffff'],
    ['#0b0b0b', '#ffffff', '#0b0b0b'],
    ['#0b0b0b', '#e6e6e6', '#0b0b0b'],
];

type Cells = Set<string>;
const key = (x: number, y: number) => `${x},${y}`;

/** Клетка и её зеркальная пара — персонаж всегда симметричный */
const sym = (c: Cells, x: number, y: number) => {
    if (x < 0 || x >= N || y < 0 || y >= N) return;
    c.add(key(x, y));
    c.add(key(N - 1 - x, y));
};

const toPath = (c: Cells) =>
    [...c]
        .map((k) => {
            const [x, y] = k.split(',').map(Number);
            return `M${x} ${y}h1v1h-1z`;
        })
        .join('');

export const generateAvatarSvg = (seed: string, size = 128): string => {
    const rnd = mulberry32(hashString(seed));
    const [bg, bodyColor, cutColor] = pick(rnd, PALETTES);
    const body: Cells = new Set();
    const holes: Cells = new Set();

    // ---------- голова: строки 3..8, ширина 8 (x 1..8) или 6 (x 2..7) ----------
    const wide = rnd() < 0.65;
    const L = wide ? 1 : 2; // левый край головы
    const top = 3;
    const bottom = 8;
    for (let y = top; y <= bottom; y++) for (let x = L; x <= 4; x++) sym(body, x, y);
    // форма: скруглённый низ / «клин» как у волка / квадрат
    const shape = Math.floor(rnd() * 3);
    if (shape === 0) {
        body.delete(key(L, bottom));
        body.delete(key(N - 1 - L, bottom));
    } else if (shape === 1) {
        body.delete(key(L, bottom));
        body.delete(key(N - 1 - L, bottom));
        if (wide) {
            body.delete(key(L + 1, bottom));
            body.delete(key(N - 2 - L, bottom));
        }
        sym(body, 4, bottom + 1); // подбородок
    }

    // ---------- что сверху ----------
    const topper = Math.floor(rnd() * 6);
    if (topper === 0) {
        // уши
        sym(body, L, top - 1);
        sym(body, L, top - 2);
        sym(body, L + 1, top - 1);
    } else if (topper === 1) {
        // рога в стороны
        sym(body, L - 1 >= 0 ? L - 1 : 0, top - 2);
        sym(body, L, top - 1);
    } else if (topper === 2) {
        // ирокез
        sym(body, 4, top - 1);
        sym(body, 4, top - 2);
        sym(body, 4, top - 3);
    } else if (topper === 3) {
        // антенна с шариком
        sym(body, 4, top - 1);
        sym(body, 3, top - 2);
        sym(body, 3, top - 3);
    } else if (topper === 4) {
        // острые уши как у волка
        sym(body, L, top - 1);
        sym(body, L, top - 2);
        sym(body, L + 1, top - 1);
        sym(body, L + 2, top - 1);
    }
    // 5 — лысый

    // ---------- глаза: всегда с отступом от края головы ----------
    // узкой голове — только варианты, которые не упираются в край
    const eyeKinds = wide ? ['dots', 'tall', 'cyclops', 'angry', 'slits'] : ['dots', 'tall', 'cyclops'];
    const eyes = pick(rnd, eyeKinds);
    const tallEyes = eyes === 'tall' || eyes === 'angry';
    const eyeY = tallEyes ? top + 1 : top + 1 + (rnd() < 0.5 ? 1 : 0);
    if (eyes === 'dots') {
        sym(holes, 3, eyeY);
    } else if (eyes === 'tall') {
        sym(holes, 3, eyeY);
        sym(holes, 3, eyeY + 1);
    } else if (eyes === 'cyclops') {
        sym(holes, 4, eyeY);
    } else if (eyes === 'angry') {
        // внешний край выше, внутренний ниже — злой прищур
        sym(holes, 2, eyeY);
        sym(holes, 3, eyeY + 1);
    } else {
        // широкие щёлки
        sym(holes, 2, eyeY);
        sym(holes, 3, eyeY);
    }
    const eyeBottom = eyeY + (tallEyes ? 1 : 0);

    // ---------- рот: минимум одна пустая строка под глазами, не на нижнем ряду ----------
    const mouthY = Math.min(bottom - 1, eyeBottom + 2 + (rnd() < 0.4 ? 1 : 0));
    const mouths = wide ? ['flat', 'o', 'smile', 'grin'] : ['flat', 'o', 'smile'];
    const mouth = pick(rnd, mouths);
    if (mouth === 'flat') {
        sym(holes, 3, mouthY);
        sym(holes, 4, mouthY);
    } else if (mouth === 'o') {
        sym(holes, 4, mouthY);
    } else if (mouth === 'smile') {
        sym(holes, 4, mouthY);
        // уголки вверх — только если не слипнутся с глазами
        if (mouthY - 1 > eyeBottom + 1) sym(holes, 3, mouthY - 1);
        else sym(holes, 3, mouthY);
    } else {
        // широкая ухмылка от края до края
        sym(holes, 2, mouthY);
        sym(holes, 3, mouthY);
        sym(holes, 4, mouthY);
    }

    // ---------- центрируем персонажа по вертикали (у «лысых» иначе пусто сверху) ----------
    const ys = [...body].map((k) => Number(k.split(',')[1]));
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const dy = Math.floor((N - (maxY - minY + 1)) / 2) - minY;
    const shift = (c: Cells): Cells =>
        new Set(
            [...c].map((k) => {
                const [x, y] = k.split(',').map(Number);
                return key(x, y + dy);
            }),
        );
    const bodyCells = dy ? shift(body) : body;
    const holeCells = dy ? shift(holes) : holes;

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" width="${size}" height="${size}" shape-rendering="crispEdges">` +
        `<rect width="${N}" height="${N}" fill="${bg}"/>` +
        `<path d="${toPath(bodyCells)}" fill="${bodyColor}"/>` +
        `<path d="${toPath(holeCells)}" fill="${cutColor}"/>` +
        `</svg>`
    );
};

export const avatarDataUri = (seed: string, size = 128): string =>
    `data:image/svg+xml;utf8,${encodeURIComponent(generateAvatarSvg(seed, size))}`;
