import { unlock } from './achievements';
import { RUN_A, RUN_B } from './wolfGrid';

// Волк-преследователь: редко выбегает с края экрана, бежит к курсору (или к последнему касанию),
// догоняет — кусает и убегает. Сквозь него можно кликать, он ничего не блокирует.

const CELL = 3;
// Тот же волк, что в играх (смотрит вправо), два кадра бега и пасть нараспашку
const BITE = [RUN_A[0], RUN_A[1], '..........########', '..........##.#....', '#.........##......', '##.......#########', ...RUN_A.slice(6)];

const W = RUN_A[0].length * CELL;
const H = RUN_A.length * CELL;
// где пасть относительно левого верхнего угла спрайта (смотрит вправо)
const MOUTH = { x: W - 2, y: 4 * CELL };

const svg = (grid: string[]) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid[0].length} ${grid.length}" width="${W}" height="${H}" shape-rendering="crispEdges"><path fill="#0b0b0b" d="${grid
        .flatMap((row, y) => [...row].map((c, x) => (c === '#' ? `M${x} ${y}h1v1h-1z` : '')))
        .join('')}"/></svg>`;

const FRAMES = { a: svg(RUN_A), b: svg(RUN_B), bite: svg(BITE) };

const SPEED = 330; // px/s — чуть быстрее спокойной мыши, но убежать можно
const GIVE_UP_MS = 8000;
const BITE_DIST = 18;

let pointer: { x: number; y: number } | null = null;
let running = false;

const busy = () =>
    document.hidden ||
    // открыта игра или другой попап — не мешаем
    !!document.querySelector('[role="dialog"]');

/** Один забег волка. Возвращает промис, который завершится, когда волк убежал. */
export const releaseChaser = () =>
    new Promise<void>((resolve) => {
        if (running) return resolve();
        running = true;

        const el = document.createElement('div');
        el.setAttribute('aria-hidden', 'true');
        Object.assign(el.style, {
            position: 'fixed',
            left: '0',
            top: '0',
            width: `${W}px`,
            height: `${H}px`,
            pointerEvents: 'none',
            zIndex: '9000',
            willChange: 'transform',
            // белая обводка — чтобы волка было видно и на чёрном футере
            filter: 'drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff)',
        } satisfies Partial<CSSStyleDeclaration>);
        el.innerHTML = FRAMES.a;
        document.body.appendChild(el);

        // выбегает с левого или правого края, на высоте курсора (или в нижней трети экрана)
        const fromLeft = pointer ? pointer.x > innerWidth / 2 : Math.random() < 0.5;
        let x = fromLeft ? -W : innerWidth;
        let y = Math.min(innerHeight - H - 8, Math.max(8, (pointer?.y ?? innerHeight * 0.75) - MOUTH.y));
        let facingRight = fromLeft;
        let frame = 0;
        let last = performance.now();
        const started = last;
        let phase: 'chase' | 'bite' | 'flee' = 'chase';
        let biteUntil = 0;
        let raf = 0;

        const render = () => {
            el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scaleX(${facingRight ? 1 : -1})`;
        };

        const finish = () => {
            cancelAnimationFrame(raf);
            el.remove();
            running = false;
            resolve();
        };

        const bite = (px: number, py: number) => {
            phase = 'bite';
            biteUntil = performance.now() + 650;
            el.innerHTML = FRAMES.bite;
            // «АМ!» прямо у курсора
            const tag = document.createElement('div');
            tag.textContent = 'АМ!';
            Object.assign(tag.style, {
                position: 'fixed',
                left: `${px + 10}px`,
                top: `${py - 26}px`,
                padding: '2px 6px',
                background: '#0b0b0b',
                color: '#fff',
                font: '700 12px/1.2 monospace',
                letterSpacing: '0.1em',
                pointerEvents: 'none',
                zIndex: '9001',
            } satisfies Partial<CSSStyleDeclaration>);
            document.body.appendChild(tag);
            tag.animate(
                [
                    { transform: 'scale(0.4)', opacity: 1 },
                    { transform: 'scale(1.15)', opacity: 1, offset: 0.25 },
                    { transform: 'scale(1) translateY(-10px)', opacity: 0 },
                ],
                { duration: 900, easing: 'steps(6)' },
            ).onfinish = () => tag.remove();
            // волка трясёт — грызёт
            el.animate([{ translate: '0 0' }, { translate: '-2px 1px' }, { translate: '2px -1px' }, { translate: '0 0' }], {
                duration: 160,
                iterations: 4,
            });
            unlock('bitten');
        };

        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;

            if (phase === 'chase') {
                const target = pointer ?? { x: innerWidth / 2, y: innerHeight * 0.75 };
                const mouthX = x + (facingRight ? MOUTH.x : W - MOUTH.x);
                const mouthY = y + MOUTH.y;
                const dx = target.x - mouthX;
                const dy = target.y - mouthY;
                const dist = Math.hypot(dx, dy);
                if (dist < BITE_DIST && pointer) {
                    bite(target.x, target.y);
                } else if (now - started > GIVE_UP_MS) {
                    phase = 'flee';
                } else {
                    // разворачивается, только если цель заметно с другой стороны — без дёрганья
                    if (dx > 12) facingRight = true;
                    else if (dx < -12) facingRight = false;
                    const step = Math.min(dist, SPEED * dt);
                    x += (dx / (dist || 1)) * step;
                    y += (dy / (dist || 1)) * step;
                }
            } else if (phase === 'bite') {
                if (now > biteUntil) {
                    phase = 'flee';
                    // удирает в сторону ближайшего края
                    facingRight = x + W / 2 > innerWidth / 2;
                }
            } else {
                x += (facingRight ? 1 : -1) * SPEED * 1.4 * dt;
                if (x < -W - 10 || x > innerWidth + 10) return finish();
            }

            if (phase !== 'bite') {
                frame += dt;
                el.innerHTML = Math.floor(frame * 11) % 2 ? FRAMES.b : FRAMES.a;
            }
            render();
            raf = requestAnimationFrame(tick);
        };

        render();
        raf = requestAnimationFrame(tick);
    });

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Расписание: редко и ненавязчиво — первый раз через 1,5–4 минуты, дальше раз в 6–12, не больше трёх за визит */
export const installChaser = () => {
    if (typeof window === 'undefined') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const track = (x: number, y: number) => (pointer = { x, y });
    window.addEventListener('pointermove', (e) => track(e.clientX, e.clientY), { passive: true });
    window.addEventListener('pointerdown', (e) => track(e.clientX, e.clientY), { passive: true });

    let left = 3;
    const schedule = (ms: number) =>
        window.setTimeout(async () => {
            if (left <= 0) return;
            if (busy()) return schedule(rand(20_000, 40_000));
            left--;
            await releaseChaser();
            schedule(rand(6, 12) * 60_000);
        }, ms);
    schedule(rand(90, 240) * 1000);
};
