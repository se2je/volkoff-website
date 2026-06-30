import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './CatalogPreviewCard.module.scss';
import { CatalogItemType } from '../data/catalogItems';
import { localized, formatPrice, getCurrency } from '../utils/catalogFormat';

interface CatalogPreviewCardProps {
    item: CatalogItemType;
    index: number;
    onClick: () => void;
}

const CatalogPreviewCard: React.FC<CatalogPreviewCardProps> = ({ item, index, onClick }) => {
    const { i18n } = useTranslation();

    const cardVariants = {
        initial: { opacity: 0, y: 30 },
        animate: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, delay: index * 0.1 }
        }
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
                    alt={localized(item.name, i18n.language)}
                    className={styles.previewImage}
                />
            </div>
            <div className={styles.cardInfo}>
                <h3 className={styles.itemName}>{localized(item.name, i18n.language)}</h3>
                <p className={styles.itemPrice}>
                    {getCurrency(i18n.language)} {formatPrice(item.price, i18n.language)}
                </p>
            </div>
        </motion.div>
    );
};

export default CatalogPreviewCard;
