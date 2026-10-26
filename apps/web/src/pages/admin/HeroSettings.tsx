import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, Upload } from 'lucide-react';
import { heroSchema, type Hero, type SiteSettingsDto } from '@volkoff/shared';
import { api } from '@/api/client';
import { useSiteSettings } from '@/api/queries';
import { HeroView } from '@/components/Hero/Hero';
import { errorText } from '@/lib/format';
import { toast } from '@/store/toast';
import i18n from '@/i18n';
import styles from './Admin.module.scss';

/** Большая обложка над каталогом */
const HeroSettings: React.FC = () => {
    const queryClient = useQueryClient();
    const settings = useSiteSettings();
    const [hero, setHero] = useState<Hero>(settings.hero);
    const [busy, setBusy] = useState(false);
    const file = useRef<HTMLInputElement>(null);

    useEffect(() => setHero(settings.hero), [settings.hero]);

    const loc = (k: 'title' | 'subtitle' | 'linkLabel', lang: 'ru' | 'en', v: string) =>
        setHero((h) => ({ ...h, [k]: { ...h[k], [lang]: v } }));

    const payload: Hero = { ...hero, link: hero.link || null };
    const check = heroSchema.safeParse(payload);
    const problem = !check.success ? check.error.issues[0]?.message : hero.enabled && !hero.imageUrl ? 'чтобы включить обложку, загрузи картинку' : null;

    const upload = async (files: FileList | null) => {
        if (!files?.[0]) return;
        try {
            const fd = new FormData();
            fd.append('file', files[0]);
            const { url } = await api<{ url: string }>('/admin/uploads', { form: fd });
            setHero((h) => ({ ...h, imageUrl: url }));
        } catch (err) {
            toast(errorText(i18n.t, err), 'error');
        }
        if (file.current) file.current.value = '';
    };

    const save = async () => {
        setBusy(true);
        try {
            const data = await api<SiteSettingsDto>('/admin/settings/hero', { method: 'PUT', body: payload });
            queryClient.setQueryData(['settings'], data);
            toast(hero.enabled ? 'обложка сохранена и показана' : 'обложка сохранена (выключена)');
        } catch (err) {
            toast(errorText(i18n.t, err), 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className={styles.titleRow}>
                <h1 className={styles.title}>обложка над каталогом</h1>
                <button className="btn" disabled={busy || !!problem} onClick={save}>
                    {busy ? 'сохраняем…' : 'сохранить'}
                </button>
            </div>
            {problem && <p className="error-text">{problem}</p>}

            <div className={styles.editorMain}>
                <section className="card-box" style={{ background: '#fff' }}>
                    <div className={styles.probe}>
                        <label className="check">
                            <input type="checkbox" checked={hero.enabled} onChange={(e) => setHero({ ...hero, enabled: e.target.checked })} />
                            показывать на сайте
                        </label>
                        <label className="check">
                            <input type="checkbox" checked={hero.grayscale} onChange={(e) => setHero({ ...hero, grayscale: e.target.checked })} />
                            фото в ч/б
                        </label>
                    </div>
                </section>

                <section className="card-box" style={{ background: '#fff' }}>
                    <h2 className={styles.h2}>картинка — широкая, от 2000 px; на телефоне обрезается до 4:5 по центру</h2>
                    <div className={styles.probe}>
                        <label className="btn btn--ghost btn--sm">
                            <Upload size={14} /> {hero.imageUrl ? 'заменить' : 'загрузить'}
                            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden onChange={(e) => void upload(e.target.files)} />
                        </label>
                        {hero.imageUrl && (
                            <button className="btn btn--danger btn--sm" onClick={() => setHero({ ...hero, imageUrl: null, enabled: false })}>
                                <Trash2 size={14} /> убрать
                            </button>
                        )}
                    </div>
                </section>

                <section className="card-box" style={{ background: '#fff' }}>
                    <h2 className={styles.h2}>подпись (необязательно — можно оставить только фото)</h2>
                    <div className={styles.bilingual}>
                        <label className="field">
                            <span className="field__label">🇷🇺 заголовок</span>
                            <input className="input" maxLength={120} value={hero.title.ru} onChange={(e) => loc('title', 'ru', e.target.value)} />
                        </label>
                        <label className="field">
                            <span className="field__label">🇬🇧 title</span>
                            <input className="input" maxLength={120} value={hero.title.en} onChange={(e) => loc('title', 'en', e.target.value)} />
                        </label>
                        <label className="field">
                            <span className="field__label">🇷🇺 подзаголовок</span>
                            <textarea className="input" rows={2} maxLength={300} value={hero.subtitle.ru} onChange={(e) => loc('subtitle', 'ru', e.target.value)} />
                        </label>
                        <label className="field">
                            <span className="field__label">🇬🇧 subtitle</span>
                            <textarea className="input" rows={2} maxLength={300} value={hero.subtitle.en} onChange={(e) => loc('subtitle', 'en', e.target.value)} />
                        </label>
                    </div>
                    <div className={styles.newsLinkRow} style={{ marginTop: 16 }}>
                        <label className="field">
                            <span className="field__label">ссылка кнопки (/catalog?category=outerwear или https://…)</span>
                            <input className="input" value={hero.link ?? ''} onChange={(e) => setHero({ ...hero, link: e.target.value })} />
                        </label>
                        <label className="field">
                            <span className="field__label">🇷🇺 текст кнопки</span>
                            <input className="input" maxLength={60} placeholder="смотреть" value={hero.linkLabel.ru} onChange={(e) => loc('linkLabel', 'ru', e.target.value)} />
                        </label>
                        <label className="field">
                            <span className="field__label">🇬🇧 button text</span>
                            <input className="input" maxLength={60} placeholder="see more" value={hero.linkLabel.en} onChange={(e) => loc('linkLabel', 'en', e.target.value)} />
                        </label>
                    </div>
                </section>

                <section>
                    <h2 className={styles.h2}>превью</h2>
                    {hero.imageUrl ? <HeroView hero={payload} /> : <p className="muted mono">загрузи картинку, чтобы увидеть превью</p>}
                </section>
            </div>
        </>
    );
};

export default HeroSettings;
