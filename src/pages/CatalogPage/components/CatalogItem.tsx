import React, {useState, useEffect, useRef} from 'react';
import {motion, useScroll, useTransform} from 'framer-motion';
import {useTranslation} from 'react-i18next';
import {ChevronLeft, ChevronRight, ExternalLink} from 'lucide-react';
import mediumZoom from 'medium-zoom';
import styles from './CatalogItem.module.scss';

// Types
import {CatalogItemType} from '../data/catalogItems';

interface CatalogItemProps {
    item: CatalogItemType;
    index: number;
}

const CatalogItem: React.FC<CatalogItemProps> = ({item, index}) => {
    const {t, i18n} = useTranslation();
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const hasMultipleImages = item.images.length > 1;

    const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const itemVariants = {
        initial: {opacity: 0, y: 30},
        animate: {
            opacity: 1,
            y: 0,
            transition: {duration: 0.6, delay: index * 0.1}
        }
    };

    /* ============================
       MEDIUM ZOOM
    ============================ */

    useEffect(() => {
        const imgs = imageRefs.current.filter(Boolean) as HTMLImageElement[];

        const zoom = mediumZoom(imgs, {
            margin: 10,
            background: 'rgba(0,0,0,0.85)',
        });

        return () => {
            zoom.detach();
        };
    }, [item.images]);

    /* ============================
       SCROLL "TURN TOWARDS YOU" EFFECT (ROTATE X)
    ============================ */

    const {scrollYProgress} = useScroll({
        target: containerRef,
        offset: ['start end', 'end start']
    });

    // вертикальный скролл => наклон по X (3D), “следит за тобой”
    // можно подкрутить амплитуду: 10..20
    const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [14, 0, -14]);

    /* ============================
       SLIDER LOGIC
    ============================ */

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
    const descriptionText = item.description
        ? t(item.description, {defaultValue: ""})
        : "";

    const shouldRender = descriptionText.trim().length > 0;
    console.log("DESC:", JSON.stringify(descriptionText));

    return (
        <motion.div
            className={styles.catalogItem}
            variants={itemVariants}
            ref={containerRef}
        >
            <div className={styles.imageSlider}>
                <div
                    className={styles.imagesContainer}
                    style={{transform: `translateX(-${activeImageIndex * 100}%)`}}
                >
                    {item.images.map((image, i) => (
                        <div key={i} className={styles.imageWrapper}>
                            <motion.img
                                ref={(el) => (imageRefs.current[i] = el)}
                                src={image}
                                alt={t(item.name)}
                                className={styles.itemImage}
                                style={{
                                    rotateX,
                                    transformPerspective: 200
                                }}
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

            <div className={styles.itemDetails}>
                <div>
                    <h2 className={styles.itemName}>{t(item.name)}</h2>

                    {shouldRender && (
                        <p className={styles.itemDescription}>
                            {descriptionText}
                        </p>
                    )}

                </div>

                <div className={styles.itemFooter}>
                    <div className={styles.priceContainer}>
            <span className={styles.price}>
              {getCurrency()} {t(item.price)}
            </span>
                    </div>

                    <button className={styles.socialButton} onClick={openSocial}>
                        <span>{t('catalog.openSocial')}</span>
                        <ExternalLink size={16}/>
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default CatalogItem;
