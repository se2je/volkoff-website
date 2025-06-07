import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './AboutSection.module.scss';

const AboutSection: React.FC = () => {
  const { t } = useTranslation();
  const controls = useAnimation();
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  
  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [controls, isInView]);
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
        duration: 0.8
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8 }
    }
  };
  
  return (
    <section id="about" className={styles.aboutSection}>
      <div className={styles.container}>
        <motion.div
          ref={ref}
          initial="hidden"
          animate={controls}
          variants={containerVariants}
          className={styles.content}
        >
          <motion.h2 variants={itemVariants} className={styles.title}>{t('about.title')}</motion.h2>
          
          <div className={styles.textContent}>
            <motion.div variants={itemVariants} className={styles.text}>
              <p>{t('about.description')}</p>
              <p className={styles.mission}>{t('about.mission')}</p>
            </motion.div>
            
            <motion.div variants={itemVariants} className={styles.imageContainer}>
              <div className={styles.image}></div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;