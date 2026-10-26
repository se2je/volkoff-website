import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, X } from 'lucide-react';
import { cartCount, cartTotal, lineTotal, useCart } from '@/store/cart';
import MoodFace from '../MoodFace';
import { useCartMood, useFmt } from '@/lib/format';
import styles from './CartDrawer.module.scss';

const CartDrawer: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { l, money, currency } = useFmt();
    const { lines, open, setOpen, setQuantity, remove } = useCart();

    const total = cartTotal(lines, currency);
    const mood = useCartMood(total, currency);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [open, setOpen]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        className={styles.backdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                    />
                    <motion.aside
                        className={styles.drawer}
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('cart.title')}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    >
                        <div className={styles.head}>
                            <span className={styles.title}>
                                {t('cart.title')} <sup>{cartCount(lines)}</sup>
                            </span>
                            <button onClick={() => setOpen(false)} aria-label={t('cart.close')}>
                                <X size={22} />
                            </button>
                        </div>

                        <div className={styles.mood}>
                            <motion.span
                                key={mood.key}
                                className={styles.moodEmoji}
                                initial={{ scale: 0.2, rotate: -40 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', damping: 8, stiffness: 300 }}
                            >
                                <MoodFace mood={mood.key} size={44} />
                            </motion.span>
                            <span className={styles.moodText}>
                                {t('cart.title')}: {mood.label}
                            </span>
                        </div>

                        {lines.length === 0 ? (
                            <div className={styles.empty}>
                                <p>{t('cart.empty')}</p>
                                <Link to="/catalog" className="btn btn--ghost" onClick={() => setOpen(false)}>
                                    {t('cart.toCatalog')}
                                </Link>
                            </div>
                        ) : (
                            <>
                                <ul className={styles.lines}>
                                    {lines.map((line) => (
                                        <li key={`${line.productId}-${line.size}`} className={styles.line}>
                                            <Link to={`/product/${line.slug}`} onClick={() => setOpen(false)} className={styles.thumb}>
                                                {line.image && <img src={line.image} alt="" />}
                                            </Link>
                                            <div className={styles.info}>
                                                <span className={styles.code}>{line.code}</span>
                                                <Link to={`/product/${line.slug}`} onClick={() => setOpen(false)} className={styles.name}>
                                                    {l(line.name)}
                                                </Link>
                                                <span className={styles.size}>
                                                    {t('product.size')}: {line.size}
                                                </span>
                                                <div className={styles.qty}>
                                                    <button
                                                        onClick={() => setQuantity(line.productId, line.size, line.quantity - 1)}
                                                        disabled={line.quantity <= 1}
                                                        aria-label="-"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span>{line.quantity}</span>
                                                    <button
                                                        onClick={() => setQuantity(line.productId, line.size, line.quantity + 1)}
                                                        disabled={line.quantity >= line.maxQuantity}
                                                        aria-label="+"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className={styles.right}>
                                                <span className="mono">{money(lineTotal(line, currency))}</span>
                                                <button className={styles.remove} onClick={() => remove(line.productId, line.size)}>
                                                    {t('cart.remove')}
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <div className={styles.foot}>
                                    <div className={styles.total}>
                                        <span>{t('cart.total')}</span>
                                        <span>{money(total)}</span>
                                    </div>
                                    <button
                                        className="btn btn--acid btn--block"
                                        onClick={() => {
                                            setOpen(false);
                                            navigate('/checkout');
                                        }}
                                    >
                                        {t('cart.checkout')} →
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartDrawer;
