import React from 'react';
import { Link } from 'react-router-dom';
import type { Hero as HeroSettings } from '@volkoff/shared';
import { useSiteSettings } from '@/api/queries';
import { useFmt } from '@/lib/format';
import styles from './Hero.module.scss';

/** Большая обложка над каталогом. Показывается, если включена в админке и есть картинка. */
export const HeroView: React.FC<{ hero: HeroSettings }> = ({ hero }) => {
    const { l } = useFmt();
    if (!hero.imageUrl) return null;
    const title = l(hero.title);
    const subtitle = l(hero.subtitle);
    const label = l(hero.linkLabel) || '→';
    const link = hero.link || null;

    const cta =
        link &&
        (link.startsWith('/') ? (
            <Link to={link} className={styles.cta}>
                {label}
            </Link>
        ) : (
            <a href={link} className={styles.cta} target="_blank" rel="noopener noreferrer">
                {label} ↗
            </a>
        ));

    return (
        <section className={styles.hero}>
            <img src={hero.imageUrl} alt={title} className={`${styles.img} ${hero.grayscale ? styles.gray : ''}`} />
            {(title || subtitle || cta) && (
                <div className={styles.caption}>
                    {title && <h2 className={styles.title}>{title}</h2>}
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                    {cta}
                </div>
            )}
        </section>
    );
};

const Hero: React.FC = () => {
    const { hero } = useSiteSettings();
    if (!hero.enabled) return null;
    return <HeroView hero={hero} />;
};

export default Hero;
