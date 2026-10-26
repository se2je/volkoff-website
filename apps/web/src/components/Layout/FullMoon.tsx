import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isFullMoon } from '@/lib/moon';
import { unlock } from '@/lib/achievements';
import PixelSprite from '../OrderFun/PixelSprite';
import styles from './Layout.module.scss';

// пиксельная луна с кратерами
const MOON = ['..#####..', '.#######.', '###.#####', '#######.#', '####.####', '##.######', '#######.#', '.#######.', '..#####..'];

/** В полнолуние рядом с логотипом висит луна. Без подписей — кто понял, тот понял. */
const FullMoon: React.FC = () => {
    const { t } = useTranslation();
    const full = isFullMoon();
    useEffect(() => {
        if (full) unlock('moon');
    }, [full]);
    if (!full) return null;
    return (
        <span className={styles.moon} title={t('moon.title')}>
            <PixelSprite grid={MOON} cell={2} />
        </span>
    );
};

export default FullMoon;
