import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styles from './CatalogPage.module.scss';

// Components
import CatalogItem from './components/CatalogItem';

// Data
import { catalogItems } from './data/catalogItems';

const CatalogPage: React.FC = () => {
  const { t } = useTranslation();
  
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
  
  const titleVariants = {
    initial: { y: -20, opacity: 0 },
    animate: { 
      y: 0, 
      opacity: 1,
      transition: {
        duration: 0.6
      }
    }
  };
  
  return (
    <motion.div 
      id="catalog"
      className={styles.catalogPage}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      <div className={styles.container}>
        <motion.h1 
          className={styles.title}
          variants={titleVariants}
        >
          {t('catalog.title')}
        </motion.h1>
        
        <div className={styles.grid}>
          {catalogItems.map((item, index) => (
            <CatalogItem key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default CatalogPage;