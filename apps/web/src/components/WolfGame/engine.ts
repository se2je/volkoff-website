// VOLKOFF_RUN — пиксельный раннер: волк сбегает из цирка.
// Мир рисуется на canvas в логических координатах W×H, всё — квадратиками по S пикселей.

/** Логическая ширина: на телефоне поле уже — так волк крупнее, а скорости масштабируются от ширины */
export const worldWidth = (cssWidth: number) => (cssWidth < 560 ? 420 : 720);
export const H = 240;
const GROUND = 204;
const S = 3;

// День: чёрное на белом. Во время забега — плавно в ночь: белое на чёрном.
const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const palette = (night: number) => {
    const bg = mix(255, 11, night);
    const ink = mix(11, 255, night);
    return {
        bg: `rgb(${bg},${bg},${bg})`,
        ink: `rgb(${ink},${ink},${ink})`,
        ghost: `rgba(${ink},${ink},${ink},${0.07 + night * 0.05})`,
    };
};

type Grid = readonly string[];

// Волк смотрит вправо. Два кадра бега + пригнувшийся.
const RUN_A: Grid = [
    '...........#..#...',
    '...........##.##..',
    '..........#######.',
    '..........##.#####',
    '#.........#######.',
    '##.......######...',
    '.###############..',
    '..#############...',
    '..############....',
    '..###......###....',
    '..##........##....',
    '.##..........##...',
];
const RUN_B: Grid = [...RUN_A.slice(0, 9), '...###....###.....', '....##....##......', '....##.....##.....'];
const DUCK: Grid = [
    '................#..#..',
    '#...............######',
    '.#.............###.###',
    '..##################..',
    '..#################...',
    '..###.........###.....',
    '..##...........##.....',
];
// Кегля жонглёра
const PIN: Grid = ['.##.', '.##.', '####', '.##.', '.##.', '####', '####', '####', '####', '.##.'];
// Ядро из цирковой пушки — с бликом
const BALL: Grid = ['..####..', '.######.', '##.#####', '#.######', '########', '########', '.######.', '..####..'];

const gridW = (g: Grid) => g[0].length * S;
const gridH = (g: Grid) => g.length * S;

const drawGrid = (ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    const ox = Math.round(x);
    const oy = Math.round(y);
    for (let r = 0; r < g.length; r++) {
        const row = g[r];
        for (let c = 0; c < row.length; c++) if (row[c] === '#') ctx.fillRect(ox + c * S, oy + r * S, S, S);
    }
};

type Kind = 'pedestal' | 'pins' | 'ball';
interface Obstacle {
    kind: Kind;
    x: number;
    y: number;
    w: number;
    h: number;
    /** для тумбы — ширина в клетках, для кеглей — сколько штук */
    n: number;
}

export type Phase = 'intro' | 'run' | 'over';

export interface GameCallbacks {
    onScore: (meters: number) => void;
    onOver: (meters: number) => void;
    onQuip: (index: number) => void;
    /** смена дня и ночи — чтобы рамка и подписи попапа перекрасились вместе с полем */
    onNight: (night: boolean) => void;
}

/** Каждые столько метров день сменяется ночью и обратно */
const NIGHT_EVERY = 1000;

/** Реплики раз в столько метров */
const QUIP_EVERY = 1000;

