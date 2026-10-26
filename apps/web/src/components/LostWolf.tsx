import React from 'react';
import { RUN_A } from '@/lib/wolfGrid';
import PixelSprite from './OrderFun/PixelSprite';
import styles from './LostWolf.module.scss';

// пиксельный вопрос над головой
const QUESTION = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'];

/** Растерянный волк: озирается по сторонам и принюхивается — для пустых списков */
const LostWolf: React.FC = () => (
    <div className={styles.lost} aria-hidden="true">
        <PixelSprite grid={QUESTION} cell={3} className={styles.question} />
        <div className={styles.wolf}>
            <PixelSprite grid={RUN_A} cell={5} />
        </div>
        <span className={styles.ground} />
    </div>
);

export default LostWolf;
