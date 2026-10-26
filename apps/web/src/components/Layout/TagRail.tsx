import React from 'react';
import { Link } from 'react-router-dom';
import { useFacets, useSiteSettings } from '@/api/queries';
import { useFmt } from '@/lib/format';
import styles from './Layout.module.scss';

interface RailItem {
    text: string;
    link?: string | null;
}

/** Пункты ленты: фразы из админки вперемешку с тегами товаров (если включено) */
const useRailItems = () => {
    const { tagRail } = useSiteSettings();
    const { data: facets } = useFacets();
    const { l } = useFmt();

    const phrases: RailItem[] = tagRail.items.map((i) => ({ text: l(i.text), link: i.link || null }));
    const tags: RailItem[] = tagRail.showProductTags
        ? (facets?.tags ?? []).map((tag) => ({ text: `#${tag}`, link: `/catalog?q=${encodeURIComponent(tag)}` }))
        : [];

    const items: RailItem[] = [];
    const max = Math.max(phrases.length, tags.length);
    for (let i = 0; i < max; i++) {
        if (tags[i]) items.push(tags[i]);
        if (phrases[i]) items.push(phrases[i]);
    }
    return { items, duration: `${tagRail.durationSec}s` };
};

const RailEntry: React.FC<{ item: RailItem; className: string }> = ({ item, className }) => {
    if (!item.link) return <span className={className}>{item.text}</span>;
    if (item.link.startsWith('/'))
        return (
            <Link to={item.link} className={className}>
                {item.text}
            </Link>
        );
    return (
        <a href={item.link} className={className} target="_blank" rel="noopener noreferrer">
            {item.text}
        </a>
    );
};

/** Компьютер: вертикальная чёрная полоса справа, теги бегут сверху вниз */
const TagRail: React.FC = () => {
    const { items, duration } = useRailItems();
    if (!items.length) return null;
    const row = items.map((item, i) => (
        <React.Fragment key={i}>
            <RailEntry item={item} className={styles.railItem} />
            <span className={styles.railDot} />
        </React.Fragment>
    ));
    return (
        <aside className={styles.rail} aria-hidden="true">
            <div className={styles.railTrack} style={{ animationDuration: duration }}>
                <div className={styles.railRow}>{row}</div>
                <div className={styles.railRow}>{row}</div>
            </div>
        </aside>
    );
};

/** Телефон: та же лента горизонтальной полосой под шапкой */
export const TagStrip: React.FC = () => {
    const { items, duration } = useRailItems();
    if (!items.length) return null;
    const row = items.map((item, i) => (
        <React.Fragment key={i}>
            <RailEntry item={item} className={styles.stripItem} />
            <span className={styles.stripDot} />
        </React.Fragment>
    ));
    return (
        <div className={styles.strip} aria-hidden="true">
            <div className={styles.stripTrack} style={{ animationDuration: duration }}>
                <div className={styles.stripRow}>{row}</div>
                <div className={styles.stripRow}>{row}</div>
            </div>
        </div>
    );
};

export default TagRail;
