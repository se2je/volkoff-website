import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import WolfMark from '@/components/WolfMark';
import { burstFromEvent } from '@/lib/wolfFun';
import { unlock } from '@/lib/achievements';
import styles from './NotFound.module.scss';

const NotFoundPage: React.FC<{ text?: string }> = ({ text }) => {
    const { t } = useTranslation();
    return (
        <div className={`container ${styles.page}`}>
            {/* «0» в 404 — пиксельный волк, по клику разлетается стаей */}
            <div className={styles.code} aria-label="404">
                4
                <button className={styles.wolf} onClick={(e) => {
                        burstFromEvent(e);
                        unlock('lost');
                    }} title={t('notFound.hint')}>
                    <WolfMark size={160} className={styles.mark} />
                </button>
                4
            </div>
            <p className="mono">{text ?? t('notFound.text')}</p>
            <p className={`mono muted ${styles.hint}`}>{t('notFound.hint')}</p>
            <Link to="/catalog" className="btn">
                {t('notFound.home')} →
            </Link>
        </div>
    );
};

export default NotFoundPage;
