import React from 'react';
import { useTranslation } from 'react-i18next';
import { RUN_A, RUN_B } from '@/lib/wolfGrid';
import PixelSprite from './PixelSprite';
import styles from './OrderFun.module.scss';

export const FLOW = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

// Свёрток на спине у волка (колонки 3–8, строки 2–5 — там у спрайта пусто)
const BUNDLE = ['..##..', '######', '#.##.#', '######'];
const withBundle = (grid: readonly string[]) =>
    grid.map((row, y) => {
        const b = BUNDLE[y - 2];
        return b ? row.slice(0, 3) + [...b].map((c, i) => (c === '#' ? '#' : row[3 + i])).join('') + row.slice(9) : row;
    });
const CARRY_A = withBundle(RUN_A);
const CARRY_B = withBundle(RUN_B);

/**
 * Статус заказа: пиксельный волк тащит свёрток по полоске
 * «ждёт оплаты → оплачен → собираем → отправлен → доставлен».
 */
const OrderTrack: React.FC<{ status: string }> = ({ status }) => {
    const { t } = useTranslation();
    const step = FLOW.indexOf(status as (typeof FLOW)[number]);
    // пока заказ в пути — волк перебирает лапами; ждёт оплаты или уже доставлен — стоит
    const moving = step > 0 && step < FLOW.length - 1;
    const pos = (step / (FLOW.length - 1)) * 100;

    return (
        <div className={styles.track}>
            <div className={styles.lane}>
                <div className={styles.line}>
                    <span className={styles.lineDone} style={{ width: `${pos}%` }} />
                </div>
                {FLOW.map((s, i) => (
                    <span key={s} className={`${styles.stop} ${i <= step ? styles.stopDone : ''}`} style={{ left: `${(i / (FLOW.length - 1)) * 100}%` }} />
                ))}
                <div className={`${styles.wolf} ${moving ? styles.wolfMoving : ''}`} style={{ left: `${pos}%` }}>
                    <PixelSprite grid={CARRY_A} className={styles.frameA} />
                    <PixelSprite grid={CARRY_B} className={styles.frameB} />
                </div>
            </div>
            <ol className={styles.labels}>
                {FLOW.map((s, i) => (
                    <li key={s} className={i === step ? styles.labelNow : i < step ? styles.labelDone : ''}>
                        <span>{String(i + 1).padStart(2, '0')}</span>
                        {t(`order.status.${s}`)}
                    </li>
                ))}
            </ol>
        </div>
    );
};

export default OrderTrack;
