import React from 'react';
import {motion} from 'framer-motion';
import styles from './HomePage.module.scss';

// Components
import HeroSection from './sections/HeroSection';
import ContactSection from './sections/ContactSection';

const HomePage: React.FC = () => {

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
            className={styles.homePage}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
        >
            <HeroSection/>
            <ContactSection/>
        </motion.div>
    );
};

export default HomePage;