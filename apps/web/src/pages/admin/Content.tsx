import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CONTENT_KEYS, CONTENT_LABELS, type ContentKey, type SiteContentDto } from '@volkoff/shared';
import { api } from '@/api/client';
import { errorText } from '@/lib/format';
import { toast } from '@/store/toast';
import i18n from '@/i18n';
import styles from './Admin.module.scss';

type Draft = Record<ContentKey, { ru: string; en: string }>;

/** Тексты сайта. Пустое поле — на сайте показывается текст по умолчанию (он виден в подсказке). */
const Content: React.FC = () => {
    const queryClient = useQueryClient();
    const { data } = useQuery({ queryKey: ['admin', 'content'], queryFn: () => api<SiteContentDto>('/admin/content') });
    const [draft, setDraft] = useState<Draft | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!data) return;
        setDraft(
            Object.fromEntries(CONTENT_KEYS.map((k) => [k, { ru: data[k]?.ru ?? '', en: data[k]?.en ?? '' }])) as Draft,
        );
    }, [data]);

    if (!draft) return <div className="spinner">…</div>;

    const set = (key: ContentKey, lang: 'ru' | 'en', value: string) =>
        setDraft((d) => (d ? { ...d, [key]: { ...d[key], [lang]: value } } : d));

    const save = async () => {
        setBusy(true);
        try {
            await api('/admin/content', { method: 'PUT', body: draft });
            toast('тексты сохранены');
            void queryClient.invalidateQueries({ queryKey: ['admin', 'content'] });
            void queryClient.invalidateQueries({ queryKey: ['content'] });
        } catch (err) {
            toast(errorText(i18n.t, err), 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className={styles.titleRow}>
                <h1 className={styles.title}>тексты сайта</h1>
                <button className="btn" disabled={busy} onClick={save}>
                    {busy ? 'сохраняем…' : 'сохранить'}
                </button>
            </div>
            <p className="muted mono" style={{ fontSize: 12, marginTop: -16, marginBottom: 24 }}>
                пустое поле — на сайте останется текст по умолчанию (виден серым внутри поля)
            </p>
            <div className={styles.editorMain}>
                {CONTENT_KEYS.map((key) => (
                    <section key={key} className="card-box">
                        <h2 className={styles.h2}>{CONTENT_LABELS[key]}</h2>
                        <div className={styles.bilingual}>
                            {(['ru', 'en'] as const).map((lang) => (
                                <label key={lang} className="field">
                                    <span className="field__label">{lang === 'ru' ? '🇷🇺 русский' : '🇬🇧 english'}</span>
                                    <textarea
                                        className="input"
                                        rows={key === 'about.text' ? 6 : 3}
                                        placeholder={i18n.t(key, { lng: lang })}
                                        value={draft[key][lang]}
                                        onChange={(e) => set(key, lang, e.target.value)}
                                    />
                                </label>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </>
    );
};

export default Content;
