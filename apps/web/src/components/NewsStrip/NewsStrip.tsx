import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNews } from '@/api/queries';
import { useFmt } from '@/lib/format';
import styles from './NewsStrip.module.scss';

const ROTATE_MS = 5000;

export const shortDate = (iso: string, locale: string) =>
    new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', { day: '2-digit', month: '2-digit' }).format(new Date(iso));

/**
 * Новости над каталогом — одна тонкая строка: метка, дата, заголовок.
 * Заголовки сменяют друг друга; клик по новости — её страница, справа — все новости.
 */
const NewsStrip: React.FC = () => {
    const { t } = useTranslation();
    const { data: news } = useNews();
    const { l, locale } = useFmt();
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const count = news?.length ?? 0;

    useEffect(() => {
        if (count < 2 || paused) return;
        const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
        return () => window.clearInterval(id);
    }, [count, paused]);

    if (!news || count === 0) return null;
    const n = news[index % count];

    return (
        <section className={styles.strip} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <span className={styles.tag}>{t('news.label')}</span>
            {/* key — чтобы при смене новости строка заново «впечатывалась» */}
            <Link key={n.id} to={`/news/${n.id}`} className={styles.item}>
                <span className={styles.date}>{shortDate(n.createdAt, locale)}</span>
                <span className={styles.title}>{l(n.title)}</span>
                <span className={styles.more}>{t('news.look')} →</span>
            </Link>
            <Link to="/news" className={styles.all}>
                {t('news.all')}
                <sup>{count}</sup>
            </Link>
        </section>
    );
};

export default NewsStrip;
