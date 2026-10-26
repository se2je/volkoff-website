import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatMoney, type ProductDto } from '@volkoff/shared';
import { api } from '@/api/client';
import { PRODUCT_STATUS_LABEL } from './labels';
import styles from './Admin.module.scss';

const ProductsList: React.FC = () => {
    const [q, setQ] = useState('');
    const [status, setStatus] = useState<string>('');
    const { data } = useQuery({ queryKey: ['admin', 'products'], queryFn: () => api<ProductDto[]>('/admin/products') });

    const list = useMemo(() => {
        const term = q.trim().toLowerCase();
        return (data ?? []).filter(
            (p) =>
                (!status || p.status === status) &&
                (!term || p.name.ru.toLowerCase().includes(term) || p.name.en.toLowerCase().includes(term) || p.code.includes(term)),
        );
    }, [data, q, status]);

    return (
        <>
            <div className={styles.titleRow}>
                <h1 className={styles.title}>товары</h1>
                <Link to="/admin/products/new" className="btn btn--acid">
                    + новая вещь
                </Link>
            </div>
            <div className={styles.filters}>
                <input className="input" placeholder="поиск по названию / коду" value={q} onChange={(e) => setQ(e.target.value)} />
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">все статусы</option>
                    {Object.entries(PRODUCT_STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
            </div>
            {!data ? (
                <div className="spinner">…</div>
            ) : (
                <>
                {/* На телефоне — карточки вместо таблицы */}
                <ul className={styles.mobileList}>
                    {list.map((p) => (
                        <li key={p.id}>
                            <Link to={`/admin/products/${p.id}`} className={styles.mobileItem}>
                                {p.images[0] ? <img src={p.images[0].url} alt="" /> : <span className={styles.noThumb} />}
                                <div className={styles.mobileItemBody}>
                                    <div className={styles.mobileItemTop}>
                                        <span className="mono muted">{p.code}</span>
                                        <span className={`${styles.pill} ${styles[`pill_${p.status}`]}`}>{PRODUCT_STATUS_LABEL[p.status]}</span>
                                    </div>
                                    <b>
                                        {p.name.ru}
                                        {p.isFeatured && <span className={styles.badge}>★</span>}
                                    </b>
                                    <span className="mono">
                                        {formatMoney(p.priceRub, 'RUB')} · {formatMoney(p.priceUsd, 'USD', 'en')}
                                    </span>
                                    <span className="mono muted">
                                        {p.category?.name.ru ?? '—'} ·{' '}
                                        {p.variants.map((v) => (
                                            <span key={v.id} className={v.stock === 0 ? styles.red : ''}>
                                                {v.size}:{v.stock}{' '}
                                            </span>
                                        ))}
                                    </span>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
                <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th />
                                <th>код</th>
                                <th>название</th>
                                <th>категория</th>
                                <th>₽</th>
                                <th>$</th>
                                <th>остатки</th>
                                <th>статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.images[0] && <img src={p.images[0].url} alt="" className={styles.thumb} />}</td>
                                    <td className="mono">{p.code}</td>
                                    <td>
                                        <Link to={`/admin/products/${p.id}`} className={styles.link}>
                                            {p.name.ru}
                                        </Link>
                                        {p.isFeatured && <span className={styles.badge}>★</span>}
                                    </td>
                                    <td>{p.category?.name.ru ?? '—'}</td>
                                    <td className="mono">{formatMoney(p.priceRub, 'RUB')}</td>
                                    <td className="mono">{formatMoney(p.priceUsd, 'USD', 'en')}</td>
                                    <td className="mono">
                                        {p.variants.map((v) => (
                                            <span key={v.id} className={v.stock === 0 ? styles.red : ''}>
                                                {v.size}:{v.stock}{' '}
                                            </span>
                                        ))}
                                    </td>
                                    <td>
                                        <span className={`${styles.pill} ${styles[`pill_${p.status}`]}`}>{PRODUCT_STATUS_LABEL[p.status]}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </>
            )}
        </>
    );
};

export default ProductsList;
