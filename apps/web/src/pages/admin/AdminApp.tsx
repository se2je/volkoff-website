import React from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import Avatar from '@/components/Avatar';
import WolfMark from '@/components/WolfMark';
import Toasts from '@/components/Layout/Toasts';
import Dashboard from './Dashboard';
import ProductsList from './ProductsList';
import ProductEditor from './ProductEditor';
import Orders from './Orders';
import Categories from './Categories';
import Users from './Users';
import Content from './Content';
import News from './News';
import CartSettings from './CartSettings';
import RailSettings from './RailSettings';
import HeroSettings from './HeroSettings';
import LegalSettings from './LegalSettings';
import QrPage from './QrPage';
import styles from './Admin.module.scss';

const NAV = [
    { to: '/admin', label: 'дашборд', end: true },
    { to: '/admin/products', label: 'товары' },
    { to: '/admin/orders', label: 'заказы' },
    { to: '/admin/categories', label: 'категории' },
    { to: '/admin/users', label: 'люди' },
    { to: '/admin/hero', label: 'обложка' },
    { to: '/admin/news', label: 'новости' },
    { to: '/admin/content', label: 'тексты' },
    { to: '/admin/rail', label: 'лента' },
    { to: '/admin/cart', label: 'корзина' },
    { to: '/admin/legal', label: 'реквизиты' },
    { to: '/admin/qr', label: 'qr-код' },
];

/** Админка. Интерфейс на русском, контент товаров — на двух языках. */
const AdminApp: React.FC = () => {
    const user = useAuth((s) => s.user);
    return (
        <div className={styles.shell}>
            <aside className={styles.side}>
                <Link to="/" className={styles.logo}>
                    <WolfMark size={20} />
                    VOLKOFF
                    <span>admin</span>
                </Link>
                <nav className={styles.nav}>
                    {NAV.map((n) => (
                        <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? styles.navOn : '')}>
                            {n.label}
                        </NavLink>
                    ))}
                </nav>
                {user && (
                    <div className={styles.me}>
                        <Avatar seed={user.avatarSeed} size={28} />
                        <span>{user.nickname}</span>
                    </div>
                )}
                <Link to="/" className={styles.toSite}>
                    ← на сайт
                </Link>
            </aside>
            <main className={styles.main}>
                <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="products" element={<ProductsList />} />
                    <Route path="products/new" element={<ProductEditor />} />
                    <Route path="products/:id" element={<ProductEditor />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="users" element={<Users />} />
                    <Route path="hero" element={<HeroSettings />} />
                    <Route path="news" element={<News />} />
                    <Route path="content" element={<Content />} />
                    <Route path="rail" element={<RailSettings />} />
                    <Route path="cart" element={<CartSettings />} />
                    <Route path="legal" element={<LegalSettings />} />
                    <Route path="qr" element={<QrPage />} />
                </Routes>
            </main>
            <Toasts />
        </div>
    );
};

export default AdminApp;
