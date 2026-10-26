import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CONTACTS } from '@/config/site';
import { burstFromEvent, useTapCombo } from '@/lib/wolfFun';
import WolfMark from '../WolfMark';
import styles from './Layout.module.scss';

const Footer: React.FC = () => {
    const { t } = useTranslation();
    const onLogoTap = useTapCombo(burstFromEvent);
    return (
        <footer className={styles.footer}>
            <div className={`container ${styles.footerInner}`}>
                <div className={styles.footerLogo} onClick={onLogoTap}>
                    <WolfMark size={64} className={styles.footerMark} />
                    VOLKOFF<span className={styles.cursor}>_</span>
                </div>
                <div className={styles.footerCols}>
                    <div>
                        <h4>{t('footer.shop')}</h4>
                        <Link to="/catalog">{t('nav.catalog')}</Link>
                        <Link to="/about">{t('nav.about')}</Link>
                        <Link to="/account">{t('nav.account')}</Link>
                    </div>
                    <div>
                        <h4>{t('footer.legal')}</h4>
                        <Link to="/legal/offer">{t('footer.offer')}</Link>
                        <Link to="/legal/privacy">{t('footer.privacy')}</Link>
                        <Link to="/legal/consent">{t('footer.consent')}</Link>
                        <Link to="/legal/cookies">{t('footer.cookies')}</Link>
                    </div>
                    <div>
                        <h4>{t('footer.social')}</h4>
                        <a href={CONTACTS.instagram} target="_blank" rel="noopener noreferrer">
                            instagram*
                        </a>
                        <a href={`mailto:${CONTACTS.email}`}>{CONTACTS.email}</a>
                    </div>
                </div>
            </div>
            <div className={`container ${styles.footerBottom}`}>
                <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
                <span>* Instagram принадлежит Meta, признанной экстремистской и запрещённой в РФ</span>
            </div>
        </footer>
    );
};

export default Footer;