export const createGame = (
    canvas: HTMLCanvasElement,
    cb: GameCallbacks,
    W = 720,
    /** пузырь с репликой — двигаем вслед за волком */
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

    // волк
    const wolfX = 60;
    let wolfY = 0; // высота над землёй (вверх — плюс)
    let vy = 0;
    let ducking = false;
    let jumpHeld = false;
    let animT = 0;

    // мир
    // скорости в долях ширины поля: на 720 это 380 → 900 px/s
    const SPEED0 = W * 0.53;
    const SPEED_MAX = W * 1.25;
    const ACCEL = W * 0.0125;
    let speed = SPEED0;
    let distance = 0;
    let nextSpawn = 300;
    let obstacles: Obstacle[] = [];
    let tents = [80, 330, 560, 820].map((x, i) => ({ x, h: 60 + ((i * 37) % 40) }));
    let dashes = Array.from({ length: Math.ceil(W / 30) }, (_, i) => ({ x: i * 34 + ((i * 13) % 20), y: GROUND + 6 + ((i * 7) % 18) }));
    let lastQuip = 0;
    let lastScore = -1;
    let night = 0;
    let nightOn = false;
    let colors = palette(0);

    const reset = () => {
        wolfY = 0;
        vy = 0;
        ducking = false;
        speed = SPEED0;
        distance = 0;
        nextSpawn = 300;
        obstacles = [];
        lastQuip = 0;
        lastScore = -1;
        if (nightOn) {
            nightOn = false;
            cb.onNight(false);
        }
    };

    const meters = () => Math.floor(distance / 12);

    const spawn = () => {
        const roll = Math.random();
        let o: Obstacle;
        if (speed > SPEED0 * 1.25 && roll < 0.28) {
            // ядро летит на уровне головы: пригнись или перепрыгни
            o = { kind: 'ball', x: W + 10, y: GROUND - 26 - gridH(BALL), w: gridW(BALL), h: gridH(BALL), n: 1 };
        } else if (roll < 0.6) {
            const cells = Math.random() < 0.3 && speed > SPEED0 * 1.2 ? 16 : 8 + Math.floor(Math.random() * 3) * 2;
            const hCells = 8 + Math.floor(Math.random() * 4);
            o = { kind: 'pedestal', x: W + 10, y: GROUND - hCells * S, w: cells * S, h: hCells * S, n: cells };
        } else {
            const n = 1 + Math.floor(Math.random() * (speed > SPEED0 * 1.4 ? 3 : 2));
            o = { kind: 'pins', x: W + 10, y: GROUND - gridH(PIN), w: n * gridW(PIN) + (n - 1) * 2 * S, h: gridH(PIN), n };
        }
        obstacles.push(o);
        // расстояние до следующего — чем быстрее бег, тем шире окна, чтобы было проходимо
        nextSpawn = speed * (0.75 + Math.random() * 0.75) + o.w;
    };

    const wolfBox = () => {
        const g = ducking && wolfY === 0 ? DUCK : RUN_A;
        const w = gridW(g);
        const h = gridH(g);
        // хитбокс чуть меньше спрайта — честнее ощущается
        return { x: wolfX + 6, y: GROUND - wolfY - h + 6, w: w - 12, h: h - 8 };
    };

    const hit = (o: Obstacle) => {
        const b = wolfBox();
        const pad = 3;
        return b.x < o.x + o.w - pad && b.x + b.w > o.x + pad && b.y < o.y + o.h - pad && b.y + b.h > o.y + pad;
    };

    const update = (dt: number) => {
        // день → ночь → день каждые NIGHT_EVERY метров, переход плавный, около секунды
        const target = nightOn ? 1 : 0;
        night = target > night ? Math.min(target, night + dt) : Math.max(target, night - dt);
        animT += dt * (phase === 'run' ? speed / SPEED0 : 0.4);
        if (phase !== 'run') return;

        speed = Math.min(SPEED_MAX, speed + ACCEL * dt);
        const dx = speed * dt;
        distance += dx;

        // прыжок: отпустил кнопку на взлёте — короткий прыжок
        if (wolfY > 0 || vy > 0) {
            const g = ducking ? 5200 : 2400;
            if (!jumpHeld && vy > 260) vy = 260;
            vy -= g * dt;
            wolfY += vy * dt;
            if (wolfY <= 0) {
                wolfY = 0;
                vy = 0;
            }
        }

        for (const o of obstacles) o.x -= o.kind === 'ball' ? dx * 1.25 : dx;
        obstacles = obstacles.filter((o) => o.x + o.w > -20);
        nextSpawn -= dx;
        if (nextSpawn <= 0) spawn();

        for (const t of tents) {
            t.x -= dx * 0.18;
            if (t.x < -140) t.x += W + 280;
        }
        for (const d of dashes) {
            d.x -= dx;
            if (d.x < -10) d.x += W + 20;
        }

        const m = meters();
        const shouldNight = Math.floor(m / NIGHT_EVERY) % 2 === 1;
        if (shouldNight !== nightOn) {
            nightOn = shouldNight;
            cb.onNight(nightOn);
        }
        if (m !== lastScore) {
            lastScore = m;
            cb.onScore(m);
        }
        if (m >= lastQuip + QUIP_EVERY) {
            lastQuip = m;
            cb.onQuip(m / QUIP_EVERY);
        }

        if (obstacles.some(hit)) {
            phase = 'over';
            cb.onOver(m);
        }
    };

    const drawTent = (x: number, h: number) => {
        const base = GROUND;
        ctx.fillStyle = colors.ghost;
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.lineTo(x + 50, base - h);
        ctx.lineTo(x + 100, base);
        ctx.closePath();
        ctx.fill();
        // флажок на макушке шатра
        ctx.fillRect(Math.round(x + 49), Math.round(base - h - 14), 2, 14);
        ctx.fillRect(Math.round(x + 51), Math.round(base - h - 14), 9, 5);
    };

    const drawPedestal = (o: Obstacle) => {
        ctx.fillStyle = colors.ink;
        const x = Math.round(o.x);
        // крышка шире тумбы, бока — полосатые, как в цирке
        ctx.fillRect(x - S, o.y, o.w + 2 * S, 2 * S);
        for (let c = 0; c < o.n; c++) {
            if (c % 2 === 0) ctx.fillRect(x + c * S, o.y + 2 * S, S, o.h - 4 * S);
        }
        ctx.fillRect(x, o.y + 2 * S, S, o.h - 2 * S);
        ctx.fillRect(x + o.w - S, o.y + 2 * S, S, o.h - 2 * S);
        ctx.fillRect(x - S, o.y + o.h - 2 * S, o.w + 2 * S, 2 * S);
    };

    const draw = () => {
        colors = palette(night);
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, W, H);

        for (const t of tents) drawTent(t.x, t.h);

        // земля
        ctx.fillStyle = colors.ink;
        ctx.fillRect(0, GROUND, W, 2);
        for (const d of dashes) ctx.fillRect(Math.round(d.x), d.y, d.y % 3 === 0 ? 6 : 3, 2);

        for (const o of obstacles) {
            if (o.kind === 'pedestal') drawPedestal(o);
            else if (o.kind === 'ball') drawGrid(ctx, BALL, o.x, o.y, colors.ink);
            else for (let i = 0; i < o.n; i++) drawGrid(ctx, PIN, o.x + i * (gridW(PIN) + 2 * S), o.y, colors.ink);
        }

        const g = ducking && wolfY === 0 ? DUCK : wolfY > 0 ? RUN_B : Math.floor(animT * 10) % 2 ? RUN_B : RUN_A;
        drawGrid(ctx, g, wolfX, GROUND - wolfY - gridH(g), colors.ink);

        // пузырь реплики висит над мордой и прыгает вместе с волком
        const el = follow();
        if (el) {
            el.style.left = `${((wolfX + gridW(g) - 12) / W) * 100}%`;
            // на пике прыжка не даём пузырю вылезти за поле
            el.style.bottom = `${Math.min(78, ((H - (GROUND - wolfY - gridH(g)) + 10) / H) * 100)}%`;
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

    return {
        get phase() {
            return phase;
        },
        start() {
            reset();
            phase = 'run';
            cb.onScore(0);
        },
        jump(down: boolean) {
            jumpHeld = down;
            if (down && phase === 'run' && wolfY === 0) {
                vy = 760;
                wolfY = 0.01;
            }
        },
        duck(on: boolean) {
            ducking = on;
        },
        /** Вкладка ушла в фон — не прыгаем на огромный dt при возврате */
        resync() {
            last = performance.now();
        },
        destroy() {
            cancelAnimationFrame(raf);
        },
    };
};

export type Game = ReturnType<typeof createGame>;
