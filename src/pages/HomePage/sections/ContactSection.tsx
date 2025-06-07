import React from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Instagram } from 'lucide-react';
import styles from './ContactSection.module.scss';
import {EnvelopeSimple} from "@phosphor-icons/react";

const ContactSection: React.FC = () => {
  const { t } = useTranslation();
  const controls = useAnimation();
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  
  React.useEffect(() => {
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
    <section id="contact" className={styles.contactSection}>
      <div className={styles.container}>
        <motion.div
          ref={ref}
          initial="hidden"
          animate={controls}
          variants={containerVariants}
          className={styles.content}
        >

          <div className={styles.contactContent}>
            <motion.div variants={itemVariants} className={styles.contactBlock}>
              <div className={styles.contactInfo}>
                <div className={styles.infoItem}>
                  <div className={styles.iconWrapper}>
                    <EnvelopeSimple size={26} />
                  </div>
                  <div className={styles.infoText}>
                    <h3>{t('contact.email')}</h3>
                    <a href="mailto:marcvolkov@icloud.com">marcvolkov@icloud.com</a>
                  </div>
                </div>
                
                <div className={styles.infoItem}>
                  <div className={styles.iconWrapper}>
                    <Instagram size={24} />
                  </div>
                  <div className={styles.infoText}>
                    <h3>{t('contact.instagram')}</h3>
                    <a href="https://www.instagram.com/volkoff_mv" target="_blank" rel="noopener noreferrer">@volkoff_mv</a>
                  </div>
                </div>
              </div>
            </motion.div>
            
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;