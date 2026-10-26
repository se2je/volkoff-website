import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, ShoppingCart, User, X } from 'lucide-react';
import { cartCount, cartTotal, useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { usePrefs } from '@/store/prefs';
import { useCartMood } from '@/lib/format';
import Avatar from '../Avatar';
import MoodFace from '../MoodFace';
import styles from './Layout.module.scss';

/** Язык и валюта — одна компактная кнопка с выпадашкой, чтобы не мусорить в шапке */
const PrefsSwitch: React.FC<{ inline?: boolean }> = ({ inline }) => {
    const { i18n } = useTranslation();
    const { currency, setCurrency } = usePrefs();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const lang = i18n.language.startsWith('en') ? 'en' : 'ru';

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const options = (
        <>
            <div className={styles.prefsRow}>
                {(['ru', 'en'] as const).map((l) => (
                    <button key={l} className={lang === l ? styles.on : ''} onClick={() => i18n.changeLanguage(l)}>
                        {l}
                    </button>
                ))}
            </div>
            <div className={styles.prefsRow}>
                {(['RUB', 'USD'] as const).map((c) => (
                    <button key={c} className={currency === c ? styles.on : ''} onClick={() => setCurrency(c)}>
                        {c === 'RUB' ? '₽ rub' : '$ usd'}
                    </button>
                ))}
            </div>
        </>
    );

    if (inline) return <div className={styles.prefsInline}>{options}</div>;

    return (
        <div className={styles.prefs} ref={ref}>
            <button className={styles.prefsBtn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
                {lang} · {currency === 'RUB' ? '₽' : '$'}
            </button>
            {open && <div className={styles.prefsPop}>{options}</div>}
        </div>
    );
};

const Header: React.FC = () => {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const user = useAuth((s) => s.user);
    const currency = usePrefs((s) => s.currency);
    const lines = useCart((s) => s.lines);
    const bump = useCart((s) => s.bump);
    const setCartOpen = useCart((s) => s.setOpen);

    const count = cartCount(lines);
    const mood = useCartMood(cartTotal(lines, currency), currency);
    const moodTitle = `${t('nav.cart')}: ${mood.label}`;
    const [shake, setShake] = useState(false);

    useEffect(() => setMenuOpen(false), [pathname]);

    // Пока открыто мобильное меню — страница под ним не скроллится
    useEffect(() => {
        if (!menuOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [menuOpen]);

    useEffect(() => {
        if (!bump) return;
        setShake(true);
        const id = setTimeout(() => setShake(false), 600);
        return () => clearTimeout(id);
    }, [bump]);

    const openCart = () => {
        setMenuOpen(false);
        setCartOpen(true);
    };

    const navLinks = (
        <>
            <NavLink to="/catalog" className={({ isActive }) => (isActive || pathname === '/' ? styles.navActive : '')}>
                {t('nav.catalog')}
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => (isActive ? styles.navActive : '')}>
                {t('nav.about')}
            </NavLink>
            {user?.role === 'ADMIN' && (
                <NavLink to="/admin" className={styles.navAdmin}>
                    {t('nav.admin')}
                </NavLink>
            )}
        </>
    );

    return (
        <>
            <header className={styles.header}>
                <div className={`container ${styles.headerInner}`}>
                    <Link to="/" className={styles.logo} aria-label="VOLKOFF">
                        VOLKOFF
                    </Link>

                    <nav className={styles.nav}>{navLinks}</nav>

                    <div className={styles.actions}>
                        <PrefsSwitch />
                        <Link
                            to={user ? '/account' : '/login'}
                            className={styles.iconBtn}
                            title={user ? user.nickname : t('nav.login')}
                            aria-label={user ? t('nav.account') : t('nav.login')}
                        >
                            {user ? <Avatar seed={user.avatarSeed} size={24} /> : <User size={20} strokeWidth={1.5} />}
                        </Link>
                        <button
                            className={`${styles.iconBtn} ${styles.cartBtn} ${shake ? styles.shake : ''}`}
                            onClick={openCart}
                            aria-label={`${t('nav.cart')} (${count})`}
                            title={moodTitle}
                        >
                            <ShoppingCart size={20} strokeWidth={1.5} />
                            {count > 0 && <span className={styles.cartCount}>{count}</span>}
                            <span key={mood.key} className={styles.mood}>
                                <MoodFace mood={mood.key} size={16} title={moodTitle} />
                            </span>
                        </button>
                    </div>

                    <button
                        className={styles.burger}
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-label={t('nav.menu')}
                        aria-expanded={menuOpen}
                    >
                        {count > 0 && !menuOpen && <span className={styles.burgerDot}>{count}</span>}
                        {menuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
                    </button>
                </div>
            </header>

            {/* Мобильное меню — отдельный оверлей на весь экран (не внутри header: у него backdrop-filter) */}
            <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`} aria-hidden={!menuOpen}>
                <nav className={styles.mobileNav}>{navLinks}</nav>
                <div className={styles.mobileActions}>
                    <Link to={user ? '/account' : '/login'} className={styles.mobileRow}>
                        {user ? (
                            <>
                                <Avatar seed={user.avatarSeed} size={28} /> <span>{user.nickname}</span>
                            </>
                        ) : (
                            <>
                                <User size={22} strokeWidth={1.5} /> <span>{t('nav.login')}</span>
                            </>
                        )}
                    </Link>
                    <button className={styles.mobileRow} onClick={openCart}>
                        <ShoppingCart size={22} strokeWidth={1.5} />
                        <span>
                            {t('nav.cart')} ({count})
                        </span>
                        <MoodFace mood={mood.key} size={20} title={moodTitle} />
                    </button>
                </div>
                <PrefsSwitch inline />
            </div>
        </>
    );
};

export default Header;
