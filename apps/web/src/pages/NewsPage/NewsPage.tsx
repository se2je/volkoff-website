import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { NewsDto } from '@volkoff/shared';
import { useNews } from '@/api/queries';
import { useFmt } from '@/lib/format';
import NotFoundPage from '../NotFoundPage';
import styles from './NewsPage.module.scss';

const fullDate = (iso: string, locale: string) =>
    new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
        new Date(iso),
    );

/** Кнопка новости: внутренняя ссылка — через роутер, внешняя — в новой вкладке */
const NewsLink: React.FC<{ n: NewsDto }> = ({ n }) => {
    const { l, locale } = useFmt();
    if (!n.linkUrl) return null;
    const label = l(n.linkLabel) || (locale === 'ru' ? 'подробнее' : 'more');
    return n.linkUrl.startsWith('/') ? (
        <Link to={n.linkUrl} className="btn btn--ghost btn--sm">
            {label} →
        </Link>
    ) : (
        <a href={n.linkUrl} className="btn btn--ghost btn--sm" target="_blank" rel="noopener noreferrer">
            {label} ↗
        </a>
    );
};

/** /news — все новости лентой, /news/:id — одна новость целиком */
const NewsPage: React.FC = () => {
    const { id } = useParams();
    const { t } = useTranslation();
    const { l, locale } = useFmt();
    const { data: news, isLoading } = useNews();

    if (isLoading) return <div className="spinner">{t('common.loading')}</div>;

    if (id) {
        const i = news?.findIndex((n) => n.id === id) ?? -1;
        const n = news?.[i];
        if (!n) return <NotFoundPage text={t('news.notFound')} />;
        return (
            <div className={`container ${styles.page}`}>
                <Link to="/news" className={styles.back}>
                    ← {t('news.all')}
                </Link>
                <article className={styles.single}>
                    <div className={styles.meta}>
                        <span>№{String(news!.length - i).padStart(2, '0')}</span>
                        <span>{fullDate(n.createdAt, locale)}</span>
                    </div>
                    <h1 className={styles.singleTitle}>{l(n.title)}</h1>
                    {n.imageUrl && <img src={n.imageUrl} alt="" className={styles.singleImg} />}
                    {l(n.text) && <p className={styles.text}>{l(n.text)}</p>}
                    <NewsLink n={n} />
                </article>
            </div>
        );
    }

    return (
        <div className={`container ${styles.page}`}>
            <h1 className={styles.heading}>
                {t('news.title')}
                <sup>{news?.length ?? ''}</sup>
            </h1>
            {!news?.length ? (
                <p className="mono muted">{t('news.empty')}</p>
            ) : (
                <ol className={styles.list}>
                    {news.map((n, i) => (
                        <li key={n.id} className={styles.row}>
                            <div className={styles.meta}>
                                <span>№{String(news.length - i).padStart(2, '0')}</span>
                                <span>{fullDate(n.createdAt, locale)}</span>
                            </div>
                            <div className={styles.body}>
                                <Link to={`/news/${n.id}`} className={styles.title}>
                                    {l(n.title)}
                                </Link>
                                {l(n.text) && <p className={styles.excerpt}>{l(n.text)}</p>}
                            </div>
                            {n.imageUrl && (
                                <Link to={`/news/${n.id}`} className={styles.thumb} tabIndex={-1} aria-hidden="true">
                                    <img src={n.imageUrl} alt="" loading="lazy" />
                                </Link>
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
};

export default NewsPage;
