import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePack } from '@/api/queries';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/store/auth';
import styles from './PackPage.module.scss';

/** «Стая» — стена аватарок всех, кто уже купил. Только ник и аватарка. */
const PackPage: React.FC = () => {
    const { t } = useTranslation();
    const { data, isLoading } = usePack();
    const me = useAuth((s) => s.user);

    return (
        <div className={`container ${styles.page}`}>
            <h1 className={styles.heading}>
                {t('pack.title')}
                <sup>{data?.count ?? ''}</sup>
            </h1>
            <p className={`mono ${styles.lead}`}>{t('pack.lead', { count: data?.count ?? 0 })}</p>

            {isLoading ? (
                <div className="spinner">{t('common.loading')}</div>
            ) : !data?.members.length ? (
                <p className="mono muted">
                    {t('pack.empty')} <Link to="/catalog">→ {t('nav.catalog')}</Link>
                </p>
            ) : (
                <ul className={styles.wall}>
                    {data.members.map((m, i) => (
                        <li key={m.nickname} className={me?.nickname === m.nickname ? styles.me : ''} title={`№${i + 1} · ${m.nickname}`}>
                            <Avatar seed={m.avatarSeed} size={56} />
                            <span>{m.nickname}</span>
                            {me?.nickname === m.nickname && <em>{t('pack.you')}</em>}
                        </li>
                    ))}
                </ul>
            )}

            {me && !data?.members.some((m) => m.nickname === me.nickname) && (
                <p className="mono muted" style={{ marginTop: 24, fontSize: 12 }}>
                    {t('pack.notYet')} <Link to="/catalog">→ {t('nav.catalog')}</Link>
                </p>
            )}
        </div>
    );
};

export default PackPage;
