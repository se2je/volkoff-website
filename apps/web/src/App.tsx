import React, { Suspense, lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Layout from './components/Layout/Layout';
import { RequireAdmin, RequireAuth } from './components/Guards';
import ScrollManager from './components/ScrollManager';
import CatalogPage from './pages/CatalogPage/CatalogPage';
import ProductPage from './pages/ProductPage/ProductPage';
import AboutPage from './pages/AboutPage/AboutPage';
import NewsPage from './pages/NewsPage/NewsPage';
import CheckoutPage from './pages/CheckoutPage/CheckoutPage';
import MockPayPage from './pages/MockPayPage/MockPayPage';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, VerifyEmailPage } from './pages/auth/AuthPages';
import AccountPage from './pages/account/AccountPage';
import OrderPage from './pages/account/OrderPage';
import LegalPage from './pages/LegalPage/LegalPage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuth } from './store/auth';
import { usePrefs } from './store/prefs';

// Админка грузится отдельным чанком — покупателям она не нужна
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

const App: React.FC = () => {
  const { i18n } = useTranslation();
  const bootstrap = useAuth((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    // Валюта следует за языком, пока пользователь не выбрал её сам
    const prefs = usePrefs.getState();
    if (!prefs.currencyPinned) prefs.setCurrency(i18n.language.startsWith('en') ? 'USD' : 'RUB', false);
  }, [i18n.language]);

  return (
    <>
    <ScrollManager />
    <Routes>
      <Route path="/admin/*" element={<RequireAdmin><Suspense fallback={<div className="spinner">…</div>}><AdminApp /></Suspense></RequireAdmin>} />
      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="product/:slug" element={<ProductPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="news/:id" element={<NewsPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="pay/mock/:id" element={<RequireAuth><MockPayPage /></RequireAuth>} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="account/orders/:id" element={<RequireAuth><OrderPage /></RequireAuth>} />
        <Route path="legal/:doc" element={<LegalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </>
  );
};

export default App;
