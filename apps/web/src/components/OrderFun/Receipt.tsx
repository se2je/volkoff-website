import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { OrderDto } from '@volkoff/shared';
import { useFmt } from '@/lib/format';
import { hashString } from '@volkoff/shared';
import { wolfBurst } from '@/lib/wolfFun';
import styles from './OrderFun.module.scss';

const seenKey = (id: string) => `vk_receipt_${id}`;

const wasSeen = (id: string) => {
    try {
        return localStorage.getItem(seenKey(id)) === '1';
    } catch {
        return true;
    }
};

/** «Штрихкод» из номера заказа — просто красивые полоски, у каждого заказа свои */
const barcode = (seed: string) => {
    let h = hashString(seed);
    return Array.from({ length: 34 }, () => {
        h = (h * 1103515245 + 12345) >>> 0;
        return 1 + (h % 3);
    });
};

/**
 * Чек после оплаты: в первый раз печатается строчка за строчкой, как из кассы,
 * а когда допечатался — из него разлетаются волки. Потом показывается уже готовым.
 */
const Receipt: React.FC<{ order: OrderDto }> = ({ order }) => {
    const { t } = useTranslation();
    const { l, money, date } = useFmt();
    const ref = useRef<HTMLDivElement>(null);
    const [printing] = useState(() => !wasSeen(order.id));

    const lines: React.ReactNode[] = [
        <div className={styles.rcBrand}>VOLKOFF_</div>,
        <div className={styles.rcSub}>{t('receipt.sub')}</div>,
        <hr />,
        <div className={styles.rcRow}>
            <span>{t('order.title', { number: order.number }).toUpperCase()}</span>
            <span>{date(order.createdAt)}</span>
        </div>,
        <hr />,
        ...order.items.flatMap((i) => [
            <div className={styles.rcName}>{l(i.name).toUpperCase()}</div>,
            <div className={styles.rcRow}>
                <span>
                    {i.size} ×{i.quantity}
                </span>
                <i />
                <span>{money(i.unitPrice * i.quantity, order.currency)}</span>
            </div>,
        ]),
        <div className={styles.rcRow}>
            <span>{t('checkout.shippingCost')}</span>
            <i />
            <span>{order.shippingCost ? money(order.shippingCost, order.currency) : t('checkout.free')}</span>
        </div>,
        <hr className={styles.rcDouble} />,
        <div className={`${styles.rcRow} ${styles.rcTotal}`}>
            <span>{t('receipt.total')}</span>
            <span>{money(order.total, order.currency)}</span>
        </div>,
        <hr />,
        <div className={styles.rcBarcode} aria-hidden="true">
            {barcode(order.id).map((w, i) => (
                <span key={i} style={{ width: w, marginRight: i % 2 ? 2 : 1 }} />
            ))}
        </div>,
        <div className={styles.rcThanks}>{t('receipt.thanks')}</div>,
    ];

    useEffect(() => {
        if (!printing) return;
        try {
            localStorage.setItem(seenKey(order.id), '1');
        } catch {
            /* приватный режим */
        }
        // чек допечатался — праздничный разлёт волков
        const id = window.setTimeout(() => {
            const r = ref.current?.getBoundingClientRect();
            if (r) wolfBurst(r.left + r.width / 2, r.top + Math.min(r.height / 2, 200), 32);
        }, lines.length * 110 + 200);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [printing, order.id]);

    return (
        <div ref={ref} className={`${styles.receipt} ${printing ? styles.printing : ''}`}>
            {lines.map((line, i) => (
                <div key={i} className={styles.rcLine} style={printing ? { animationDelay: `${i * 110}ms` } : undefined}>
                    {line}
                </div>
            ))}
        </div>
    );
};

export default Receipt;
