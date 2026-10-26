import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, ready } = useAuth();
    const location = useLocation();
    if (!ready) return <div className="spinner">…</div>;
    if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    return <>{children}</>;
};

export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, ready } = useAuth();
    const location = useLocation();
    if (!ready) return <div className="spinner">…</div>;
    if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
    if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
    return <>{children}</>;
};
