import React from 'react';
import { Outlet } from 'react-router-dom';
import TagRail, { TagStrip } from './TagRail';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from '../CartDrawer/CartDrawer';
import Toasts from './Toasts';
import CookieBanner from './CookieBanner';
import VerifyBanner from './VerifyBanner';
import WolfGameHost from '../WolfGame/WolfGameHost';

const Layout: React.FC = () => (
    <div className="app">
        <TagRail />
        <Header />
        <TagStrip />
        <VerifyBanner />
        <main>
            <Outlet />
        </main>
        <Footer />
        <CartDrawer />
        <Toasts />
        <CookieBanner />
        <WolfGameHost />
    </div>
);

export default Layout;
