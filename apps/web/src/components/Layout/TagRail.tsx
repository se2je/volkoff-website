import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFacets } from '@/api/queries';
import styles from './Layout.module.scss';

/** Вертикальная чёрная полоса справа: теги товаров бегут сверху вниз. Клик — поиск по тегу. */
const TagRail: React.FC = () => {
    const { t } = useTranslation();
    const { data } = useFacets();
    const brand = t('ticker', { returnObjects: true }) as string[];
    const tags = data?.tags ?? [];

    // чередуем теги товаров и фразы бренда
    const items: { text: string; tag?: string }[] = [];
    const max = Math.max(brand.length, tags.length);
    for (let i = 0; i < max; i++) {
        if (tags[i]) items.push({ text: `#${tags[i]}`, tag: tags[i] });
        if (brand[i]) items.push({ text: brand[i] });
    }

    const row = items.map((item, i) => (
        <React.Fragment key={i}>
            {item.tag ? (
                <Link to={`/catalog?q=${encodeURIComponent(item.tag)}`} className={styles.railItem}>
                    {item.text}
                </Link>
            ) : (
                <span className={styles.railItem}>{item.text}</span>
            )}
            <span className={styles.railDot} />
        </React.Fragment>
    ));

    return (
        <aside className={styles.rail} aria-hidden="true">
            <div className={styles.railTrack}>
                <div className={styles.railRow}>{row}</div>
                <div className={styles.railRow}>{row}</div>
            </div>
        </aside>
    );
};

export default TagRail;
