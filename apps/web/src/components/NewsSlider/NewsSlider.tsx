import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useNews } from '@/api/queries';
import { useFmt } from '@/lib/format';
import styles from './NewsSlider.module.scss';

const AUTOPLAY_MS = 7000;

/**
 * Новости над каталогом — тонкая полоса между линиями:
 * слева мета (№ и дата), по центру заголовок и текст, справа ч/б фото.
 * Несколько новостей листаются стрелками, свайпом и сами по себе.
 */
const NewsSlider: React.FC = () => {
    const { data: news } = useNews();
    const { l, locale } = useFmt();
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

    const date = (iso: string) =>
        new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
            new Date(iso),
        );

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
                    const label = l(n.linkLabel) || (locale === 'ru' ? 'подробнее' : 'more');
                    const internal = n.linkUrl?.startsWith('/');
                    const tab = i === index ? 0 : -1;
                    return (
                        <article key={n.id} className={styles.slide} aria-hidden={i !== index}>
                            <div className={styles.meta}>
                                <span>№{String(i + 1).padStart(2, '0')}</span>
                                <span>{date(n.createdAt)}</span>
                            </div>
                            <div className={styles.body}>
                                <h2 className={styles.title}>{l(n.title)}</h2>
                                {l(n.text) && <p className={styles.text}>{l(n.text)}</p>}
                                {n.linkUrl &&
                                    (internal ? (
                                        <Link to={n.linkUrl} className={styles.link} tabIndex={tab}>
                                            {label} →
                                        </Link>
                                    ) : (
                                        <a href={n.linkUrl} className={styles.link} target="_blank" rel="noopener noreferrer" tabIndex={tab}>
                                            {label} ↗
                                        </a>
                                    ))}
                            </div>
                            {n.imageUrl && (
                                <div className={styles.media}>
                                    <img src={n.imageUrl} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>

            {count > 1 && (
                <div className={styles.controls}>
                    <button onClick={() => go(-1)} aria-label="prev">
                        <ArrowLeft size={14} strokeWidth={1.5} />
                    </button>
                    <span className={styles.counter}>
                        {String(index + 1).padStart(2, '0')}/{String(count).padStart(2, '0')}
                    </span>
                    <button onClick={() => go(1)} aria-label="next">
                        <ArrowRight size={14} strokeWidth={1.5} />
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
