import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './HeroSection.module.scss';

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  
  const scrollToCatalog = () => {
    const element = document.getElementById('catalog');
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };
  
  return (
    <section id="hero" className={styles.heroSection}>
      <div className={styles.heroBackground}>
        <div className={styles.noiseOverlay}></div>
        <div className={styles.scanEffect}></div>
      </div>      
    
        <motion.h1 
          className={styles.heroTitle}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          data-text={t('hero.title')}
        >
          {t('hero.title')}
        </motion.h1>
        

        <motion.div 
          className={styles.heroCta}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <button onClick={scrollToCatalog} className={styles.exploreButton}>
            {t('hero.cta')}
          </button>
        </motion.div>
    </section>
  );
};

export default HeroSection;
