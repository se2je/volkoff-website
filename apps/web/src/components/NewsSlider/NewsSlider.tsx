import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useNews } from '@/api/queries';
import { useFmt } from '@/lib/format';
import styles from './NewsSlider.module.scss';

const AUTOPLAY_MS = 7000;

/** Новости над каталогом: одна — просто блок, несколько — минималистичный свайпер */
const NewsSlider: React.FC = () => {
    const { data: news } = useNews();
    const { l } = useFmt();
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const touchX = useRef<number | null>(null);

    const count = news?.length ?? 0;
    const go = useCallback((dir: number) => setIndex((i) => (i + dir + count) % count), [count]);

    useEffect(() => {
        if (count < 2 || paused) return;
        const id = window.setInterval(() => go(1), AUTOPLAY_MS);
        return () => window.clearInterval(id);
    }, [count, paused, go]);

    useEffect(() => {
        if (index >= count) setIndex(0);
    }, [count, index]);

    if (!news || count === 0) return null;

    return (
        <section
            className={styles.slider}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={(e) => {
                touchX.current = e.touches[0].clientX;
                setPaused(true);
            }}
            onTouchEnd={(e) => {
                if (touchX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchX.current;
                if (Math.abs(dx) > 40 && count > 1) go(dx < 0 ? 1 : -1);
                touchX.current = null;
            }}
            aria-roledescription="carousel"
        >
            <div className={styles.track} style={{ transform: `translateX(-${index * 100}%)` }}>
                {news.map((n, i) => {
                    const label = l(n.linkLabel) || '→';
                    const internal = n.linkUrl?.startsWith('/');
                    return (
                        <article key={n.id} className={styles.slide} aria-hidden={i !== index}>
                            {n.imageUrl && (
                                <div className={styles.media}>
                                    <img src={n.imageUrl} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
                                </div>
                            )}
                            <div className={styles.body}>
                                <h2 className={styles.title}>{l(n.title)}</h2>
                                {l(n.text) && <p className={styles.text}>{l(n.text)}</p>}
                                {n.linkUrl &&
                                    (internal ? (
                                        <Link to={n.linkUrl} className={styles.link} tabIndex={i === index ? 0 : -1}>
                                            {label}
                                        </Link>
                                    ) : (
                                        <a
                                            href={n.linkUrl}
                                            className={styles.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            tabIndex={i === index ? 0 : -1}
                                        >
                                            {label} ↗
                                        </a>
                                    ))}
                            </div>
                        </article>
                    );
                })}
            </div>

            {count > 1 && (
                <div className={styles.controls}>
                    <button onClick={() => go(-1)} aria-label="prev">
                        <ArrowLeft size={16} strokeWidth={1.5} />
                    </button>
                    <span className={styles.counter}>
                        {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
                    </span>
                    <button onClick={() => go(1)} aria-label="next">
                        <ArrowRight size={16} strokeWidth={1.5} />
                    </button>
                </div>
            )}
            {count > 1 && (
                <div className={styles.progress}>
                    <span key={`${index}-${paused}`} className={paused ? styles.progressPaused : styles.progressRun} />
                </div>
            )}
        </section>
    );
};

export default NewsSlider;
