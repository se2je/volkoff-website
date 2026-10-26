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

type AdminUser = UserDto & { orderCount: number };

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
                <table className={styles.table}>
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
                                <td>
                                    <span className={styles.userCell}>
                                        <Avatar seed={u.avatarSeed} size={24} /> {u.nickname}
                                    </span>
                                </td>
                                <td className="mono">{u.email}</td>
                                <td>{u.emailVerified ? '✓' : <span className={styles.red}>✗</span>}</td>
                                <td className="mono">{u.orderCount}</td>
                                <td className="mono">{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                                <td>
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
