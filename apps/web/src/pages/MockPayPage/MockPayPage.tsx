import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Currency } from '@volkoff/shared';
import { api } from '@/api/client';
import { errorText, useFmt } from '@/lib/format';
import { toast } from '@/store/toast';

interface MockPayment {
    id: string;
    status: string;
    amount: number;
    currency: Currency;
    orderId: string;
    orderNumber: number;
    method: string;
}

/** Страница тестового шлюза. С реальным провайдером сюда никто не попадёт. */
const MockPayPage: React.FC = () => {
    const { id } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { money } = useFmt();
    const [busy, setBusy] = useState(false);
    const { data } = useQuery({ queryKey: ['mock-pay', id], queryFn: () => api<MockPayment>(`/payments/mock/${id}`) });

    const act = async (action: 'succeed' | 'fail') => {
        setBusy(true);
        try {
            await api(`/payments/mock/${id}/${action}`, { method: 'POST' });
            if (action === 'succeed') toast(t('order.paidThanks'), 'acid');
            void queryClient.invalidateQueries({ queryKey: ['order', data?.orderId] });
            void queryClient.invalidateQueries({ queryKey: ['my-orders'] });
            navigate(`/account/orders/${data?.orderId}`, { replace: true });
        } catch (err) {
            toast(errorText(t, err), 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: 520, padding: '4rem 16px' }}>
            <div className="card-box" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <span className="chip" style={{ width: 'fit-content' }}>
                    {t('pay.mockTitle')}
                </span>
                {data ? (
                    <>
                        <div className="mono">
                            {t('pay.order')} #{data.orderNumber} · {data.method}
                        </div>
                        <div className="mono" style={{ fontSize: '2.5rem' }}>
                            {money(data.amount, data.currency)}
                        </div>
                        <p className="muted" style={{ fontSize: 12 }}>
                            {t('pay.mockHint')}
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn--acid" disabled={busy || data.status !== 'PENDING'} onClick={() => act('succeed')}>
                                {t('pay.succeed')}
                            </button>
                            <button className="btn btn--danger" disabled={busy || data.status !== 'PENDING'} onClick={() => act('fail')}>
                                {t('pay.fail')}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="spinner">…</div>
                )}
            </div>
        </div>
    );
};

export default MockPayPage;
