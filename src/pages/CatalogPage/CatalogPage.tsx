import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './CatalogPage.module.scss';

import CatalogPreviewCard from './components/CatalogPreviewCard';
import CatalogDetailsModal from './components/CatalogDetailsModal';

import { catalogItems, CatalogItemType } from './data/catalogItems';

const CatalogPage: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<CatalogItemType | null>(null);

  const pageVariants = {
    initial: {
      opacity: 0
    },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <>
      <motion.div
        id="catalog"
        className={styles.catalogPage}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
      >
        <div className={styles.container}>
          <div className={styles.grid}>
            {catalogItems.map((item, index) => (
              <CatalogPreviewCard
                key={item.id}
                item={item}
                index={index}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        </div>
      </motion.div>

      <CatalogDetailsModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
};

export default CatalogPage;