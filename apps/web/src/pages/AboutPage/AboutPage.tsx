import React from 'react';
import { useTranslation } from 'react-i18next';
import { CONTACTS } from '@/config/site';
import { useSiteText } from '@/lib/format';
import styles from './AboutPage.module.scss';

const AboutPage: React.FC = () => {
    const { t } = useTranslation();
    const text = useSiteText();
    return (
        <div className={`container ${styles.page}`}>
            <h1 className={styles.huge} aria-label="VOLKOFF">
                VOLKOFF
            </h1>
            <div className={styles.grid}>
                <p className={styles.lead}>{text('about.lead')}</p>
                <div className={styles.text}>
                    <p>{text('about.text')}</p>
                    <p className={styles.mission}>{text('about.mission')}</p>
                </div>
            </div>
            <h2 className="page-title">{t('about.contacts')}</h2>
            <div className={styles.contacts}>
                <a href={`mailto:${CONTACTS.email}`}>
                    <span className="chip">email</span> {CONTACTS.email}
                </a>
                <a href={CONTACTS.instagram} target="_blank" rel="noopener noreferrer">
                    <span className="chip">instagram*</span> {CONTACTS.instagramHandle}
                </a>
            </div>
        </div>
    );
};

export default AboutPage;
