import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Footer.module.scss';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.logoSection}>
            <div className={styles.logo}>VOLKOFF</div>
          </div>
          
          <div className={styles.linksSection}>

            
            <div className={styles.linksColumn}>
              <h4 className={styles.linksTitle}>SOCIAL</h4>
              <ul className={styles.linksList}>
                <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer">INSTAGRAM</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className={styles.bottom}>
          <div className={styles.rights}>{t('footer.rights')}</div>
          <div className={styles.legalLinks}>
            <a href="#" className={styles.legalLink}>{t('footer.privacy')}</a>
            <a href="#" className={styles.legalLink}>{t('footer.terms')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;