import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { ProductDto } from '@volkoff/shared';
import { useFmt } from '@/lib/format';
import { useCart } from '@/store/cart';
import { toast } from '@/store/toast';
import SizePicker from './SizePicker';
import PriceTag from './PriceTag';
import styles from './ProductCard.module.scss';

interface Props {
    product: ProductDto;
    variant?: 'grid' | 'big';
    index?: number;
    /** В админке — превью без ссылок и корзины */
    preview?: boolean;
}

const ProductCard: React.FC<Props> = ({ product, variant = 'grid', index = 0, preview = false }) => {
    const { t } = useTranslation();
    const { l, price } = useFmt();
    const add = useCart((s) => s.add);
    const [back, setBack] = useState(false);
    const [size, setSize] = useState<string | null>(null);

    const images = product.images;
    const hasBack = images.length > 1;
    const soldOut = !product.inStock;
    const totalStock = product.variants.reduce((n, v) => n + v.stock, 0);
    const href = preview ? undefined : `/product/${product.slug}`;

    const addToCart = (s: string) => {
        if (preview) return;
        add(product, s);
        toast(`${l(product.name)} · ${s} — ${t('product.added')}`, 'acid');
    };

    const handleSize = (s: string) => {
        setSize(s);
        // В сетке клик по размеру сразу кидает в корзину — быстрее некуда
        if (variant === 'grid') addToCart(s);
    };

    const front = images[0];
    const shown = variant === 'big' && back && hasBack ? images[1] : front;

    const mediaInner = (
        <>
            {shown ? (
                <>
                    <img src={shown.url} alt={l(product.name)} loading={index < 8 ? 'eager' : 'lazy'} className={styles.img} />
                    {variant === 'grid' && hasBack && (
                        <img src={images[1].url} alt="" loading="lazy" className={`${styles.img} ${styles.imgBack}`} />
                    )}
                </>
            ) : (
                <div className={styles.noImg}>no photo</div>
            )}
            <span className={styles.label}>{product.code}</span>
            {soldOut && <span className={styles.stamp}>{t('product.soldOut')}</span>}
            {!soldOut && totalStock === 1 && <span className={styles.last}>{t('product.lastOne')}</span>}
        </>
    );
    const media = href ? (
        <Link to={href} className={styles.media}>
            {mediaInner}
        </Link>
    ) : (
        <div className={styles.media}>{mediaInner}</div>
    );

    return (
        <motion.article
            className={`${styles.card} ${styles[variant]} ${soldOut ? styles.isSoldOut : ''}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, delay: Math.min(index % 4, 3) * 0.06 }}
        >
            <div className={styles.mediaWrap}>
                {media}
                {variant === 'big' && hasBack && (
                    <div className={styles.flip} role="group" aria-label="photo side">
                        <button className={!back ? styles.flipOn : ''} onClick={() => setBack(false)}>
                            {t('product.front')}
                        </button>
                        <button className={back ? styles.flipOn : ''} onClick={() => setBack(true)}>
                            {t('product.reverse')}
                        </button>
                    </div>
                )}
            </div>

            <div className={styles.head}>
                <div className={styles.titles}>
                    {href ? (
                        <Link to={href} className={styles.name}>
                            {l(product.name)}
                        </Link>
                    ) : (
                        <span className={styles.name}>{l(product.name)}</span>
                    )}
                    <span className={styles.category}>{l(product.category?.name)}</span>
                </div>
                <PriceTag>{price(product)}</PriceTag>
            </div>

            {variant === 'big' && (
                <>
                    {l(product.description) && <p className={styles.desc}>{l(product.description)}</p>}
                    {product.tags.length > 0 && (
                        <div className={styles.tags}>
                            {product.tags.map((tag) =>
                                preview ? (
                                    <span key={tag}>{tag}</span>
                                ) : (
                                    <Link key={tag} to={`/catalog?q=${encodeURIComponent(tag)}`}>
                                        {tag}
                                    </Link>
                                ),
                            )}
                        </div>
                    )}
                </>
            )}

            {product.variants.length > 0 && (
                <div className={styles.sizes}>
                    <SizePicker variants={product.variants} value={size} onChange={handleSize} compact={variant === 'grid'} />
                </div>
            )}

            {variant === 'big' && !soldOut && (
                <button className="btn btn--block" disabled={!size} onClick={() => size && addToCart(size)}>
                    {size ? `${t('product.addToCart')} →` : t('product.pickSize')}
                </button>
            )}
        </motion.article>
    );
};

export default ProductCard;
