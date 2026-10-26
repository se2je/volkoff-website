import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { PASSWORD_MIN, type AuthResponse, type UserDto } from '@volkoff/shared';
import { api, refreshSession } from '@/api/client';
import Avatar from '@/components/Avatar';
import { errorText, toLocale } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import styles from './Auth.module.scss';

const AuthShell: React.FC<{ title: string; children: React.ReactNode; aside?: React.ReactNode }> = ({ title, children, aside }) => (
    <div className={`container ${styles.page}`}>
        <div className={styles.box}>
            <span className="chip">{title}</span>
            {children}
        </div>
        {aside && <div className={styles.aside}>{aside}</div>}
    </div>
);

/** Безопасный редирект после входа — только на свои пути */
const useNext = () => {
    const [params] = useSearchParams();
    const next = params.get('next');
    return next && next.startsWith('/') && !next.startsWith('//') ? next : '/account';
};

export const LoginPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const next = useNext();
    const setAuth = useAuth((s) => s.setAuth);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const auth = await api<AuthResponse>('/auth/login', { body: { email, password } });
            setAuth(auth);
            navigate(next, { replace: true });
        } catch (err) {
            setError(errorText(t, err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthShell title={t('auth.loginTitle')}>
            <form onSubmit={submit} className={styles.form}>
                <label className="field">
                    <span className="field__label">{t('auth.email')}</span>
                    <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="field">
                    <span className="field__label">{t('auth.password')}</span>
                    <input
                        className="input"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </label>
                {error && <div className="error-text">{error}</div>}
                <button className="btn btn--block" disabled={busy}>
                    {t('auth.login')} →
                </button>
            </form>
            <div className={styles.links}>
                <Link to="/forgot-password">{t('auth.forgot')}</Link>
                <span>
                    {t('auth.noAccount')} <Link to={`/register${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`}>{t('auth.register')}</Link>
                </span>
            </div>
        </AuthShell>
    );
};

export const RegisterPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const next = useNext();
    const setAuth = useAuth((s) => s.setAuth);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [consent, setConsent] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    // Превью аватарки, пока заполняешь форму — просто для фана
    const [previewSeed, setPreviewSeed] = useState(() => Math.random().toString(36).slice(2));

    useEffect(() => {
        const id = setInterval(() => setPreviewSeed(Math.random().toString(36).slice(2)), 900);
        return () => clearInterval(id);
    }, []);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!consent) return;
        setBusy(true);
        setError('');
        try {
            const auth = await api<AuthResponse>('/auth/register', {
                body: { email, password, consent: true, locale: toLocale(i18n.language) },
            });
            setAuth(auth);
            toast(t('auth.welcome', { nickname: auth.user.nickname }), 'acid');
            toast(t('auth.checkEmail', { email: auth.user.email }));
            navigate(next, { replace: true });
        } catch (err) {
            setError(errorText(t, err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthShell
            title={t('auth.registerTitle')}
            aside={
                <>
                    <Avatar seed={previewSeed} size={160} />
                    <p className="mono muted">{t('auth.registerPerk')}</p>
                </>
            }
        >
            <form onSubmit={submit} className={styles.form}>
                <label className="field">
                    <span className="field__label">{t('auth.email')}</span>
                    <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="field">
                    <span className="field__label">{t('auth.password')}</span>
                    <input
                        className="input"
                        type="password"
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <span className="field__hint">{t('auth.passwordHint')}</span>
                </label>
                <label className="check">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
                    <span>
                        <Trans
                            i18nKey="auth.consent"
                            components={{
                                consent: <Link to="/legal/consent" target="_blank" />,
                                privacy: <Link to="/legal/privacy" target="_blank" />,
                            }}
                        />
                    </span>
                </label>
                {error && <div className="error-text">{error}</div>}
                <button className="btn btn--acid btn--block" disabled={busy || !consent}>
                    {t('auth.register')} →
                </button>
            </form>
            <div className={styles.links}>
                <span>
                    {t('auth.haveAccount')} <Link to="/login">{t('auth.login')}</Link>
                </span>
            </div>
        </AuthShell>
    );
};

export const VerifyEmailPage: React.FC = () => {
    const { t } = useTranslation();
    const [params] = useSearchParams();
    const token = params.get('token');
    const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');
    const ran = useRef(false);

    useEffect(() => {
        // StrictMode вызывает эффекты дважды — токен одноразовый, второй вызов его «сжёг» бы
        if (ran.current) return;
        ran.current = true;
        if (!token) {
            setState('fail');
            return;
        }
        api<{ ok: boolean; user: UserDto }>('/auth/verify-email', { body: { token } })
            .then(() => {
                setState('ok');
                // Если этот браузер залогинен — обновим пользователя, чтобы пропала плашка «подтверди почту»
                void refreshSession();
            })
            .catch(() => setState('fail'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    return (
        <AuthShell title={t('auth.verifyTitle')}>
            <p className="mono">
                {state === 'loading' && t('auth.verifying')}
                {state === 'ok' && `✓ ${t('auth.verified')}`}
                {state === 'fail' && <span className="error-text">{t('auth.verifyFailed')}</span>}
            </p>
            {state === 'ok' && (
                <Link to="/catalog" className="btn btn--acid">
                    {t('nav.catalog')} →
                </Link>
            )}
        </AuthShell>
    );
};

export const ForgotPasswordPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api('/auth/forgot-password', { body: { email, locale: toLocale(i18n.language) } });
            setSent(true);
        } catch (err) {
            setError(errorText(t, err));
        }
    };

    return (
        <AuthShell title={t('auth.forgotTitle')}>
            {sent ? (
                <p className="mono">✓ {t('auth.forgotSent')}</p>
            ) : (
                <form onSubmit={submit} className={styles.form}>
                    <p className="mono muted">{t('auth.forgotHint')}</p>
                    <label className="field">
                        <span className="field__label">{t('auth.email')}</span>
                        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </label>
                    {error && <div className="error-text">{error}</div>}
                    <button className="btn btn--block">{t('auth.send')} →</button>
                </form>
            )}
        </AuthShell>
    );
};

export const ResetPasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api('/auth/reset-password', { body: { token: params.get('token'), password } });
            toast(t('auth.resetDone'), 'acid');
            navigate('/login', { replace: true });
        } catch (err) {
            setError(errorText(t, err));
        }
    };

    return (
        <AuthShell title={t('auth.resetTitle')}>
            <form onSubmit={submit} className={styles.form}>
                <label className="field">
                    <span className="field__label">{t('auth.password')}</span>
                    <input
                        className="input"
                        type="password"
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <span className="field__hint">{t('auth.passwordHint')}</span>
                </label>
                {error && <div className="error-text">{error}</div>}
                <button className="btn btn--block">{t('auth.save')} →</button>
            </form>
        </AuthShell>
    );
};
