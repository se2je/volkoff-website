import { hashString, mulberry32, pick } from './random';

// Генератор аватарок: симметричный пиксельный «монстрик» 8x8 + глаза и рот.
// Детерминирован по seed — аватарка хранится в БД только как строка-сид.

const PALETTES: [bg: string, body: string, accent: string][] = [
    ['#0b0b0b', '#c8ff00', '#ffffff'],
    ['#f2f0eb', '#0b0b0b', '#ff3b1f'],
    ['#ff3b1f', '#0b0b0b', '#f2f0eb'],
    ['#1d2b1f', '#9bb08a', '#e6ff6b'],
    ['#2b1d14', '#c48a5a', '#f6e7cf'],
    ['#e9e4ff', '#4b2bff', '#0b0b0b'],
    ['#0b0b0b', '#ff6ad5', '#c8ff00'],
    ['#d9d4c7', '#4a4f3a', '#0b0b0b'],
    ['#101820', '#f2aa4c', '#ffffff'],
    ['#ffffff', '#36343b', '#c8ff00'],
];

const GRID = 8;

export const generateAvatarSvg = (seed: string, size = 128): string => {
    const rnd = mulberry32(hashString(seed));
    const [bg, body, accent] = pick(rnd, PALETTES);
    const cell = size / (GRID + 2);
    const offset = cell;
    const rects: string[] = [];

    // Тело: левая половина случайно, правая — зеркально
    const filled: boolean[][] = [];
    for (let y = 0; y < GRID; y++) {
        filled[y] = [];
        for (let x = 0; x < GRID / 2; x++) {
            // Центр заполняем чаще, края реже — так выходит силуэт, а не шум
            const centerBias = x / (GRID / 2);
            const v = rnd() < 0.35 + centerBias * 0.45;
            filled[y][x] = v;
            filled[y][GRID - 1 - x] = v;
        }
    }
    for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
            if (filled[y][x]) {
                rects.push(
                    `<rect x="${offset + x * cell}" y="${offset + y * cell}" width="${cell + 0.5}" height="${cell + 0.5}" fill="${body}"/>`,
                );
            }
        }
    }

    // Глаза
    const eyeY = 2 + Math.floor(rnd() * 2);
    const eyeX = 1 + Math.floor(rnd() * 2);
    const eyeStyle = Math.floor(rnd() * 3);
    for (const ex of [eyeX, GRID - 1 - eyeX]) {
        const cx = offset + ex * cell;
        const cy = offset + eyeY * cell;
        if (eyeStyle === 0) {
            rects.push(`<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" fill="${accent}"/>`);
        } else if (eyeStyle === 1) {
            rects.push(`<circle cx="${cx + cell / 2}" cy="${cy + cell / 2}" r="${cell * 0.55}" fill="${accent}"/>`);
            rects.push(`<circle cx="${cx + cell / 2}" cy="${cy + cell / 2}" r="${cell * 0.22}" fill="${bg}"/>`);
        } else {
            // «X» — как крестик в лого
            const p = cell * 0.15;
            rects.push(
                `<path d="M${cx + p} ${cy + p}L${cx + cell - p} ${cy + cell - p}M${cx + cell - p} ${cy + p}L${cx + p} ${cy + cell - p}" stroke="${accent}" stroke-width="${cell * 0.28}" stroke-linecap="square"/>`,
            );
        }
    }

    // Рот
    const mouthY = offset + (eyeY + 2 + Math.floor(rnd() * 2)) * cell;
    const mouthW = 2 + Math.floor(rnd() * 3);
    const mouthX = offset + ((GRID - mouthW) / 2) * cell;
    rects.push(`<rect x="${mouthX}" y="${mouthY}" width="${mouthW * cell}" height="${cell * 0.5}" fill="${accent}"/>`);

    // Иногда — «скотч» по диагонали, для бунтарства
    if (rnd() < 0.25) {
        rects.push(
            `<rect x="${-size * 0.2}" y="${size * 0.78}" width="${size * 1.4}" height="${cell * 0.9}" fill="${accent}" opacity="0.9" transform="rotate(-12 ${size / 2} ${size / 2})"/>`,
        );
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${bg}"/>${rects.join('')}</svg>`;
};

export const avatarDataUri = (seed: string, size = 128): string =>
    `data:image/svg+xml;utf8,${encodeURIComponent(generateAvatarSvg(seed, size))}`;
