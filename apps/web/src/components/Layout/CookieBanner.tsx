import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Layout.module.scss';

const KEY = 'vk-cookie-ok';

const CookieBanner: React.FC = () => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(() => {
        try {
            return !localStorage.getItem(KEY);
        } catch {
            return false;
        }
    });
    if (!visible) return null;
    const accept = () => {
        try {
            localStorage.setItem(KEY, '1');
        } catch {
            /* приватный режим */
        }
        setVisible(false);
    };
    return (
        <div className={styles.cookie}>
            <span>
                {t('cookie.text')} <Link to="/legal/cookies">→ cookies</Link>
            </span>
            <button className="btn btn--acid btn--sm" onClick={accept}>
                {t('cookie.ok')}
            </button>
        </div>
    );
};

export default CookieBanner;
