import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Send, X } from 'lucide-react';
import { CONTACTS } from '@/config/site';
import { useProduct } from '@/api/queries';
import SizePicker from '@/components/ProductCard/SizePicker';
import PriceTag from '@/components/ProductCard/PriceTag';
import { useFmt } from '@/lib/format';
import { useCart } from '@/store/cart';
import { toast } from '@/store/toast';
import NotFoundPage from '../NotFoundPage';
import styles from './ProductPage.module.scss';

const ProductPage: React.FC = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    // «Назад» через историю — так возвращаются фильтры и позиция скролла каталога
    const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/catalog'));
    const { t } = useTranslation();
    const { l, price, currency } = useFmt();
    const { data: product, isLoading, isError } = useProduct(slug);
    const add = useCart((s) => s.add);
    const setOpen = useCart((s) => s.setOpen);
    const [active, setActive] = useState(0);
    const [size, setSize] = useState<string | null>(null);
    const [zoom, setZoom] = useState(false);

    useEffect(() => {
        setActive(0);
        setSize(null);
    }, [slug]);

    useEffect(() => {
        if (!zoom) return;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(false);
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [zoom]);

    useEffect(() => {
        if (product) document.title = `${l(product.name)} — VOLKOFF`;
        return () => {
            document.title = 'VOLKOFF';
        };
    }, [product, l]);

    useEffect(() => {
        if (!product) return;
        // Если размер один — выбираем его сразу
        const available = product.variants.filter((v) => v.stock > 0);
        if (available.length === 1) setSize(available[0].size);
    }, [product]);

    if (isLoading) return <div className="spinner">{t('common.loading')}</div>;
    if (isError || !product) return <NotFoundPage text={t('product.notFound')} />;

    const images = product.images;
    const variant = product.variants.find((v) => v.size === size);
    const soldOut = !product.inStock || product.status !== 'ACTIVE';

    // Ссылка в Telegram с предзаполненным сообщением: название, артикул, размер (если выбран) и ссылка на вещь
    const telegramText = [
        t('product.telegramMessage', { name: l(product.name) }),
        `${product.code}${size ? ` · ${t('product.size')} ${size}` : ''}`,
        `${window.location.origin}/product/${product.slug}`,
    ].join('\n');
    const telegramLink = `https://t.me/${CONTACTS.telegram}?text=${encodeURIComponent(telegramText)}`;

    const addToCart = () => {
        if (!size) return;
        add(product, size);
        toast(`${l(product.name)} [${size}] — ${t('product.added')}`, 'acid');
        setOpen(true);
    };

    return (
        <div className={`container ${styles.page}`}>
            <button onClick={goBack} className={styles.back}>
                {t('product.back')}
            </button>

            <div className={styles.layout}>
                <div className={styles.gallery}>
                    <button className={styles.main} onClick={() => images.length && setZoom(true)} aria-label="zoom">
                        <AnimatePresence mode="wait">
                            {images[active] && (
                                <motion.img
                                    key={images[active].url}
                                    src={images[active].url}
                                    alt={l(product.name)}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                />
                            )}
                        </AnimatePresence>
                        {soldOut && <span className={styles.stamp}>{t('product.soldOut')}</span>}
                    </button>
                    {images.length > 1 && (
                        <div className={styles.thumbs}>
                            {images.map((img, i) => (
                                <button
                                    key={img.id}
                                    className={`${styles.thumb} ${i === active ? styles.thumbOn : ''}`}
                                    onClick={() => setActive(i)}
                                >
                                    <img src={img.url} alt="" />
                                    <span>{i === 0 ? t('product.front') : i === 1 ? t('product.reverse') : String(i + 1).padStart(2, '0')}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={styles.info}>
                    <div className={styles.top}>
                        <span className={styles.code}>{product.code}</span>
                        <span className="muted">{l(product.category?.name)}</span>
                    </div>
                    <h1 className={styles.name}>{l(product.name)}</h1>
                    <div>
                        <PriceTag size="lg">{price(product)}</PriceTag>
                    </div>
                    {currency === 'RUB' ? null : <div className="muted mono" style={{ fontSize: 12 }}>≈ {price(product, 'RUB')}</div>}

                    {l(product.description) && <p className={styles.desc}>{l(product.description)}</p>}

                    {product.tags.length > 0 && (
                        <div className={styles.tags}>
                            {product.tags.map((tag) => (
                                <Link key={tag} to={`/catalog?q=${encodeURIComponent(tag)}`}>
                                    {tag}
                                </Link>
                            ))}
                        </div>
                    )}

                    <div className={styles.sizes}>
                        <span className="muted mono">{t('product.size')}</span>
                        <SizePicker variants={product.variants} value={size} onChange={setSize} />
                    </div>
                    {variant && variant.stock > 0 && variant.stock <= 3 && (
                        <div className={styles.left}>⚠ {t('product.left', { count: variant.stock })}</div>
                    )}

                    <button className="btn btn--acid btn--block" disabled={soldOut || !size} onClick={addToCart}>
                        {soldOut ? t('product.soldOut') : size ? `${t('product.addToCart')} →` : t('product.pickSize')}
                    </button>

                    <a
                        className={`btn btn--ghost btn--block ${styles.tg}`}
                        href={telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Send size={15} strokeWidth={1.5} /> {t('product.telegram')}
                    </a>

                    <p className={styles.handmade}>✶ {t('product.handmade')}</p>

                    <details className={styles.details}>
                        <summary>{t('product.delivery')}</summary>
                        <p>{t('product.deliveryText')}</p>
                    </details>
                    <details className={styles.details}>
                        <summary>{t('product.returns')}</summary>
                        <p>
                            {t('product.returnsText')} <Link to="/legal/offer">→ {t('footer.offer')}</Link>
                        </p>
                    </details>
                </div>
            </div>

            <AnimatePresence>
                {zoom && (
                    <motion.div
                        className={styles.zoom}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setZoom(false)}
                    >
                        <button className={styles.zoomClose} aria-label="close">
                            <X size={28} />
                        </button>
                        <img src={images[active]?.url} alt={l(product.name)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProductPage;
