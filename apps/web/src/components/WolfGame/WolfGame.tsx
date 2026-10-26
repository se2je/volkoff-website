import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { WolfGameMode } from '@/lib/wolfFun';
import { unlock } from '@/lib/achievements';
import { H, createGame, worldWidth, type Game } from './engine';
import { createFlyGame } from './fly';
import styles from './WolfGame.module.scss';

const bestKey = (mode: WolfGameMode) => `vk_wolf_${mode}_best`;

const TEXT = {
    ru: {
        intro: 'бля, они хотят поймать меня и заставить выступать в цирке. но волки в цирке не выступают.',
        start: 'пробел / тап — бежать',
        hint: '↑ пробел клик — прыжок · ↓ — пригнуться · × — выйти',
        hintTouch: 'тап по полю или ▲ — прыжок · держи ▼ — присесть · × — выйти',
        jump: 'прыжок',
        duck: 'присесть',
        best: 'рекорд',
        again: 'ещё раз — пробел / тап',
        // «пацанские» волчьи цитаты — мем, из которого и выросла завязка игры
        quips: [
            'волк слабее льва и тигра, но в цирке не выступает',
            'лучше быть последним волком, чем первым пуделем',
            'работа не волк. а я — волк. значит, я не работа',
            'тумба — не повод остановиться',
            'кто прыгает через обруч, тот уже не волк',
            'АУФ',
            'клоун здесь кто угодно, но не я',
            'один раз выступил в цирке — навсегда собака',
        ],
        over: [
            'аплодисменты. ты опозорился',
            'волк, который выступает в цирке, — это собака',
            'теперь ты пудель в балетной пачке',
            'дрессировщик: «хороший мальчик». ты опозорил стаю',
            'кегля оказалась сильнее волка. стая в шоке',
            'ауф отменяется. завтра номер с обручем',
        ],
    },
    en: {
        intro: "damn, they want to catch me and make me perform in the circus. but wolves don't do circus.",
        start: 'space / tap — run',
        hint: '↑ space click — jump · ↓ — duck · × — quit',
        hintTouch: 'tap the field or ▲ — jump · hold ▼ — duck · × — quit',
        jump: 'jump',
        duck: 'duck',
        best: 'best',
        again: 'again — space / tap',
        quips: [
            "a wolf is weaker than a lion or a tiger, but it doesn't do circus",
            'better the last wolf than the first poodle',
            'work is not a wolf. i am a wolf',
            'a pedestal is no reason to stop',
            'jump through a hoop once — no longer a wolf',
            'AWOO',
            'the clown here is anyone but me',
            'perform in a circus once — a dog forever',
        ],
        over: [
            'applause. you embarrassed yourself',
            'a wolf that performs in a circus is a dog',
            "you're a poodle in a tutu now",
            'trainer: "good boy". the pack is ashamed',
            'a juggling pin beat a wolf. the pack is shocked',
            'awoo is cancelled. hoop act tomorrow',
        ],
    },
};

// Тексты второй игры — волк на ранце, пока едет заказ
const FLY_TEXT = {
    ru: {
        title: 'VOLKOFF_FLY',
        unit: ' сосен',
        intro: 'посылку уже собирают. а я пока махну через лес на ранце — сосны, держитесь.',
        start: 'пробел / тап — газу',
        hint: '↑ пробел клик — газу · × — выйти',
        hintTouch: 'тап по полю или ▲ — газу · × — выйти',
        jump: 'газу',
        over: [
            'сосна победила. лес не прощает',
            'волк — не птица. запомни',
            'ранец заглох. зато посылка в пути',
            'врезался в сосну. стая делает вид, что не видела',
            'топливо кончилось раньше, чем совесть',
        ],
    },
    en: {
        title: 'VOLKOFF_FLY',
        unit: ' pines',
        intro: "your parcel is being packed. meanwhile i'll jet through the forest — pines, hold on.",
        start: 'space / tap — boost',
        hint: '↑ space click — boost · × — quit',
        hintTouch: 'tap the field or ▲ — boost · × — quit',
        jump: 'boost',
        over: [
            'the pine won. the forest does not forgive',
            'a wolf is not a bird. remember that',
            'the jetpack died. at least the parcel is on its way',
            'hit a pine. the pack pretends it saw nothing',
            'ran out of fuel before running out of shame',
        ],
    },
};

const readBest = (mode: WolfGameMode) => {
    try {
        return Number(localStorage.getItem(bestKey(mode))) || 0;
    } catch {
        return 0;
    }
};

