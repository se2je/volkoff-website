// Волк на реактивном ранце летит через сосновый лес — играется, пока ждёшь заказ.
// Тот же пиксельный стиль и те же колбэки, что у бега от цирка (engine.ts).
import { H, S, drawGrid, palette, type GameCallbacks, type Grid, type Phase } from './engine';

const GROUND = 222;

// Волк в профиль с ранцем за спиной, лапы болтаются
const WOLF_UP: Grid = [
    '..........#..#..',
    '..........##.##.',
    '.........#######',
    '.##......##.####',
    '.##.....#######.',
    '.##..#######....',
    '.###########....',
    '.##.#######.....',
    '.##..#.....#....',
    '......#.....#...',
];
// падает — лапы поджаты
const WOLF_DOWN: Grid = [...WOLF_UP.slice(0, 8), '.##.##....##....', '................'];

const gridW = (g: Grid) => g[0].length * S;
const gridH = (g: Grid) => g.length * S;

const GRAVITY = 1300;
const FLAP = -340;

const PINE_CELLS = 12; // ширина сосны в клетках
const TIER = 5; // высота одного яруса веток

interface Pine {
    x: number;
    gapTop: number;
    gapBottom: number;
    passed: boolean;
}

export const createFlyGame = (
    canvas: HTMLCanvasElement,
    cb: GameCallbacks,
    W = 720,
    follow: () => HTMLElement | null = () => null,
) => {
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    let phase: Phase = 'intro';
    let raf = 0;
    let last = performance.now();
    let t = 0;

    const wolfX = Math.round(W * 0.18);
    let y = 100; // верх спрайта
    let vy = 0;
    let flameT = 0; // сколько ещё горит большое пламя после взмаха

    let speed = 170;
    let pines: Pine[] = [];
    let untilNext = 0;
    let score = 0;
    let night = 0;
    let nightOn = false;
    let colors = palette(0);
    // далёкие сосны на фоне
    const far = Array.from({ length: Math.ceil(W / 40) + 2 }, (_, i) => ({ x: i * 40, h: 18 + ((i * 29) % 26) }));

    // просвет сужается с каждой сосной, но не меньше 84 px — один взмах поднимает примерно на 45
    const gap = () => Math.max(84, 112 - score * 0.8);

    const reset = () => {
        y = 100;
        vy = 0;
        speed = 170;
        pines = [];
        untilNext = 120;
        score = 0;
        if (nightOn) {
            nightOn = false;
            cb.onNight(false);
        }
    };

    const spawn = () => {
        const g = gap();
        const top = 34 + Math.random() * (GROUND - 34 - 30 - g);
        pines.push({ x: W + 10, gapTop: top, gapBottom: top + g, passed: false });
        untilNext = 210 + Math.random() * 40;
    };

    const wolfBox = () => ({ x: wolfX + 6, y: y + 6, w: gridW(WOLF_UP) - 14, h: gridH(WOLF_UP) - 10 });

    const hits = (p: Pine) => {
        const b = wolfBox();
        // ствол и ветки уже, чем вся сосна — бьёмся о середину
        const px = p.x + 6;
        const pw = PINE_CELLS * S - 12;
        if (b.x + b.w < px || b.x > px + pw) return false;
        return b.y < p.gapTop || b.y + b.h > p.gapBottom;
    };

    const update = (dt: number) => {
        t += dt;
        flameT = Math.max(0, flameT - dt);
        const target = nightOn ? 1 : 0;
        night = target > night ? Math.min(target, night + dt) : Math.max(target, night - dt);

        if (phase === 'intro') {
            // висит и покачивается, ждёт старта
            y = 100 + Math.sin(t * 3) * 6;
            return;
        }
        if (phase === 'over') {
            // падает на землю
            if (y + gridH(WOLF_DOWN) < GROUND) {
                vy += GRAVITY * dt;
                y = Math.min(GROUND - gridH(WOLF_DOWN), y + vy * dt);
            }
            return;
        }

        speed = Math.min(240, speed + 2 * dt);
        const dx = speed * dt;
        vy = Math.min(460, vy + GRAVITY * dt);
        y += vy * dt;
        if (y < 0) {
            y = 0;
            vy = 0;
        }

        for (const p of pines) p.x -= dx;
        pines = pines.filter((p) => p.x > -PINE_CELLS * S - 10);
        untilNext -= dx;
        if (untilNext <= 0) spawn();
        for (const f of far) {
            f.x -= dx * 0.25;
            if (f.x < -40) f.x += far.length * 40;
        }

        for (const p of pines) {
            if (!p.passed && p.x + PINE_CELLS * S < wolfX) {
                p.passed = true;
                score++;
                cb.onScore(score);
                const shouldNight = Math.floor(score / 10) % 2 === 1;
                if (shouldNight !== nightOn) {
                    nightOn = shouldNight;
                    cb.onNight(nightOn);
                }
            }
        }

        if (y + gridH(WOLF_UP) >= GROUND || pines.some(hits)) {
            phase = 'over';
            vy = Math.max(vy, 0);
            cb.onOver(score);
        }
    };

    /** Сосна ярусами: снизу — вверх острием, сверху — висит острием вниз */
    const drawPine = (x: number, from: number, to: number, up: boolean) => {
        ctx.fillStyle = colors.ink;
        const cx = Math.round(x + (PINE_CELLS * S) / 2);
        const height = to - from;
        // ствол
        ctx.fillRect(cx - S, Math.round(from), 2 * S, Math.round(height));
        // ярусы веток, от острия к основанию
        const tiers = Math.max(1, Math.floor(height / (TIER * S)));
        for (let k = 0; k < tiers; k++) {
            for (let r = 0; r < TIER; r++) {
                const half = Math.min(PINE_CELLS / 2, 1 + r + Math.floor(k / 2));
                const rowY = up ? from + (k * TIER + r) * S : to - (k * TIER + r + 1) * S;
                if (up ? rowY + S > to : rowY < from) continue;
                ctx.fillRect(cx - half * S, Math.round(rowY), half * 2 * S, S);
            }
        }
    };

    const draw = () => {
        colors = palette(night);
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, W, H);

        // далёкий лес
        ctx.fillStyle = colors.ghost;
        for (const f of far) {
            ctx.beginPath();
            ctx.moveTo(f.x, GROUND);
            ctx.lineTo(f.x + 14, GROUND - f.h);
            ctx.lineTo(f.x + 28, GROUND);
            ctx.closePath();
            ctx.fill();
        }

        for (const p of pines) {
            drawPine(p.x, 0, p.gapTop, false);
            drawPine(p.x, p.gapBottom, GROUND, true);
        }

        ctx.fillStyle = colors.ink;
        ctx.fillRect(0, GROUND, W, 2);

        const g = vy < 0 || phase === 'intro' ? WOLF_UP : WOLF_DOWN;
        drawGrid(ctx, g, wolfX, y, colors.ink);

        // пламя из ранца: после взмаха — длинное, иначе мерцает
        if (phase !== 'over') {
            const len = flameT > 0 ? 4 : Math.floor(t * 20) % 2 ? 2 : 1;
            const fx = wolfX + S;
            const fy = y + gridH(g) - S * 2;
            for (let i = 0; i < len; i++) ctx.fillRect(fx + ((i + Math.floor(t * 30)) % 2) * S, fy + i * S + S, S, S);
        }

        const el = follow();
        if (el) {
            el.style.left = `${((wolfX + gridW(g) - 12) / W) * 100}%`;
            el.style.bottom = `${Math.min(78, ((H - y + 10) / H) * 100)}%`;
        }
    };

    const frame = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        update(dt);
        draw();
        raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const flap = () => {
        vy = FLAP;
        flameT = 0.18;
    };

    return {
        get phase() {
            return phase;
        },
        start() {
            reset();
            phase = 'run';
            cb.onScore(0);
            flap();
        },
        jump(down: boolean) {
            if (down && phase === 'run') flap();
        },
        duck() {
            /* в полёте приседать некуда */
        },
        resync() {
            last = performance.now();
        },
        /** Состояние для автотеста проходимости (бот в scratchpad), игре не нужно */
        peek() {
            return { y, vy, h: gridH(WOLF_UP), pines: pines.map((p) => ({ ...p })) };
        },
        destroy() {
            cancelAnimationFrame(raf);
        },
    };
};
