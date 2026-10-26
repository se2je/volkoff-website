import React from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import Avatar from '@/components/Avatar';
import Toasts from '@/components/Layout/Toasts';
import Dashboard from './Dashboard';
import ProductsList from './ProductsList';
import ProductEditor from './ProductEditor';
import Orders from './Orders';
import Categories from './Categories';
import Users from './Users';
import styles from './Admin.module.scss';

const NAV = [
    { to: '/admin', label: 'дашборд', end: true },
    { to: '/admin/products', label: 'товары' },
    { to: '/admin/orders', label: 'заказы' },
    { to: '/admin/categories', label: 'категории' },
    { to: '/admin/users', label: 'люди' },
];

/** Админка. Интерфейс на русском, контент товаров — на двух языках. */
const AdminApp: React.FC = () => {
    const user = useAuth((s) => s.user);
    return (
        <div className={styles.shell}>
            <aside className={styles.side}>
                <Link to="/" className={styles.logo}>
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
                </Routes>
            </main>
            <Toasts />
        </div>
    );
};

export default AdminApp;
