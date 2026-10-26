import { useCallback, useRef, type MouseEvent } from 'react';

// Пасхалки с пиксельным волком. Всё рисуется прямо в body и само за собой убирается — React не трогаем.

/** Пиксельный волк 9×9 — тот же, что в brand/wolf и фавиконках */
export const WOLF = ['#_______#', '##_____##', '#########', '##_###_##', '#########', '_#######_', '__#####__', '___###___', '____#____'];
export const WOLF_PATH = WOLF.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? `M${x} ${y}h1v1h-1z` : ''))).join('');

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const wolfEl = (size: number, color: string) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 9 9');
    el.setAttribute('width', String(size));
    el.setAttribute('height', String(size));
    el.setAttribute('shape-rendering', 'crispEdges');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<path d="${WOLF_PATH}" fill="${color}"/>`;
    Object.assign(el.style, { position: 'fixed', left: '0', top: '0', pointerEvents: 'none', zIndex: '9999', willChange: 'transform' });
    return el;
};

/** Белые волки с чёрной обводкой видны и на светлом, и на тёмном фоне */
const COLORS = ['#0b0b0b', '#0b0b0b', '#ffffff'];
const outline = 'drop-shadow(1px 0 0 #0b0b0b) drop-shadow(-1px 0 0 #0b0b0b) drop-shadow(0 1px 0 #0b0b0b) drop-shadow(0 -1px 0 #0b0b0b)';

/** Волки разлетаются во все стороны из точки (x, y) */
export const wolfBurst = (x: number, y: number, count = 28) => {
    const n = reducedMotion() ? 6 : count;
    const reach = Math.max(innerWidth, innerHeight) * 0.6;
    for (let i = 0; i < n; i++) {
        const size = 12 + Math.round(Math.random() * 4) * 8; // кратно пикселю, чтобы не мылилось
        const color = COLORS[i % COLORS.length];
        const el = wolfEl(size, color);
        if (color === '#ffffff') el.style.filter = outline;
        document.body.appendChild(el);
        const angle = (i / n) * Math.PI * 2 + Math.random() * 0.4;
        const dist = reach * (0.45 + Math.random() * 0.55);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const spin = (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 540);
        const x0 = x - size / 2;
        const y0 = y - size / 2;
        el.animate(
            [
                { transform: `translate(${x0}px, ${y0}px) scale(0.2) rotate(0deg)`, opacity: 1 },
                { transform: `translate(${x0 + dx * 0.55}px, ${y0 + dy * 0.55}px) scale(1) rotate(${spin * 0.5}deg)`, opacity: 1, offset: 0.4 },
                // в конце чуть «падают» вниз — гравитация
                { transform: `translate(${x0 + dx}px, ${y0 + dy + 160}px) scale(0.9) rotate(${spin}deg)`, opacity: 0 },
            ],
            { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'forwards' },
        ).onfinish = () => el.remove();
    }
};

/** Волчий дождь сверху экрана */
export const wolfRain = (count = 40) => {
    const n = reducedMotion() ? 8 : count;
    for (let i = 0; i < n; i++) {
        const size = 16 + Math.round(Math.random() * 3) * 8;
        const color = COLORS[i % COLORS.length];
        const el = wolfEl(size, color);
        if (color === '#ffffff') el.style.filter = outline;
        document.body.appendChild(el);
        const x = Math.random() * (innerWidth - size);
        const drift = (Math.random() - 0.5) * 120;
        const anim = el.animate(
            [
                { transform: `translate(${x}px, ${-size}px) rotate(0deg)` },
                { transform: `translate(${x + drift}px, ${innerHeight + size}px) rotate(${(Math.random() - 0.5) * 720}deg)` },
            ],
            // steps — дёрганое «пиксельное» падение как в старых играх
            { duration: 1800 + Math.random() * 1800, delay: Math.random() * 1500, easing: 'steps(24)', fill: 'both' },
        );
        anim.onfinish = () => el.remove();
    }
};

/**
 * Обработчик клика, который срабатывает на N быстрых кликов подряд.
 * Обычные клики не трогает — ссылка на логотипе работает как раньше.
 */
export const useTapCombo = (onCombo: (e: MouseEvent) => void, taps = 5, windowMs = 1600) => {
    const hits = useRef<number[]>([]);
    return useCallback(
        (e: MouseEvent) => {
            const now = performance.now();
            hits.current = [...hits.current.filter((t) => now - t < windowMs), now];
            if (hits.current.length >= taps) {
                hits.current = [];
                onCombo(e);
            }
        },
        [onCombo, taps, windowMs],
    );
};

/** Взрыв волков из центра элемента, по которому кликнули */
export const burstFromEvent = (e: MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    const r = (target.querySelector('svg') ?? target).getBoundingClientRect();
    wolfBurst(r.left + r.width / 2, r.top + r.height / 2);
};

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const HOWLS = ['awoo', 'ауу', 'volkoff', 'волк'];

const CONSOLE_WOLF = WOLF.map((row) => row.replace(/#/g, '██').replace(/_/g, '  ')).join('\n');

let installed = false;

/** Глобальные пасхалки: код Konami и «awoo» на клавиатуре, волк в консоли, заголовок вкладки */
export const installEasterEggs = () => {
    if (installed || typeof window === 'undefined') return;
    installed = true;

    console.log(`%c${CONSOLE_WOLF}`, 'font-family:monospace;line-height:1;color:#0b0b0b;background:#f5f5f5;padding:8px');
    console.log('%cVOLKOFF_ — ручная работа. Нашёл консоль? Попробуй ↑↑↓↓←→←→BA или просто напечатай «awoo».', 'font-family:monospace');

    let keys: string[] = [];
    let typed = '';
    window.addEventListener('keydown', (e) => {
        const t = e.target as HTMLElement | null;
        // в полях ввода не мешаем
        if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        keys = [...keys, k].slice(-KONAMI.length);
        if (keys.join() === KONAMI.join()) {
            keys = [];
            wolfRain(60);
        }
        if (e.key.length === 1) {
            typed = (typed + e.key.toLowerCase()).slice(-12);
            if (HOWLS.some((w) => typed.endsWith(w))) {
                typed = '';
                wolfBurst(innerWidth / 2, innerHeight / 2, 36);
            }
        }
    });

    // Ушёл на другую вкладку — волк скучает
    let title = document.title;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            title = document.title;
            document.title = 'ауууу… вернись 🐺';
        } else if (document.title === 'ауууу… вернись 🐺') {
            document.title = title;
        }
    });
};
