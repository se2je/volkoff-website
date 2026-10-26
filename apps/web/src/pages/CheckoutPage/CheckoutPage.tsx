import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
    PAYMENT_METHOD_CURRENCY,
    PAYMENT_METHODS,
    type CreateOrderResponse,
    type PaymentMethod,
    type ShippingInput,
} from '@volkoff/shared';
import { api, ApiError } from '@/api/client';
import { RESERVATION_MINUTES } from '@/config/site';
import { errorText, useFmt } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { cartTotal, lineTotal, useCart } from '@/store/cart';
import { usePrefs } from '@/store/prefs';
import { toast } from '@/store/toast';
import styles from './CheckoutPage.module.scss';

const isRussia = (country: string) => /^(ru|rus|russia|россия|рф)$/i.test(country.trim());

const CheckoutPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { l, money, locale } = useFmt();
    const user = useAuth((s) => s.user);
    const ready = useAuth((s) => s.ready);
    const { lines, clear } = useCart();
    const prefCurrency = usePrefs((s) => s.currency);

    const [method, setMethod] = useState<PaymentMethod>(prefCurrency === 'RUB' ? 'card_rub' : 'card_intl');
    const [accept, setAccept] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [shipping, setShipping] = useState<ShippingInput>({
        fullName: '',
        phone: '',
        country: locale === 'ru' ? 'Россия' : '',
        city: '',
        address: '',
        postalCode: '',
        comment: '',
    });

    useEffect(() => {
        if (user) setShipping((s) => ({ ...s, fullName: s.fullName || user.fullName || '', phone: s.phone || user.phone || '' }));
    }, [user]);

    const currency = PAYMENT_METHOD_CURRENCY[method];
    const subtotal = cartTotal(lines, currency);
    // Та же формула, что на бэке — итог всё равно пересчитывается сервером
    const shippingCost = useMemo(() => {
        if (isRussia(shipping.country)) return 0;
        return currency === 'RUB' ? 3000_00 : 35_00;
    }, [currency, shipping.country]);

    const set = (k: keyof ShippingInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setShipping((s) => ({ ...s, [k]: e.target.value }));

    if (!ready) return <div className="spinner">…</div>;

    if (lines.length === 0) {
        return (
            <div className={`container ${styles.page}`}>
                <h1 className="page-title">{t('checkout.title')}</h1>
                <p className="mono">{t('checkout.empty')}</p>
                <Link to="/catalog" className="btn">
                    {t('cart.toCatalog')}
                </Link>
            </div>
        );
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const res = await api<CreateOrderResponse>('/orders', {
                body: {
                    items: lines.map((line) => ({ productId: line.productId, size: line.size, quantity: line.quantity })),
                    paymentMethod: method,
                    shipping,
                    acceptOffer: true,
                },
            });
            clear();
            void queryClient.invalidateQueries({ queryKey: ['products'] });
            void queryClient.invalidateQueries({ queryKey: ['my-orders'] });
            if (res.redirectUrl) {
                const url = new URL(res.redirectUrl, window.location.origin);
                // Внутренний (mock) — роутером, внешний шлюз — полноценный переход
                if (url.origin === window.location.origin) navigate(url.pathname);
                else window.location.href = res.redirectUrl;
            } else {
                navigate(`/account/orders/${res.order.id}`);
            }
        } catch (err) {
            setError(errorText(t, err));
            if (err instanceof ApiError && err.code === 'OUT_OF_STOCK') toast(errorText(t, err), 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={`container ${styles.page}`}>
            <h1 className="page-title">{t('checkout.title')}</h1>

            {!user && (
                <div className={styles.gate}>
                    <p>{t('checkout.needLogin')}</p>
                    <div className={styles.gateBtns}>
                        <Link to="/login?next=/checkout" className="btn">
                            {t('auth.login')}
                        </Link>
                        <Link to="/register?next=/checkout" className="btn btn--acid">
                            {t('auth.register')}
                        </Link>
                    </div>
                </div>
            )}

            <form className={styles.layout} onSubmit={submit}>
                <fieldset className={styles.col} disabled={!user || !user.emailVerified}>
                    <section className="card-box">
                        <h2 className={styles.h}>{t('checkout.shipping')}</h2>
                        <div className={styles.fields}>
                            <label className="field">
                                <span className="field__label">{t('checkout.fullName')}</span>
                                <input className="input" required minLength={2} autoComplete="name" value={shipping.fullName} onChange={set('fullName')} />
                            </label>
                            <label className="field">
                                <span className="field__label">{t('checkout.phone')}</span>
                                <input className="input" required type="tel" autoComplete="tel" value={shipping.phone} onChange={set('phone')} />
                            </label>
                            <label className="field">
                                <span className="field__label">{t('checkout.country')}</span>
                                <input className="input" required autoComplete="country-name" value={shipping.country} onChange={set('country')} />
                            </label>
                            <label className="field">
                                <span className="field__label">{t('checkout.city')}</span>
                                <input className="input" required autoComplete="address-level2" value={shipping.city} onChange={set('city')} />
                            </label>
                            <label className={`field ${styles.wide}`}>
                                <span className="field__label">{t('checkout.address')}</span>
                                <input className="input" required minLength={3} autoComplete="street-address" value={shipping.address} onChange={set('address')} />
                            </label>
                            <label className="field">
                                <span className="field__label">{t('checkout.postalCode')}</span>
                                <input className="input" autoComplete="postal-code" value={shipping.postalCode} onChange={set('postalCode')} />
                            </label>
                            <label className={`field ${styles.wide}`}>
                                <span className="field__label">{t('checkout.comment')}</span>
                                <textarea className="input" rows={3} value={shipping.comment} onChange={set('comment')} />
                            </label>
                        </div>
                    </section>

                    <section className="card-box">
                        <h2 className={styles.h}>{t('checkout.payment')}</h2>
                        <div className={styles.methods}>
                            {PAYMENT_METHODS.map((m) => (
                                <label key={m} className={`${styles.method} ${method === m ? styles.methodOn : ''}`}>
                                    <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} />
                                    <span className={styles.methodName}>
                                        {t(`checkout.methods.${m}`)} <b>{PAYMENT_METHOD_CURRENCY[m] === 'RUB' ? '₽' : '$'}</b>
                                    </span>
                                    <span className={styles.methodHint}>{t(`checkout.methods.${m}_hint`)}</span>
                                </label>
                            ))}
                        </div>
                    </section>
                </fieldset>

                <aside className={`card-box ${styles.summary}`}>
                    <ul className={styles.items}>
                        {lines.map((line) => (
                            <li key={`${line.productId}-${line.size}`}>
                                {line.image && <img src={line.image} alt="" />}
                                <span className={styles.itemName}>
                                    {l(line.name)} <span className="muted">· {line.size} ×{line.quantity}</span>
                                </span>
                                <span className="mono">{money(lineTotal(line, currency), currency)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className={styles.row}>
                        <span>{t('checkout.subtotal')}</span>
                        <span>{money(subtotal, currency)}</span>
                    </div>
                    <div className={styles.row}>
                        <span>{t('checkout.shippingCost')}</span>
                        <span>{shippingCost ? money(shippingCost, currency) : t('checkout.free')}</span>
                    </div>
                    <div className={`${styles.row} ${styles.total}`}>
                        <span>{t('checkout.total')}</span>
                        <span>{money(subtotal + shippingCost, currency)}</span>
                    </div>

                    <label className="check">
                        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} required />
                        <span>
                            <Trans i18nKey="checkout.acceptOffer" components={{ offer: <Link to="/legal/offer" target="_blank" /> }} />
                        </span>
                    </label>
                    {error && <div className="error-text">{error}</div>}
                    <button className="btn btn--acid btn--block" disabled={busy || !accept || !user?.emailVerified}>
                        {t('checkout.submit')} →
                    </button>
                    <p className="muted mono" style={{ fontSize: 11, margin: 0 }}>
                        {t('checkout.reservation', { minutes: RESERVATION_MINUTES })}
                    </p>
                </aside>
            </form>
        </div>
    );
};

export default CheckoutPage;
