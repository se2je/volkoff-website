import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFoundPage: React.FC<{ text?: string }> = ({ text }) => {
    const { t } = useTranslation();
    return (
        <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Norway, sans-serif', fontSize: 'clamp(6rem, 20vw, 14rem)', lineHeight: 0.9 }}>
                {t('notFound.title')}
            </div>
            <p className="mono" style={{ margin: '1.5rem 0' }}>
                {text ?? t('notFound.text')}
            </p>
            <Link to="/catalog" className="btn">
                {t('notFound.home')} →
            </Link>
        </div>
    );
};

export default NotFoundPage;
