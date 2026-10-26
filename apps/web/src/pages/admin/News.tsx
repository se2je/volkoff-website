import React, { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Upload } from 'lucide-react';
import type { NewsDto, NewsUpsertInput } from '@volkoff/shared';
import { api } from '@/api/client';
import { errorText } from '@/lib/format';
import { toast } from '@/store/toast';
import i18n from '@/i18n';
import styles from './Admin.module.scss';

const EMPTY: NewsUpsertInput = {
    title: { ru: '', en: '' },
    text: { ru: '', en: '' },
    imageUrl: null,
    linkUrl: '',
    linkLabel: { ru: '', en: '' },
    isActive: true,
    sortOrder: 0,
};

const toInput = (n: NewsDto): NewsUpsertInput => ({
    title: n.title,
    text: n.text,
    imageUrl: n.imageUrl,
    linkUrl: n.linkUrl ?? '',
    linkLabel: n.linkLabel,
    isActive: n.isActive,
    sortOrder: n.sortOrder,
});

const NewsForm: React.FC<{ initial: NewsUpsertInput; id?: string; onDone: () => void }> = ({ initial, id, onDone }) => {
    const [d, setD] = useState<NewsUpsertInput>(initial);
    const [busy, setBusy] = useState(false);
    const file = useRef<HTMLInputElement>(null);

    const loc = (k: 'title' | 'text' | 'linkLabel', lang: 'ru' | 'en', v: string) => setD({ ...d, [k]: { ...d[k], [lang]: v } });

    const upload = async (files: FileList | null) => {
        if (!files?.[0]) return;
        try {
            const fd = new FormData();
            fd.append('file', files[0]);
            const { url } = await api<{ url: string }>('/admin/uploads', { form: fd });
            setD((x) => ({ ...x, imageUrl: url }));
        } catch (err) {
            toast(errorText(i18n.t, err), 'error');
        }
    };

    const save = async () => {
        setBusy(true);
        try {
            await api(id ? `/admin/news/${id}` : '/admin/news', {
                method: id ? 'PUT' : 'POST',
                body: { ...d, linkUrl: d.linkUrl || null },
            });
            toast(id ? 'новость сохранена' : 'новость добавлена');
            if (!id) setD(EMPTY);
            onDone();
        } catch (err) {
            toast(errorText(i18n.t, err), 'error');
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!id || !confirm('Удалить новость?')) return;
        await api(`/admin/news/${id}`, { method: 'DELETE' });
        onDone();
    };

    return (
        <section className="card-box">
            <div className={styles.newsGrid}>
                <div className={styles.newsImage}>
                    {d.imageUrl ? (
                        <>
                            <img src={d.imageUrl} alt="" />
                            <button type="button" className={styles.newsImageRemove} onClick={() => setD({ ...d, imageUrl: null })}>
                                <Trash2 size={14} />
                            </button>
                        </>
                    ) : (
                        <label className={styles.dropzone}>
                            <Upload size={18} />
                            <span>картинка (необязательно)</span>
                            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden onChange={(e) => void upload(e.target.files)} />
                        </label>
                    )}
                </div>
                <div className={styles.sideFields}>
                    <div className={styles.bilingual}>
                        <label className="field">
                            <span className="field__label">🇷🇺 заголовок</span>
                            <input className="input" value={d.title.ru} onChange={(e) => loc('title', 'ru', e.target.value)} />
                        </label>
                        <label className="field">
                            <span className="field__label">🇬🇧 title</span>
                            <input className="input" value={d.title.en} onChange={(e) => loc('title', 'en', e.target.value)} />
                        </label>
                        <label className="field">
                            <span className="field__label">🇷🇺 текст</span>
                            <textarea className="input" rows={3} value={d.text.ru} onChange={(e) => loc('text', 'ru', e.target.value)} />
                        </label>
                        <label className="field">
                            <span className="field__label">🇬🇧 text</span>
                            <textarea className="input" rows={3} value={d.text.en} onChange={(e) => loc('text', 'en', e.target.value)} />
                        </label>
                    </div>
                    <div className={styles.newsLinkRow}>
                        <label className="field">
                            <span className="field__label">ссылка (https://… или /catalog?category=denim)</span>
                            <input className="input" value={d.linkUrl ?? ''} onChange={(e) => setD({ ...d, linkUrl: e.target.value })} />
                        </label>
                        <label className="field">
                            <span className="field__label">🇷🇺 текст ссылки</span>
                            <input className="input" placeholder="смотреть" value={d.linkLabel.ru} onChange={(e) => loc('linkLabel', 'ru', e.target.value)} />
                        </label>
                        <label className="field">
                            <span className="field__label">🇬🇧 link text</span>
                            <input className="input" placeholder="see more" value={d.linkLabel.en} onChange={(e) => loc('linkLabel', 'en', e.target.value)} />
                        </label>
                    </div>
                    <div className={styles.actionsRow}>
                        <label className="check">
                            <input type="checkbox" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} />
                            показывать на сайте
                        </label>
                        <label className={styles.inlineField}>
                            порядок
                            <input
                                className="input"
                                type="number"
                                value={d.sortOrder}
                                onChange={(e) => setD({ ...d, sortOrder: Number(e.target.value) })}
                            />
                        </label>
                        <span style={{ flex: 1 }} />
                        {id && (
                            <button type="button" className="btn btn--danger btn--sm" onClick={remove}>
                                удалить
                            </button>
                        )}
                        <button type="button" className="btn btn--sm" disabled={busy || !d.title.ru || !d.title.en} onClick={save}>
                            {id ? 'сохранить' : '+ добавить'}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

/** Новости над каталогом. Одна — показывается блоком, несколько — свайпером. */
const News: React.FC = () => {
    const queryClient = useQueryClient();
    const { data } = useQuery({ queryKey: ['admin', 'news'], queryFn: () => api<NewsDto[]>('/admin/news') });
    const refresh = () => {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
        void queryClient.invalidateQueries({ queryKey: ['news'] });
    };

    return (
        <>
            <h1 className={styles.title}>новости над каталогом</h1>
            <div className={styles.editorMain}>
                <h2 className={styles.h2}>новая</h2>
                <NewsForm initial={EMPTY} onDone={refresh} />
                {data && data.length > 0 && <h2 className={styles.h2}>опубликованные и черновики ({data.length})</h2>}
                {data?.map((n) => (
                    <NewsForm key={`${n.id}-${n.createdAt}`} id={n.id} initial={toInput(n)} onDone={refresh} />
                ))}
            </div>
        </>
    );
};

export default News;
