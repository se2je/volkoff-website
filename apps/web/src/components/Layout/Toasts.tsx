import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/store/toast';
import styles from './Layout.module.scss';

const Toasts: React.FC = () => {
    const { toasts, dismiss } = useToast();
    return (
        <div className={styles.toasts} role="status" aria-live="polite">
            <AnimatePresence>
                {toasts.map((t) => (
                    <motion.button
                        key={t.id}
                        className={`${styles.toast} ${styles[`toast_${t.tone}`]}`}
                        initial={{ opacity: 0, y: 20, rotate: -2 }}
                        animate={{ opacity: 1, y: 0, rotate: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        onClick={() => dismiss(t.id)}
                    >
                        {t.text}
                    </motion.button>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default Toasts;
