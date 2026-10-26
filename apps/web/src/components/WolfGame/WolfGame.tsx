import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { H, createGame, worldWidth, type Game } from './engine';
import styles from './WolfGame.module.scss';

const BEST_KEY = 'vk_wolf_run_best';

const TEXT = {
    ru: {
        intro: 'бля, они хотят поймать меня и заставить выступать в цирке. но волки в цирке не выступают.',
        start: 'пробел / тап — бежать',
        hint: '↑ пробел тап — прыжок · ↓ свайп вниз — пригнуться · × — выйти',
        best: 'рекорд',
        again: 'ещё раз — пробел / тап',
        quips: ['свобода пахнет болотом', 'клоуны, отстаньте', 'ни одного трюка, ребята', 'обруч себе засуньте', 'я в коже, а не в трико', 'дрессировщик, ты устал'],
        over: ['поймали. завтра выступаешь с обручем.', 'дрессировщик доволен. ты — нет.', 'кегля победила волка. позор.', 'тебя записали в номер «пудель»', 'аплодисменты. тебе стыдно.'],
    },
    en: {
        intro: "damn, they want to catch me and make me perform in the circus. but wolves don't do circus.",
        start: 'space / tap — run',
        hint: '↑ space tap — jump · ↓ swipe down — duck · × — quit',
        best: 'best',
        again: 'again — space / tap',
        quips: ['freedom smells like swamp', 'clowns, back off', 'no tricks, guys', 'keep your hoop', "i wear leather, not tights", 'tired, trainer?'],
        over: ['caught. hoop act tomorrow.', 'the trainer is happy. you are not.', 'a juggling pin beat a wolf. shame.', "you're in the poodle act now", 'applause. you feel ashamed.'],
    },
};

const readBest = () => {
    try {
        return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
        return 0;
    }
};

/** Попап с игрой «волк сбегает из цирка» */
const WolfGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { i18n } = useTranslation();
    const tx = TEXT[i18n.language.startsWith('en') ? 'en' : 'ru'];
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const quipRef = useRef<HTMLDivElement>(null);
    const game = useRef<Game | null>(null);
    const [phase, setPhase] = useState<'intro' | 'run' | 'over'>('intro');
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(readBest);
    const [quip, setQuip] = useState<string | null>(null);
    const [night, setNight] = useState(false);
    const [overLine, setOverLine] = useState('');
    const overAt = useRef(0);
    const [width] = useState(() => worldWidth(Math.min(window.innerWidth - 32, 760)));

    useEffect(() => {
        const g = createGame(canvasRef.current!, {
            onScore: setScore,
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
                        localStorage.setItem(BEST_KEY, String(nb));
                    } catch {
                        /* приватный режим */
                    }
                    return nb;
                });
            },
        }, width, () => quipRef.current);
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

    // Тач: тап — прыжок, свайп вниз — пригнуться
    const touchY = useRef<number | null>(null);
    // после тача браузер шлёт ещё и «мышиный» mousedown — его игнорируем, иначе двойной прыжок
    const lastTouch = useRef(0);
    const onTouchStart = (e: React.TouchEvent) => {
        lastTouch.current = performance.now();
        touchY.current = e.touches[0].clientY;
        action();
    };
    const onTouchMove = (e: React.TouchEvent) => {
        if (touchY.current !== null && e.touches[0].clientY - touchY.current > 24) game.current?.duck(true);
    };
    const onTouchEnd = () => {
        touchY.current = null;
        lastTouch.current = performance.now();
        game.current?.jump(false);
        game.current?.duck(false);
    };

    const pad = (n: number) => String(n).padStart(5, '0');

    return (
        // закрывается только крестиком — клик мимо попапа не должен убивать забег
        <div className={styles.overlay}>
            <div className={`${styles.panel} ${night ? styles.night : ''}`} role="dialog" aria-label="VOLKOFF_RUN">
                <header className={styles.head}>
                    <span>
                        VOLKOFF_RUN<span className={styles.cursor}>_</span>
                    </span>
                    <span className={styles.scores}>
                        {best > 0 && (
                            <span className={styles.best}>
                                {tx.best} {pad(best)}
                            </span>
                        )}
                        <span>{pad(score)}м</span>
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
                    onTouchMove={onTouchMove}
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

                <footer className={styles.hint}>{tx.hint}</footer>
            </div>
        </div>
    );
};

export default WolfGame;
