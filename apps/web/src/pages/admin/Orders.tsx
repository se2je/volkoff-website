import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ORDER_STATUSES, formatMoney, type OrderDto, type OrderStatus } from '@volkoff/shared';
import { api } from '@/api/client';
import Avatar from '@/components/Avatar';
import { errorText } from '@/lib/format';
import { toast } from '@/store/toast';
import i18n from '@/i18n';
import { STATUS_LABEL } from './labels';
import styles from './Admin.module.scss';

const OrderRow: React.FC<{ order: OrderDto }> = ({ order }) => {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<OrderStatus>(order.status);
    const [tracking, setTracking] = useState(order.trackingNumber ?? '');
    const [note, setNote] = useState(order.adminNote ?? '');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setStatus(order.status);
        setTracking(order.trackingNumber ?? '');
        setNote(order.adminNote ?? '');
    }, [order]);

    const save = async () => {
        if ((status === 'CANCELLED' || status === 'REFUNDED') && status !== order.status) {
            if (!confirm('Отменить заказ и вернуть вещи на склад? Деньги (если были) возвращаются в кабинете платёжки.')) return;
        }
        setBusy(true);
        try {
            await api(`/admin/orders/${order.id}`, {
                method: 'PATCH',
                body: { status: status !== order.status ? status : undefined, trackingNumber: tracking || null, adminNote: note || null },
            });
            toast(`заказ #${order.number} обновлён${status === 'SHIPPED' && order.status !== 'SHIPPED' ? ' — покупателю ушло письмо' : ''}`, 'acid');
            void queryClient.invalidateQueries({ queryKey: ['admin'] });
        } catch (err) {
            toast(errorText(i18n.t, err), 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <tr className={styles.clickRow} onClick={() => setOpen((v) => !v)}>
                <td className="mono">#{order.number}</td>
                <td>
                    {order.user && (
                        <span className={styles.userCell}>
                            <Avatar seed={order.user.avatarSeed} size={22} /> {order.user.nickname}
                        </span>
                    )}
                </td>
                <td className="mono">{new Date(order.createdAt).toLocaleString('ru-RU')}</td>
                <td className="mono">{formatMoney(order.total, order.currency)}</td>
                <td className="mono">{order.paymentMethod}</td>
                <td>
                    <span className={`${styles.pill} ${styles[`ord_${order.status}`]}`}>{STATUS_LABEL[order.status]}</span>
                </td>
            </tr>
            {open && (
                <tr className={styles.expand}>
                    <td colSpan={6}>
                        <div className={styles.orderDetail}>
                            <div>
                                <h3 className={styles.h2}>состав</h3>
                                <ul className={styles.list}>
                                    {order.items.map((i) => (
                                        <li key={i.id}>
                                            <span>
                                                {i.name.ru} [{i.size}] ×{i.quantity}
                                            </span>
                                            <span className="mono">{formatMoney(i.unitPrice * i.quantity, order.currency)}</span>
                                        </li>
                                    ))}
                                    <li>
                                        <span>доставка</span>
                                        <span className="mono">{formatMoney(order.shippingCost, order.currency)}</span>
                                    </li>
                                </ul>
                                <h3 className={styles.h2}>платежи</h3>
                                <ul className={styles.list}>
                                    {order.payments.map((p) => (
                                        <li key={p.id}>
                                            <span className="mono">
                                                {p.provider} · {p.id.slice(-8)}
                                            </span>
                                            <span className="mono">{p.status}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className={styles.h2}>получатель</h3>
                                <p className="mono" style={{ fontSize: 13, lineHeight: 1.7 }}>
                                    {order.fullName}
                                    <br />
                                    {order.phone} · {order.email}
                                    <br />
                                    {[order.postalCode, order.country, order.city, order.address].filter(Boolean).join(', ')}
                                    {order.comment && (
                                        <>
                                            <br />
                                            💬 {order.comment}
                                        </>
                                    )}
                                </p>
                            </div>
                            <div className={styles.sideFields}>
                                <label className="field">
                                    <span className="field__label">статус</span>
                                    <select className="input" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                                        {ORDER_STATUSES.map((s) => (
                                            <option key={s} value={s}>
                                                {STATUS_LABEL[s]}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="field">
                                    <span className="field__label">трек-номер</span>
                                    <input className="input" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                                </label>
                                <label className="field">
                                    <span className="field__label">заметка (видна только админам)</span>
                                    <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                                </label>
                                <button className="btn btn--acid btn--sm" disabled={busy} onClick={save}>
                                    сохранить
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

const Orders: React.FC = () => {
    const [params, setParams] = useSearchParams();
    const status = params.get('status') ?? '';
    const { data } = useQuery({
        queryKey: ['admin', 'orders', status],
        queryFn: () => api<OrderDto[]>('/admin/orders', { query: { status } }),
    });

    return (
        <>
            <h1 className={styles.title}>заказы</h1>
            <div className={styles.filters}>
                <button className={`tag-btn ${!status ? 'is-active' : ''}`} onClick={() => setParams({})}>
                    все
                </button>
                {ORDER_STATUSES.map((s) => (
                    <button key={s} className={`tag-btn ${status === s ? 'is-active' : ''}`} onClick={() => setParams({ status: s })}>
                        {STATUS_LABEL[s]}
                    </button>
                ))}
            </div>
            {!data ? (
                <div className="spinner">…</div>
            ) : data.length === 0 ? (
                <p className="mono muted">пусто</p>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>№</th>
                                <th>покупатель</th>
                                <th>дата</th>
                                <th>сумма</th>
                                <th>оплата</th>
                                <th>статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((o) => (
                                <OrderRow key={o.id} order={o} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
};

export default Orders;
