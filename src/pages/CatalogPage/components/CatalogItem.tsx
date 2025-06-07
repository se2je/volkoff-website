import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import styles from './CatalogItem.module.scss';

// Types
import { CatalogItemType } from '../data/catalogItems';

interface CatalogItemProps {
  item: CatalogItemType;
  index: number;
}

const CatalogItem: React.FC<CatalogItemProps> = ({ item, index }) => {
  const { t, i18n } = useTranslation();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const hasMultipleImages = item.images.length > 1;

  const itemVariants = {
    initial: {
      opacity: 0,
      y: 30
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: index * 0.1
      }
    }
  };

  const nextImage = () => {
    setActiveImageIndex((prev) =>
        prev === item.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setActiveImageIndex((prev) =>
        prev === 0 ? item.images.length - 1 : prev - 1
    );
  };

  const openSocial = () => {
    window.open(item.socialLink, '_blank');
  };

  const getCurrency = () => {
    return i18n.language === 'ru' ? '₽' : '$';
  };



  return (
      <motion.div
          className={styles.catalogItem}
          variants={itemVariants}
      >
        <div className={styles.imageSlider}>
          <div className={styles.imagesContainer} style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}>
            {item.images.map((image, i) => (
                <div key={i} className={styles.imageWrapper}>
                  <img src={image} alt={t(item.name)} className={styles.itemImage} />
                </div>
            ))}
          </div>

          {hasMultipleImages && (
            <>
              <button className={`${styles.sliderButton} ${styles.prevButton}`} onClick={prevImage}>
                <ChevronLeft size={24} />
              </button>
              <button className={`${styles.sliderButton} ${styles.nextButton}`} onClick={nextImage}>
                <ChevronRight size={24} />
              </button>

              <div className={styles.pagination}>
                {item.images.map((_, i) => (
                  <span
                    key={i}
                    className={`${styles.paginationDot} ${i === activeImageIndex ? styles.active : ''}`}
                    onClick={() => setActiveImageIndex(i)}
                  ></span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.itemDetails}>
        <div>
          <h2 className={styles.itemName}>{t(item.name)}</h2>
          <p className={styles.itemDescription}>{t(item.description)}</p>
        </div>

          <div className={styles.itemFooter}>
            <div className={styles.priceContainer}>
              <span className={styles.price}>
              {getCurrency()} {t(item.price)}
            </span>
            </div>

            <button className={styles.socialButton} onClick={openSocial}>
              <span>{t('catalog.openSocial')}</span>
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </motion.div>
  );
};

export default CatalogItem;