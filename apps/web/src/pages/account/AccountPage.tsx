import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Dices } from 'lucide-react';
import { ACHIEVEMENTS, PASSWORD_MIN, type UserDto } from '@volkoff/shared';
import { api } from '@/api/client';
import { useAchievements, useMyOrders } from '@/api/queries';
import Avatar from '@/components/Avatar';
import { errorText, useFmt } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import styles from './Account.module.scss';

const AccountPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { money, date } = useFmt();
    const { user, setUser, logout } = useAuth();
    const { data: orders } = useMyOrders();
    const { data: achievements } = useAchievements();
    const [profile, setProfile] = useState({ fullName: '', phone: '' });
    const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
    const [spin, setSpin] = useState(0);

    useEffect(() => {
        if (user) setProfile({ fullName: user.fullName ?? '', phone: user.phone ?? '' });
    }, [user]);

    if (!user) return null;

    // «через 13 ч» до следующей перегенерации
    const waitLabel = (iso: string | null) => {
        if (!iso) return null;
        const h = Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 3_600_000));
        return t('account.rerollIn', { hours: h });
    };
    const avatarWait = waitLabel(user.avatarRerollAt);
    const nickWait = waitLabel(user.nicknameRerollAt);
    const got = new Set(achievements?.keys ?? []);
    const lang = i18n.language.startsWith('en') ? 'en' : 'ru';

    const reroll = async (what: 'avatar' | 'nickname') => {
        try {
            const u = await api<UserDto>(`/me/${what}/reroll`, { method: 'POST' });
            setUser(u);
            if (what === 'avatar') setSpin((s) => s + 1);
        } catch (err) {
            toast(errorText(t, err), 'error');
        }
    };

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const u = await api<UserDto>('/me', {
                method: 'PATCH',
                body: { fullName: profile.fullName || null, phone: profile.phone || null },
            });
            setUser(u);
            toast(t('account.saved'), 'acid');
        } catch (err) {
            toast(errorText(t, err), 'error');
        }
    };

    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api('/me/password', { body: pw });
            setPw({ currentPassword: '', newPassword: '' });
            toast(t('account.saved'), 'acid');
        } catch (err) {
            toast(errorText(t, err), 'error');
        }
    };

    const doLogout = async (all = false) => {
        if (all) await api('/auth/logout-all', { method: 'POST' }).catch(() => undefined);
        await logout();
        navigate('/');
    };

    return (
        <div className={`container ${styles.page}`}>
            <section className={styles.hero}>
                <motion.div key={spin} initial={{ rotate: -180, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
                    <Avatar seed={user.avatarSeed} size={140} />
                </motion.div>
                <div className={styles.who}>
                    <h1 className={styles.nick}>{user.nickname}</h1>
                    <div className="mono muted">{user.email}</div>
                    <div className={`mono ${user.emailVerified ? styles.ok : styles.warn}`}>
                        {user.emailVerified ? `✓ ${t('account.emailVerified')}` : `✗ ${t('account.emailNotVerified')}`}
                    </div>
                    <div className="mono muted" style={{ fontSize: 12 }}>
                        {t('account.since', { date: new Date(user.createdAt).toLocaleDateString() })}
                    </div>
                    <div className={styles.rerolls}>
                        <button className="btn btn--ghost btn--sm" disabled={!!avatarWait} onClick={() => reroll('avatar')}>
                            <Dices size={14} /> {avatarWait ?? t('account.rerollAvatar')}
                        </button>
                        <button className="btn btn--ghost btn--sm" disabled={!!nickWait} onClick={() => reroll('nickname')}>
                            <Dices size={14} /> {nickWait ?? t('account.rerollNick')}
                        </button>
                    </div>
                    <div className="mono muted" style={{ fontSize: 11 }}>
                        {t('account.rerollRule')}
                    </div>
                </div>
            </section>

            <h2 className="page-title">
                {t('achievements.title')}
                <sup className="mono" style={{ fontSize: '0.45em', marginLeft: 6 }}>
                    {got.size}/{ACHIEVEMENTS.length}
                </sup>
            </h2>
            <ul className={styles.badges}>
                {ACHIEVEMENTS.map((a) => {
                    const open = got.has(a.key);
                    return (
                        <li key={a.key} className={open ? styles.badgeOpen : styles.badgeLocked} title={open ? a.hint[lang] : t('achievements.locked')}>
                            <span className={styles.badgeIcon}>{open ? a.icon : '?'}</span>
                            <span className={styles.badgeTitle}>{open ? a.title[lang] : '???'}</span>
                            {open && <span className={styles.badgeHint}>{a.hint[lang]}</span>}
                        </li>
                    );
                })}
            </ul>

            <h2 className="page-title">{t('account.orders')}</h2>
            {orders?.length ? (
                <ul className={styles.orders}>
                    {orders.map((o) => (
                        <li key={o.id}>
                            <Link to={`/account/orders/${o.id}`} className={styles.order}>
                                <span className="chip">#{o.number}</span>
                                <span className={`${styles.status} ${styles[`st_${o.status}`] ?? ''}`}>{t(`order.status.${o.status}`)}</span>
                                <span className={styles.thumbs}>
                                    {o.items.slice(0, 4).map((i) => i.image && <img key={i.id} src={i.image} alt="" />)}
                                </span>
                                <span className="mono muted">{date(o.createdAt)}</span>
                                <span className="mono">{money(o.total, o.currency)}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mono">
                    {t('account.noOrders')} <Link to="/catalog">→ {t('nav.catalog')}</Link>
                </p>
            )}

            <div className={styles.forms}>
                <form className="card-box" onSubmit={saveProfile}>
                    <h3 className={styles.h}>{t('account.profile')}</h3>
                    <label className="field">
                        <span className="field__label">{t('checkout.fullName')}</span>
                        <input className="input" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
                    </label>
                    <label className="field">
                        <span className="field__label">{t('checkout.phone')}</span>
                        <input className="input" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                    </label>
                    <button className="btn">{t('common.save')}</button>
                </form>

                <form className="card-box" onSubmit={changePassword}>
                    <h3 className={styles.h}>{t('account.security')}</h3>
                    <label className="field">
                        <span className="field__label">{t('account.currentPassword')}</span>
                        <input
                            className="input"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={pw.currentPassword}
                            onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                        />
                    </label>
                    <label className="field">
                        <span className="field__label">{t('account.newPassword')}</span>
                        <input
                            className="input"
                            type="password"
                            autoComplete="new-password"
                            minLength={PASSWORD_MIN}
                            required
                            value={pw.newPassword}
                            onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                        />
                    </label>
                    <button className="btn">{t('account.changePassword')}</button>
                    <div className={styles.logout}>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => doLogout()}>
                            {t('account.logout')}
                        </button>
                        <button type="button" className="btn btn--danger btn--sm" onClick={() => doLogout(true)}>
                            {t('account.logoutAll')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AccountPage;