/** Попап с игрой «волк сбегает из цирка» */
const WolfGame: React.FC<{ mode: WolfGameMode; onClose: () => void }> = ({ mode, onClose }) => {
    const { i18n } = useTranslation();
    const lang = i18n.language.startsWith('en') ? 'en' : 'ru';
    const tx = mode === 'fly' ? { ...TEXT[lang], ...FLY_TEXT[lang] } : { ...TEXT[lang], title: 'VOLKOFF_RUN', unit: 'м' };
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const quipRef = useRef<HTMLDivElement>(null);
    const game = useRef<Game | null>(null);
    const [phase, setPhase] = useState<'intro' | 'run' | 'over'>('intro');
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(() => readBest(mode));
    const [quip, setQuip] = useState<string | null>(null);
    const [night, setNight] = useState(false);
    const [overLine, setOverLine] = useState('');
    const overAt = useRef(0);
    const [width] = useState(() => worldWidth(Math.min(window.innerWidth - 32, 760)));

    useEffect(() => {
        const create = mode === 'fly' ? createFlyGame : createGame;
        const g = create(
            canvasRef.current!,
            {
                onScore: (n) => {
                    setScore(n);
                    if (mode === 'run' && n >= 1000) unlock('runner_1000');
                    if (mode === 'run' && n >= 3000) unlock('runner_3000');
                    if (mode === 'fly' && n >= 20) unlock('flyer_20');
                },
                onNight: setNight,
                onQuip: (i) => {
                    setQuip(tx.quips[(i - 1) % tx.quips.length]);
                    window.setTimeout(() => setQuip(null), 2600);
                },
                onOver: (m) => {
                    overAt.current = performance.now();
                    setOverLine(tx.over[Math.floor(Math.random() * tx.over.length)]);
                    setPhase('over');
                    setQuip(null);
                    setBest((b) => {
                        const nb = Math.max(b, m);
                        try {
                            localStorage.setItem(bestKey(mode), String(nb));
                        } catch {
                            /* приватный режим */
                        }
                        return nb;
                    });
                },
            },
            width,
            () => quipRef.current,
        );
        game.current = g;
        const onVis = () => !document.hidden && g.resync();
        document.addEventListener('visibilitychange', onVis);
        return () => {
            g.destroy();
            document.removeEventListener('visibilitychange', onVis);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Старт / рестарт; после проигрыша — небольшая пауза, чтобы не перезапустить случайно
    const action = () => {
        const g = game.current;
        if (!g) return;
        if (g.phase === 'run') return g.jump(true);
        if (g.phase === 'over' && performance.now() - overAt.current < 500) return;
        g.start();
        setPhase('run');
    };

    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const down = (e: KeyboardEvent) => {
            if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) {
                e.preventDefault();
                if (!e.repeat) action();
            } else if (['ArrowDown', 's', 'S'].includes(e.key)) {
                e.preventDefault();
                game.current?.duck(true);
            }
        };
        const up = (e: KeyboardEvent) => {
            if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) game.current?.jump(false);
            if (['ArrowDown', 's', 'S'].includes(e.key)) game.current?.duck(false);
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onClose]);

    // Тач: тап по полю — прыжок; на сенсорных экранах ещё кнопки «прыжок» и «присесть» (держать)
    const [touchUI] = useState(() => window.matchMedia('(pointer: coarse)').matches);
    // после тача браузер шлёт ещё и «мышиный» mousedown — его игнорируем, иначе двойной прыжок
    const lastTouch = useRef(0);
    const onTouchStart = () => {
        lastTouch.current = performance.now();
        action();
    };
    const onTouchEnd = () => {
        lastTouch.current = performance.now();
        game.current?.jump(false);
    };
    const duck = (on: boolean) => {
        lastTouch.current = performance.now();
        game.current?.duck(on);
    };

    const pad = (n: number) => String(n).padStart(5, '0');

    return (
        // закрывается только крестиком — клик мимо попапа не должен убивать забег
        <div className={styles.overlay}>
            <div className={`${styles.panel} ${night ? styles.night : ''}`} role="dialog" aria-label={tx.title}>
                <header className={styles.head}>
                    <span>
                        {tx.title}
                        <span className={styles.cursor}>_</span>
                    </span>
                    <span className={styles.scores}>
                        {best > 0 && (
                            <span className={styles.best}>
                                {tx.best} {pad(best)}
                            </span>
                        )}
                        <span>
                            {pad(score)}
                            {tx.unit}
                        </span>
                    </span>
                    <button className={styles.close} onClick={onClose} aria-label="close">
                        <X size={16} />
                    </button>
                </header>

                <div
                    className={styles.stage}
                    onContextMenu={(e) => e.preventDefault()}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        if (performance.now() - lastTouch.current > 800) action();
                    }}
                    onMouseUp={() => game.current?.jump(false)}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    <canvas ref={canvasRef} className={styles.canvas} style={{ aspectRatio: `${width} / ${H}` }} />
                    {phase === 'intro' && (
                        <div className={`${styles.bubble} ${styles.intro}`}>
                            <p>{tx.intro}</p>
                            <span className={styles.blink}>{tx.start}</span>
                        </div>
                    )}
                    {phase === 'run' && quip && (
                        <div ref={quipRef} className={`${styles.bubble} ${styles.quip}`}>
                            {quip}
                        </div>
                    )}
                    {phase === 'over' && (
                        <div className={styles.over}>
                            <strong>GAME OVER</strong>
                            <p>{overLine}</p>
                            <span className={styles.blink}>{tx.again}</span>
                        </div>
                    )}
                </div>

                {touchUI && (
                    <div className={`${styles.pad} ${mode === 'fly' ? styles.padSingle : ''}`} onContextMenu={(e) => e.preventDefault()}>
                        <button
                            className={styles.padBtn}
                            onTouchStart={onTouchStart}
                            onTouchEnd={onTouchEnd}
                            onTouchCancel={onTouchEnd}
                            aria-label={tx.jump}
                        >
                            ▲ {tx.jump}
                        </button>
                        {mode === 'run' && (
                            <button
                                className={styles.padBtn}
                                onTouchStart={() => duck(true)}
                                onTouchEnd={() => duck(false)}
                                onTouchCancel={() => duck(false)}
                                aria-label={tx.duck}
                            >
                                ▼ {tx.duck}
                            </button>
                        )}
                    </div>
                )}

                <footer className={styles.hint}>{touchUI ? tx.hintTouch : tx.hint}</footer>
            </div>
        </div>
    );
};

export default WolfGame;
