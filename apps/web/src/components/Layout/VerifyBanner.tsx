import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/client';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { errorText } from '@/lib/format';
import styles from './Layout.module.scss';

/** Плашка «подтверди почту» для залогиненных, но не подтвердивших */
const VerifyBanner: React.FC = () => {
    const { t } = useTranslation();
    const user = useAuth((s) => s.user);
    const [sent, setSent] = useState(false);
    if (!user || user.emailVerified) return null;

    const resend = async () => {
        try {
            await api('/auth/resend-verification', { method: 'POST' });
            setSent(true);
            toast(t('auth.checkEmail', { email: user.email }));
        } catch (err) {
            toast(errorText(t, err), 'error');
        }
    };

    return (
        <div className={styles.verifyBanner}>
            <span>✉ {t('checkout.needVerify')}</span>
            {!sent && (
                <button onClick={resend} className={styles.verifyBtn}>
                    {t('checkout.resend')}
                </button>
            )}
        </div>
    );
};

export default VerifyBanner;
