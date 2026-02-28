import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './CatalogPreviewCard.module.scss';
import { CatalogItemType } from '../data/catalogItems';

interface CatalogPreviewCardProps {
    item: CatalogItemType;
    index: number;
    onClick: () => void;
}

const CatalogPreviewCard: React.FC<CatalogPreviewCardProps> = ({ item, index, onClick }) => {
    const { t, i18n } = useTranslation();

    const cardVariants = {
        initial: { opacity: 0, y: 30 },
        animate: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, delay: index * 0.1 }
        }
    };

    const getCurrency = () => {
        return i18n.language === 'ru' ? '₽' : '$';
    };

    return (
        <motion.div
            className={styles.previewCard}
            variants={cardVariants}
            onClick={onClick}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
        >
            <div className={styles.imageContainer}>
                <img
                    src={item.images[0]}
                    alt={t(item.name)}
                    className={styles.previewImage}
                />
            </div>
            <div className={styles.cardInfo}>
                <h3 className={styles.itemName}>{t(item.name)}</h3>
                <p className={styles.itemPrice}>
                    {getCurrency()} {t(item.price)}
                </p>
            </div>
        </motion.div>
    );
};

export default CatalogPreviewCard;
