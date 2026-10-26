import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { OrderDto } from '@volkoff/shared';
import { api } from '@/api/client';
import { useOrder } from '@/api/queries';
import { errorText, useFmt } from '@/lib/format';
import { toast } from '@/store/toast';
import NotFoundPage from '../NotFoundPage';
import styles from './Account.module.scss';

const FLOW = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

const OrderPage: React.FC = () => {
    const { id } = useParams();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { l, money, date } = useFmt();
    const { data: order, isLoading } = useOrder(id);

    if (isLoading) return <div className="spinner">{t('common.loading')}</div>;
    if (!order) return <NotFoundPage />;

    const step = FLOW.indexOf(order.status as (typeof FLOW)[number]);
    const pending = order.payments.find((p) => p.status === 'PENDING' && p.redirectUrl);

    const cancel = async () => {
        try {
            const updated = await api<OrderDto>(`/orders/${order.id}/cancel`, { method: 'POST' });
            queryClient.setQueryData(['order', order.id], updated);
            void queryClient.invalidateQueries({ queryKey: ['my-orders'] });
            void queryClient.invalidateQueries({ queryKey: ['products'] });
            toast(t('order.cancelled'));
        } catch (err) {
            toast(errorText(t, err), 'error');
        }
    };

    return (
        <div className={`container ${styles.page}`}>
            <Link to="/account" className="mono muted" style={{ fontSize: 14 }}>
                ← {t('account.title')}
            </Link>
            <h1 className="page-title">{t('order.title', { number: order.number })}</h1>

            {step >= 0 ? (
                <ol className={styles.timeline}>
                    {FLOW.map((s, i) => (
                        <li key={s} className={i <= step ? styles.done : ''}>
                            <span>{String(i + 1).padStart(2, '0')}</span>
                            {t(`order.status.${s}`)}
                        </li>
                    ))}
                </ol>
            ) : (
                <div className={`chip ${styles.cancelledChip}`}>{t(`order.status.${order.status}`)}</div>
            )}

            {order.status === 'PENDING_PAYMENT' && (
                <div className={styles.payBox}>
                    {order.expiresAt && <span className="mono">{t('order.expires', { time: date(order.expiresAt) })}</span>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {pending?.redirectUrl && (
                            <a href={pending.redirectUrl} className="btn btn--acid">
                                {t('order.pay')} →
                            </a>
                        )}
                        <button className="btn btn--danger" onClick={cancel}>
                            {t('order.cancel')}
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.orderGrid}>
                <section className="card-box">
                    <h3 className={styles.h}>{t('order.items')}</h3>
                    <ul className={styles.orderItems}>
                        {order.items.map((i) => (
                            <li key={i.id}>
                                {i.image && <img src={i.image} alt="" />}
                                <span>
                                    {i.productSlug ? <Link to={`/product/${i.productSlug}`}>{l(i.name)}</Link> : l(i.name)}{' '}
                                    <span className="muted">
                                        · {i.size} ×{i.quantity}
                                    </span>
                                </span>
                                <span className="mono">{money(i.unitPrice * i.quantity, order.currency)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className={styles.sumRow}>
                        <span>{t('checkout.shippingCost')}</span>
                        <span>{order.shippingCost ? money(order.shippingCost, order.currency) : t('checkout.free')}</span>
                    </div>
                    <div className={`${styles.sumRow} ${styles.sumTotal}`}>
                        <span>{t('checkout.total')}</span>
                        <span>{money(order.total, order.currency)}</span>
                    </div>
                </section>
                <section className="card-box">
                    <h3 className={styles.h}>{t('order.delivery')}</h3>
                    <p className="mono" style={{ fontSize: 14, lineHeight: 1.7 }}>
                        {order.fullName}
                        <br />
                        {order.phone}
                        <br />
                        {[order.postalCode, order.country, order.city, order.address].filter(Boolean).join(', ')}
                        {order.comment && (
                            <>
                                <br />
                                <span className="muted">{order.comment}</span>
                            </>
                        )}
                    </p>
                    {order.trackingNumber && (
                        <p className="mono">
                            {t('order.tracking')}: <b>{order.trackingNumber}</b>
                        </p>
                    )}
                    <p className="mono muted" style={{ fontSize: 12 }}>
                        {date(order.createdAt)} · {t(`checkout.methods.${order.paymentMethod}`)}
                    </p>
                </section>
            </div>
        </div>
    );
};

export default OrderPage;
