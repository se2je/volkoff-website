import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryDto } from '@volkoff/shared';
import { api } from '@/api/client';
import { errorText } from '@/lib/format';
import { toast } from '@/store/toast';
import i18n from '@/i18n';
import styles from './Admin.module.scss';

interface Draft {
    id?: string;
    slug: string;
    ru: string;
    en: string;
    sortOrder: number;
}

const CategoryRow: React.FC<{ initial: Draft; onDone: () => void }> = ({ initial, onDone }) => {
    const [d, setD] = useState(initial);
    const save = async () => {
        try {
            const body = { slug: d.slug, name: { ru: d.ru, en: d.en }, sortOrder: Number(d.sortOrder) || 0 };
            await api(d.id ? `/admin/categories/${d.id}` : '/admin/categories', { method: d.id ? 'PUT' : 'POST', body });
            toast('сохранено', 'acid');
            if (!d.id) setD({ slug: '', ru: '', en: '', sortOrder: 0 });
            onDone();
        } catch (err) {
            toast(errorText(i18n.t, err), 'error');
        }
    };
    const remove = async () => {
        if (!d.id || !confirm('Удалить категорию? Товары останутся, но без категории.')) return;
        await api(`/admin/categories/${d.id}`, { method: 'DELETE' });
        onDone();
    };
    return (
        <tr>
            <td>
                <input className="input" placeholder="slug-latin" value={d.slug} onChange={(e) => setD({ ...d, slug: e.target.value })} />
            </td>
            <td>
                <input className="input" placeholder="название" value={d.ru} onChange={(e) => setD({ ...d, ru: e.target.value })} />
            </td>
            <td>
                <input className="input" placeholder="name" value={d.en} onChange={(e) => setD({ ...d, en: e.target.value })} />
            </td>
            <td style={{ width: 90 }}>
                <input className="input" type="number" value={d.sortOrder} onChange={(e) => setD({ ...d, sortOrder: Number(e.target.value) })} />
            </td>
            <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn btn--sm" onClick={save}>
                    {d.id ? 'сохранить' : '+ добавить'}
                </button>{' '}
                {d.id && (
                    <button className="btn btn--danger btn--sm" onClick={remove}>
                        ×
                    </button>
                )}
            </td>
        </tr>
    );
};

const Categories: React.FC = () => {
    const queryClient = useQueryClient();
    const { data } = useQuery({ queryKey: ['admin', 'categories'], queryFn: () => api<CategoryDto[]>('/admin/categories') });
    const refresh = () => {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
        void queryClient.invalidateQueries({ queryKey: ['categories'] });
    };

    return (
        <>
            <h1 className={styles.title}>категории</h1>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>slug (в URL)</th>
                            <th>🇷🇺</th>
                            <th>🇬🇧</th>
                            <th>порядок</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {data?.map((c) => (
                            <CategoryRow
                                key={c.id}
                                initial={{ id: c.id, slug: c.slug, ru: c.name.ru, en: c.name.en, sortOrder: c.sortOrder }}
                                onDone={refresh}
                            />
                        ))}
                        <CategoryRow initial={{ slug: '', ru: '', en: '', sortOrder: (data?.length ?? 0) + 1 }} onDone={refresh} />
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default Categories;
