import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { tagRailSchema, type SiteSettingsDto, type TagRail } from '@volkoff/shared';
import { api } from '@/api/client';
import { useFacets, useSiteSettings } from '@/api/queries';
import { errorText } from '@/lib/format';
import { toast } from '@/store/toast';
import i18n from '@/i18n';
import styles from './Admin.module.scss';

/** Бегущая лента: справа на компьютере (сверху вниз), под шапкой на телефоне */
const RailSettings: React.FC = () => {
    const queryClient = useQueryClient();
    const settings = useSiteSettings();
    const { data: facets } = useFacets();
    const [rail, setRail] = useState<TagRail>(settings.tagRail);
    const [busy, setBusy] = useState(false);

    useEffect(() => setRail(settings.tagRail), [settings.tagRail]);

    const setItem = (i: number, patch: { ru?: string; en?: string; link?: string }) =>
        setRail((r) => ({
            ...r,
            items: r.items.map((it, j) =>
                j === i
                    ? {
                          text: { ru: patch.ru ?? it.text.ru, en: patch.en ?? it.text.en },
                          link: patch.link !== undefined ? patch.link : it.link,
                      }
                    : it,
            ),
        }));

    const move = (i: number, dir: -1 | 1) =>
        setRail((r) => {
            const items = [...r.items];
            const j = i + dir;
            if (j < 0 || j >= items.length) return r;
            [items[i], items[j]] = [items[j], items[i]];
            return { ...r, items };
        });

    const payload: TagRail = { ...rail, items: rail.items.map((it) => ({ text: it.text, link: it.link || null })) };
    const check = tagRailSchema.safeParse(payload);
    const problem = check.success ? null : check.error.issues[0]?.message;

    const done = (data: SiteSettingsDto) => {
        queryClient.setQueryData(['settings'], data);
        void queryClient.invalidateQueries({ queryKey: ['settings'] });
    };

    const save = async () => {
        setBusy(true);
        try {
            done(await api<SiteSettingsDto>('/admin/settings/tagRail', { method: 'PUT', body: payload }));
            toast('лента сохранена');
        } catch (err) {
            toast(errorText(i18n.t, err), 'error');
        } finally {
            setBusy(false);
        }
    };

    const reset = async () => {
        if (!confirm('Вернуть ленту по умолчанию?')) return;
        done(await api<SiteSettingsDto>('/admin/settings/tagRail', { method: 'DELETE' }));
        toast('сброшено');
    };

    return (
        <>
            <div className={styles.titleRow}>
                <h1 className={styles.title}>бегущая лента</h1>
                <div className={styles.actionsRow}>
                    <button className="btn btn--ghost btn--sm" onClick={reset}>
                        по умолчанию
                    </button>
                    <button className="btn" disabled={busy || !!problem} onClick={save}>
                        {busy ? 'сохраняем…' : 'сохранить'}
                    </button>
                </div>
            </div>
            <p className="muted mono" style={{ fontSize: 12, marginTop: -16, marginBottom: 16 }}>
                на компьютере — чёрная полоса справа, бежит сверху вниз; на телефоне — полоса под шапкой.
                ссылка необязательна: /catalog?q=leather или https://…
            </p>
            {problem && <p className="error-text">{problem}</p>}

            <section className="card-box" style={{ background: '#fff', marginBottom: 16 }}>
                <div className={styles.probe}>
                    <label className="check">
                        <input
                            type="checkbox"
                            checked={rail.showProductTags}
                            onChange={(e) => setRail({ ...rail, showProductTags: e.target.checked })}
                        />
                        подмешивать теги товаров ({facets?.tags.length ?? 0}: {facets?.tags.slice(0, 5).map((t) => `#${t}`).join(' ')}…)
                    </label>
                    <label className={styles.inlineField}>
                        круг за, сек
                        <input
                            className="input"
                            type="number"
                            min={10}
                            max={300}
                            value={rail.durationSec}
                            onChange={(e) => setRail({ ...rail, durationSec: Number(e.target.value) })}
                        />
                    </label>
                </div>
            </section>

            <div className={styles.tableWrap}>
                <table className={`${styles.table} ${styles.stackTable}`}>
                    <thead>
                        <tr>
                            <th>🇷🇺 текст</th>
                            <th>🇬🇧 text</th>
                            <th>ссылка</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {rail.items.map((it, i) => (
                            <tr key={i}>
                                <td data-label="🇷🇺 текст">
                                    <input className="input" maxLength={80} value={it.text.ru} onChange={(e) => setItem(i, { ru: e.target.value })} />
                                </td>
                                <td data-label="🇬🇧 text">
                                    <input className="input" maxLength={80} value={it.text.en} onChange={(e) => setItem(i, { en: e.target.value })} />
                                </td>
                                <td data-label="ссылка" className={styles.wide}>
                                    <input
                                        className="input"
                                        placeholder="—"
                                        value={it.link ?? ''}
                                        onChange={(e) => setItem(i, { link: e.target.value })}
                                    />
                                </td>
                                <td className={styles.catActions} style={{ whiteSpace: 'nowrap' }}>
                                    <button className="btn btn--ghost btn--sm" onClick={() => move(i, -1)} disabled={i === 0} title="выше">
                                        <ArrowUp size={14} />
                                    </button>{' '}
                                    <button
                                        className="btn btn--ghost btn--sm"
                                        onClick={() => move(i, 1)}
                                        disabled={i === rail.items.length - 1}
                                        title="ниже"
                                    >
                                        <ArrowDown size={14} />
                                    </button>{' '}
                                    <button
                                        className="btn btn--danger btn--sm"
                                        onClick={() => setRail({ ...rail, items: rail.items.filter((_, j) => j !== i) })}
                                        title="убрать"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                className="btn btn--ghost btn--sm"
                style={{ marginTop: 12 }}
                disabled={rail.items.length >= 40}
                onClick={() => setRail({ ...rail, items: [...rail.items, { text: { ru: '', en: '' }, link: null }] })}
            >
                + фраза
            </button>

            <h2 className={styles.h2} style={{ marginTop: 24 }}>
                превью
            </h2>
            <div className={styles.railPreview}>
                {rail.items.map((it, i) => (
                    <span key={i}>
                        {it.text.ru || '…'}
                        {it.link ? ' ↗' : ''}
                    </span>
                ))}
            </div>
        </>
    );
};

export default RailSettings;
