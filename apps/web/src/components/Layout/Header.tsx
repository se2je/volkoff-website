import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import { getCartMood } from '@volkoff/shared';
import { cartCount, cartTotal, useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { usePrefs } from '@/store/prefs';
import Avatar from '../Avatar';
import styles from './Layout.module.scss';

const Header: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { pathname } = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const user = useAuth((s) => s.user);
    const { currency, setCurrency } = usePrefs();
    const lines = useCart((s) => s.lines);
    const bump = useCart((s) => s.bump);
    const setOpen = useCart((s) => s.setOpen);

    const count = cartCount(lines);
    const mood = getCartMood(cartTotal(lines, currency), currency);
    const [shake, setShake] = useState(false);

    useEffect(() => setMenuOpen(false), [pathname]);

    useEffect(() => {
        if (!bump) return;
        setShake(true);
        const id = setTimeout(() => setShake(false), 600);
        return () => clearTimeout(id);
    }, [bump]);

    const lang = i18n.language.startsWith('en') ? 'en' : 'ru';

    return (
        <header className={styles.header}>
            <div className={`container ${styles.headerInner}`}>
                <Link to="/" className={styles.logo} aria-label="VOLKOFF">
                    VOLKOFF
                </Link>

                <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
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
                    <div className={styles.switchers}>
                        <button
                            className={lang === 'ru' ? styles.on : ''}
                            onClick={() => i18n.changeLanguage('ru')}
                        >
                            ru
                        </button>
                        <span>/</span>
                        <button
                            className={lang === 'en' ? styles.on : ''}
                            onClick={() => i18n.changeLanguage('en')}
                        >
                            en
                        </button>
                        <span className={styles.sep} />
                        <button className={currency === 'RUB' ? styles.on : ''} onClick={() => setCurrency('RUB')}>
                            ₽
                        </button>
                        <span>/</span>
                        <button className={currency === 'USD' ? styles.on : ''} onClick={() => setCurrency('USD')}>
                            $
                        </button>
                    </div>
                </nav>

                <div className={styles.actions}>
                    {user ? (
                        <Link to="/account" className={styles.account} title={user.nickname}>
                            <Avatar seed={user.avatarSeed} size={28} />
                            <span className={styles.nick}>{user.nickname}</span>
                        </Link>
                    ) : (
                        <Link to="/login" className={styles.account}>
                            {t('nav.login')}
                        </Link>
                    )}
                    <button className={`${styles.cartBtn} ${shake ? styles.shake : ''}`} onClick={() => setOpen(true)}>
                        {t('nav.cart')}
                        <span className={`${styles.cartCount} ${count ? styles.cartCountOn : ''}`}>({count})</span>
                        <span key={mood.emoji} className={styles.cartEmoji} title={t(`cart.mood.${mood.key}`)}>
                            {mood.emoji}
                        </span>
                    </button>
                    <button className={styles.burger} onClick={() => setMenuOpen((v) => !v)} aria-label={t('nav.menu')}>
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
