import QRCode from 'qrcode';
import { WOLF } from './wolfGrid';

// QR-код в стиле сайта: квадратные модули, в центре — пиксельный волк.
// Уровень коррекции H (30%): волк закрывает центр, а код всё равно читается.

const QUIET = 4; // поле вокруг кода в модулях — без него сканеры промахиваются

export interface QrOptions {
    /** подпись под кодом, например «VOLKOFF_» — пусто, чтобы без подписи */
    caption?: string;
    /** размер подписи в модулях кода (по умолчанию 2.6) */
    captionSize?: number;
    /** CSS font-family подписи */
    captionFont?: string;
    ink?: string;
    paper?: string;
}

export const qrSvg = (text: string, { caption = '', captionSize = 2.6, captionFont = "'IBM Plex Mono', 'Courier New', monospace", ink = '#0b0b0b', paper = '#ffffff' }: QrOptions = {}) => {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
    const n = qr.modules.size;
    const data = qr.modules.data;

    // окно под волка: ~22% стороны, нечётное, чтобы стояло ровно по центру
    let hole = Math.round(n * 0.22);
    if (hole % 2 === 0) hole += 1;
    const h0 = (n - hole) / 2;
    const inHole = (x: number, y: number) => x >= h0 && x < h0 + hole && y >= h0 && y < h0 + hole;

    let d = '';
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            if (data[y * n + x] && !inHole(x, y)) d += `M${x + QUIET} ${y + QUIET}h1v1h-1z`;
        }
    }

    // волк 9×9 вписан в окно с полем в один модуль
    const wolfSize = hole - 2;
    const cell = wolfSize / WOLF.length;
    const wx = h0 + QUIET + 1;
    let wolf = '';
    WOLF.forEach((row, r) =>
        [...row].forEach((c, k) => {
            if (c === '#') wolf += `M${wx + k * cell} ${wx + r * cell}h${cell}v${cell}h${-cell}z`;
        }),
    );

    const side = n + QUIET * 2;
    const capH = caption ? captionSize * 1.55 : 0;
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side + capH}" shape-rendering="crispEdges">` +
        `<rect width="${side}" height="${side + capH}" fill="${paper}"/>` +
        `<path d="${d}" fill="${ink}"/>` +
        `<path d="${wolf}" fill="${ink}"/>` +
        (caption
            ? `<text x="${side / 2}" y="${side + captionSize}" text-anchor="middle" font-family="${captionFont.replace(/"/g, "'")}" font-size="${captionSize}" letter-spacing="${captionSize * 0.15}" fill="${ink}">${caption
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')}</text>`
            : '') +
        `</svg>`;
    return { svg, modules: n, side, aspect: (side + capH) / side };
};
