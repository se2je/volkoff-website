import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './LanguageSwitcher.module.scss';

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY;
            const halfScreen = window.innerHeight * 0.5;
            setHidden(scrolled > halfScreen);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className={`${styles.languageSwitcher} ${hidden ? styles.hidden : ''}`}>
            <button
                className={`${styles.languageButton} ${i18n.language === 'en' ? styles.active : ''}`}
                onClick={() => i18n.changeLanguage('en')}
            >
                EN
            </button>
            <span className={styles.divider}>/</span>
            <button
                className={`${styles.languageButton} ${i18n.language === 'ru' ? styles.active : ''}`}
                onClick={() => i18n.changeLanguage('ru')}
            >
                RU
            </button>
        </div>
    );
};

export default LanguageSwitcher;
