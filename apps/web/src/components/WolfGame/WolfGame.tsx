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
            'тумбы не остановят',
            'АУФ',
            'клоуны, отстаньте',
            'через обруч не прыгаю',
            'свободу не продаю',
        ],
        over: [
            'поймали. теперь ты в цирке',
            'всё, выступаешь по пятницам',
            'волк в цирке. стая в шоке',
            'клоуны победили',
            'теперь ты пудель. смирись',
            'споткнулся о тумбу. бывает',
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
            'pedestals won’t stop me',
            'AWOO',
            'clowns, back off',
            'no hoops for me',
            'freedom is not for sale',
        ],
        over: [
            "caught. you're in the circus now",
            "that's it, shows every friday",
            'a wolf in the circus. the pack is shocked',
            'the clowns won',
            "you're a poodle now. deal with it",
            'tripped over a pedestal. happens',
        ],
    },
};

// Тексты второй игры — волк на ранце, пока едет заказ
const FLY_TEXT = {
    ru: {
        title: 'VOLKOFF_FLY',
        unit: ' сосен',
        intro: 'пока посылка едет, полетаю над лесом. сосны, расступитесь.',
        start: 'пробел / тап — газу',
        hint: '↑ пробел клик — газу · × — выйти',
        hintTouch: 'тап по полю или ▲ — газу · × — выйти',
        jump: 'газу',
        over: [
            'в сосну. классика',
            'волк — не птица',
            'лес победил',
            'ранец заглох. посылка всё равно едет',
            'сосна оказалась крепче',
        ],
    },
    en: {
        title: 'VOLKOFF_FLY',
        unit: ' pines',
        intro: 'while the parcel is on its way, i fly over the forest. pines, make way.',
        start: 'space / tap — boost',
        hint: '↑ space click — boost · × — quit',
        hintTouch: 'tap the field or ▲ — boost · × — quit',
        jump: 'boost',
        over: [
            'into a pine. classic',
            'a wolf is not a bird',
            'the forest won',
            'the jetpack died. the parcel is still coming',
            'the pine was tougher',
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
