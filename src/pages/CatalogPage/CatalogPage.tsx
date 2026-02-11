import { motion } from 'framer-motion';
import styles from './CatalogPage.module.scss';

// Components
import CatalogItem from './components/CatalogItem';

// Data
import { catalogItems } from './data/catalogItems';

const CatalogPage: React.FC = () => {

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
            <CatalogItem key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default CatalogPage;