import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LEGAL_FIELDS, legalSchema, type LegalInfo, type SiteSettingsDto } from '@volkoff/shared';
import { api } from '@/api/client';
import { useSiteSettings } from '@/api/queries';
import { errorText } from '@/lib/format';
import { toast } from '@/store/toast';
import i18n from '@/i18n';
import styles from './Admin.module.scss';

/** Реквизиты продавца для оферты, политики и согласий */
const LegalSettings: React.FC = () => {
    const queryClient = useQueryClient();
    const settings = useSiteSettings();
    const [legal, setLegal] = useState<LegalInfo>(settings.legal);
    const [busy, setBusy] = useState(false);

    useEffect(() => setLegal(settings.legal), [settings.legal]);

    const check = legalSchema.safeParse(legal);
    const problem = check.success ? null : check.error.issues[0]?.message;
    const empty = LEGAL_FIELDS.filter((f) => !legal[f.key]?.trim()).length;

    const save = async () => {
        setBusy(true);
        try {
            const data = await api<SiteSettingsDto>('/admin/settings/legal', { method: 'PUT', body: legal });
            queryClient.setQueryData(['settings'], data);
            toast('реквизиты сохранены — документы обновились');
        } catch (err) {
            toast(errorText(i18n.t, err), 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className={styles.titleRow}>
                <h1 className={styles.title}>реквизиты для документов</h1>
                <button className="btn" disabled={busy || !!problem} onClick={save}>
                    {busy ? 'сохраняем…' : 'сохранить'}
                </button>
            </div>
            {problem && <p className="error-text">{problem}</p>}
            <p className="muted mono" style={{ fontSize: 12, marginBottom: 16 }}>
                подставляются в <Link to="/legal/offer">оферту</Link>, <Link to="/legal/privacy">политику</Link>,{' '}
                <Link to="/legal/consent">согласие</Link> и <Link to="/legal/cookies">cookies</Link>.{' '}
                {empty > 0 ? `не заполнено: ${empty} — на сайте там видно «[заполнить: …]»` : 'всё заполнено'}
            </p>

            <section className="card-box" style={{ background: '#fff' }}>
                <div className={styles.legalGrid}>
                    {LEGAL_FIELDS.map((f) => (
                        <label key={f.key} className="field">
                            <span className="field__label">{f.label}</span>
                            <input
                                className="input"
                                maxLength={500}
                                placeholder={f.hint}
                                value={legal[f.key] ?? ''}
                                onChange={(e) => setLegal((l) => ({ ...l, [f.key]: e.target.value }))}
                            />
                        </label>
                    ))}
                </div>
            </section>
        </>
    );
};

export default LegalSettings;
