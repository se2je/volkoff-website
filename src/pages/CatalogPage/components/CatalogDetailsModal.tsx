import React, {useState, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {useTranslation} from 'react-i18next';
import {X, ChevronLeft, ChevronRight, ExternalLink} from 'lucide-react';
import styles from './CatalogDetailsModal.module.scss';
import {CatalogItemType} from '../data/catalogItems';

interface CatalogDetailsModalProps {
    item: CatalogItemType | null;
    onClose: () => void;
}

const CatalogDetailsModal: React.FC<CatalogDetailsModalProps> = ({item, onClose}) => {
    const {t, i18n} = useTranslation();
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const hasMultipleImages = item ? item.images.length > 1 : false;

    useEffect(() => {
        setActiveImageIndex(0);
    }, [item]);

    useEffect(() => {
        if (item) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [item]);

    if (!item) return null;

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

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const modalVariants = {
        hidden: {opacity: 0},
        visible: {opacity: 1}
    };

    const contentVariants = {
        hidden: {opacity: 0, y: 50, scale: 0.95},
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: 'spring',
                damping: 25,
                stiffness: 300
            }
        },
        exit: {
            opacity: 0,
            y: 50,
            scale: 0.95,
            transition: {duration: 0.2}
        }
    };

    const descriptionText = item.description
        ? t(item.description, {defaultValue: ""})
        : "";

    const shouldRender = descriptionText.trim().length > 0;

    return (
        <AnimatePresence>
            {item && (
                <motion.div
                    className={styles.modalBackdrop}
                    onClick={handleBackdropClick}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={modalVariants}
                >
                    <motion.div
                        className={styles.modalContent}
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <button className={styles.closeButton} onClick={onClose}>
                            <X size={24}/>
                        </button>

                        <div className={styles.modalBody}>
                            <div className={styles.imageSection}>
                                <div className={styles.imageSlider}>
                                    <div
                                        className={styles.imagesContainer}
                                        style={{transform: `translateX(-${activeImageIndex * 100}%)`}}
                                    >
                                        {item.images.map((image, i) => (
                                            <div key={i} className={styles.imageWrapper}>
                                                <img
                                                    src={image}
                                                    alt={t(item.name)}
                                                    className={styles.detailImage}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {hasMultipleImages && (
                                        <>
                                            <button
                                                className={`${styles.sliderButton} ${styles.prevButton}`}
                                                onClick={prevImage}
                                            >
                                                <ChevronLeft size={24}/>
                                            </button>

                                            <button
                                                className={`${styles.sliderButton} ${styles.nextButton}`}
                                                onClick={nextImage}
                                            >
                                                <ChevronRight size={24}/>
                                            </button>

                                            <div className={styles.pagination}>
                                                {item.images.map((_, i) => (
                                                    <span
                                                        key={i}
                                                        className={`${styles.paginationDot} ${
                                                            i === activeImageIndex ? styles.active : ''
                                                        }`}
                                                        onClick={() => setActiveImageIndex(i)}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className={styles.detailsSection}>
                                <div className={styles.detailsHeader}>
                                    <h2 className={styles.itemName}>{t(item.name)}</h2>
                                    <p className={styles.itemPrice}>
                                        {getCurrency()} {t(item.price)}
                                    </p>
                                </div>

                                {shouldRender && (
                                    <p className={styles.itemDescription}>
                                        {descriptionText}
                                    </p>
                                )}

                                <button className={styles.socialButton} onClick={openSocial}>
                                    <span>{t('catalog.openSocial')}</span>
                                    <ExternalLink size={18}/>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CatalogDetailsModal;