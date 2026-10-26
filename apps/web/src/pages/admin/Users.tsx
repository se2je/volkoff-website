import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserDto } from '@volkoff/shared';
import { api } from '@/api/client';
import Avatar from '@/components/Avatar';
import { errorText } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import i18n from '@/i18n';
import styles from './Admin.module.scss';

type AdminUser = UserDto & {
    orderCount: number;
    lastShipping: { fullName: string; phone: string; country: string; city: string; address: string; postalCode: string } | null;
    lastSeenAt: string | null;
};

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Что знаем о человеке: профиль + адрес из последнего заказа. Пустое не показываем. */
const userFacts = (u: AdminUser): [string, string][] => {
    const s = u.lastShipping;
    const address = s ? [s.postalCode, s.country, s.city, s.address].filter(Boolean).join(', ') : '';
    const rows: [string, string | null | undefined][] = [
        ['фио', u.fullName || s?.fullName],
        ['телефон', u.phone || s?.phone],
        ['адрес', address],
        ['язык', u.locale],
        ['заходил', u.lastSeenAt && fmtDate(u.lastSeenAt)],
    ];
    return rows.filter((r): r is [string, string] => !!r[1]);
};

/** Подсказка у ника: position fixed, чтобы не обрезалась прокруткой таблицы */
const UserHint: React.FC<{ u: AdminUser }> = ({ u }) => {
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    const facts = userFacts(u);
    const show = (e: React.SyntheticEvent<HTMLElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: Math.min(r.left, window.innerWidth - 300), y: r.bottom + 6 });
    };
    return (
        <span
            className={styles.userCell}
            tabIndex={0}
            onMouseEnter={show}
            onFocus={show}
            onMouseLeave={() => setPos(null)}
            onBlur={() => setPos(null)}
        >
            <Avatar seed={u.avatarSeed} size={24} /> {u.nickname}
            {pos && (
                <span className={styles.userHint} style={{ left: pos.x, top: pos.y }} role="tooltip">
                    {facts.length > 0 ? (
                        facts.map(([k, v]) => (
                            <span key={k} className={styles.userHintRow}>
                                <span>{k}</span>
                                <span>{v}</span>
                            </span>
                        ))
                    ) : (
                        <span className="muted">пока ничего о себе не рассказал</span>
                    )}
                </span>
            )}
        </span>
    );
};

const Users: React.FC = () => {
    const [q, setQ] = useState('');
    const me = useAuth((s) => s.user);
    const queryClient = useQueryClient();
    const { data } = useQuery({
        queryKey: ['admin', 'users', q],
        queryFn: () => api<AdminUser[]>('/admin/users', { query: { q } }),
    });

    const toggleRole = async (u: AdminUser) => {
        const role = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
        if (!confirm(`${u.nickname}: сделать ${role === 'ADMIN' ? 'АДМИНОМ' : 'обычным пользователем'}?`)) return;
        try {
            await api(`/admin/users/${u.id}`, { method: 'PATCH', body: { role } });
            void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        } catch (err) {
            toast(errorText(i18n.t, err), 'error');
        }
    };

    return (
        <>
            <h1 className={styles.title}>люди</h1>
            <div className={styles.filters}>
                <input className="input" placeholder="почта или ник" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className={styles.tableWrap}>
                <table className={`${styles.table} ${styles.stackTable}`}>
                    <thead>
                        <tr>
                            <th>ник</th>
                            <th>почта</th>
                            <th>подтверждена</th>
                            <th>заказов</th>
                            <th>с нами с</th>
                            <th>роль</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.map((u) => (
                            <tr key={u.id}>
                                <td data-label="ник" className={styles.wide}>
                                    <UserHint u={u} />
                                </td>
                                <td className={`mono ${styles.wide}`} data-label="почта">{u.email}</td>
                                <td data-label="подтверждена">{u.emailVerified ? '✓' : <span className={styles.red}>✗</span>}</td>
                                <td className="mono" data-label="заказов">{u.orderCount}</td>
                                <td className="mono" data-label="с нами с">{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                                <td data-label="роль">
                                    <button
                                        className={`btn btn--sm ${u.role === 'ADMIN' ? 'btn--acid' : 'btn--ghost'}`}
                                        disabled={u.id === me?.id}
                                        onClick={() => toggleRole(u)}
                                    >
                                        {u.role === 'ADMIN' ? 'admin' : 'user'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default Users;
