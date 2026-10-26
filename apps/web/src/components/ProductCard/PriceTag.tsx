import React from 'react';
import styles from './ProductCard.module.scss';

/** Ценник-бирка с дыркой под верёвочку — фирменный handmade-мотив */
const PriceTag: React.FC<{ children: React.ReactNode; size?: 'md' | 'lg' }> = ({ children, size = 'md' }) => (
    <span className={`${styles.priceTag} ${size === 'lg' ? styles.priceTagLg : ''}`}>{children}</span>
);

export default PriceTag;
