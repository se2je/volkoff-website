import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatMoney, type AdminStats } from '@volkoff/shared';
import { api } from '@/api/client';
import { STATUS_LABEL } from './labels';
import styles from './Admin.module.scss';

const Dashboard: React.FC = () => {
    const { data } = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api<AdminStats>('/admin/stats') });
    if (!data) return <div className="spinner">…</div>;

    const waiting = (data.ordersByStatus.PAID ?? 0) + (data.ordersByStatus.PROCESSING ?? 0);

    return (
        <>
            <h1 className={styles.title}>дашборд</h1>
            <div className={styles.stats}>
                <div className={styles.stat}>
                    <span>выручка ₽</span>
                    <b>{formatMoney(data.revenue.RUB, 'RUB')}</b>
                </div>
                <div className={styles.stat}>
                    <span>выручка $</span>
                    <b>{formatMoney(data.revenue.USD, 'USD', 'en')}</b>
                </div>
                <Link to="/admin/orders?status=PAID" className={`${styles.stat} ${waiting ? styles.statHot : ''}`}>
                    <span>ждут отправки</span>
                    <b>{waiting}</b>
                </Link>
                <div className={styles.stat}>
                    <span>товаров / людей</span>
                    <b>
                        {data.products} / {data.users}
                    </b>
                </div>
            </div>

            <div className={styles.twoCol}>
                <section className="card-box">
                    <h2 className={styles.h2}>заказы по статусам</h2>
                    <ul className={styles.list}>
                        {Object.entries(STATUS_LABEL).map(([status, label]) => (
                            <li key={status}>
                                <Link to={`/admin/orders?status=${status}`}>{label}</Link>
                                <span className="mono">{data.ordersByStatus[status as keyof typeof data.ordersByStatus] ?? 0}</span>
                            </li>
                        ))}
                    </ul>
                </section>
                <section className="card-box">
                    <h2 className={styles.h2}>распродано (остаток 0)</h2>
                    {data.lowStock.length === 0 ? (
                        <p className="muted mono">всё в наличии</p>
                    ) : (
                        <ul className={styles.list}>
                            {data.lowStock.map((v) => (
                                <li key={`${v.productId}-${v.size}`}>
                                    <Link to={`/admin/products/${v.productId}`}>
                                        {v.name.ru} [{v.size}]
                                    </Link>
                                    <span className={`mono ${v.stock === 0 ? styles.red : ''}`}>{v.stock}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </>
    );
};

export default Dashboard;
