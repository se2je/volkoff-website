import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cartMoodsSchema, getCartMood, type CartMoodLevel, type SiteSettingsDto } from '@volkoff/shared';
import { api } from '@/api/client';
import { useSiteSettings } from '@/api/queries';
import MoodFace from '@/components/MoodFace';
import { errorText } from '@/lib/format';
import { toast } from '@/store/toast';
import i18n from '@/i18n';
import styles from './Admin.module.scss';

/** Рожицы корзины: с какой суммы какая включается и что пишется рядом */
const CartSettings: React.FC = () => {
    const queryClient = useQueryClient();
    const settings = useSiteSettings();
    const [levels, setLevels] = useState<CartMoodLevel[]>(settings.cartMoods);
    const [busy, setBusy] = useState(false);
    const [probe, setProbe] = useState({ rub: 25000, usd: 300 });

    useEffect(() => setLevels(settings.cartMoods), [settings.cartMoods]);

    const set = (i: number, patch: Partial<CartMoodLevel>) =>
        setLevels((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch, label: { ...l.label, ...(patch.label ?? {}) } } : l)));

    const check = cartMoodsSchema.safeParse(levels);
    const problem = check.success ? null : check.error.issues[0]?.message;

    const done = (data: SiteSettingsDto) => {
        queryClient.setQueryData(['settings'], data);
        void queryClient.invalidateQueries({ queryKey: ['settings'] });
    };

    const save = async () => {
        setBusy(true);
        try {
            done(await api<SiteSettingsDto>('/admin/settings/cartMoods', { method: 'PUT', body: levels }));
            toast('рожицы сохранены');
        } catch (err) {
            toast(errorText(i18n.t, err), 'error');
        } finally {
            setBusy(false);
        }
    };

    const reset = async () => {
        if (!confirm('Вернуть пороги и подписи по умолчанию?')) return;
        done(await api<SiteSettingsDto>('/admin/settings/cartMoods', { method: 'DELETE' }));
        toast('сброшено');
    };

    const rubMood = getCartMood(probe.rub * 100, 'RUB', levels);
    const usdMood = getCartMood(probe.usd * 100, 'USD', levels);

    return (
        <>
            <div className={styles.titleRow}>
                <h1 className={styles.title}>рожицы корзины</h1>
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
                рожица включается, когда сумма в корзине ≥ порога. первая — пустая корзина (порог всегда 0).
            </p>
            {problem && <p className="error-text">{problem}</p>}

            <div className={styles.tableWrap}>
                <table className={`${styles.table} ${styles.stackTable}`}>
                    <thead>
                        <tr>
                            <th />
                            <th>от, ₽</th>
                            <th>от, $</th>
                            <th>🇷🇺 подпись</th>
                            <th>🇬🇧 label</th>
                        </tr>
                    </thead>
                    <tbody>
                        {levels.map((lv, i) => (
                            <tr key={lv.key}>
                                <td className={styles.wide}>
                                    <MoodFace mood={lv.key} size={28} />
                                </td>
                                <td data-label="от, ₽">
                                    <input
                                        className="input"
                                        type="number"
                                        min={0}
                                        disabled={i === 0}
                                        value={lv.rub}
                                        onChange={(e) => set(i, { rub: Number(e.target.value) })}
                                    />
                                </td>
                                <td data-label="от, $">
                                    <input
                                        className="input"
                                        type="number"
                                        min={0}
                                        disabled={i === 0}
                                        value={lv.usd}
                                        onChange={(e) => set(i, { usd: Number(e.target.value) })}
                                    />
                                </td>
                                <td data-label="🇷🇺 подпись">
                                    <input
                                        className="input"
                                        maxLength={60}
                                        value={lv.label.ru}
                                        onChange={(e) => set(i, { label: { ...lv.label, ru: e.target.value } })}
                                    />
                                </td>
                                <td data-label="🇬🇧 label">
                                    <input
                                        className="input"
                                        maxLength={60}
                                        value={lv.label.en}
                                        onChange={(e) => set(i, { label: { ...lv.label, en: e.target.value } })}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <section className="card-box" style={{ marginTop: 24, background: '#fff' }}>
                <h2 className={styles.h2}>проверить</h2>
                <div className={styles.probe}>
                    <label className={styles.inlineField}>
                        в корзине, ₽
                        <input className="input" type="number" value={probe.rub} onChange={(e) => setProbe({ ...probe, rub: Number(e.target.value) })} />
                    </label>
                    <span className={styles.probeResult}>
                        <MoodFace mood={rubMood.key} size={22} /> {rubMood.label.ru}
                    </span>
                    <label className={styles.inlineField}>
                        в корзине, $
                        <input className="input" type="number" value={probe.usd} onChange={(e) => setProbe({ ...probe, usd: Number(e.target.value) })} />
                    </label>
                    <span className={styles.probeResult}>
                        <MoodFace mood={usdMood.key} size={22} /> {usdMood.label.en}
                    </span>
                </div>
            </section>
        </>
    );
};

export default CartSettings;
