import { create } from 'zustand';
import type { AuthResponse, UserDto } from '@volkoff/shared';
import { api, refreshSession, setAccessToken, subscribeSession } from '@/api/client';

interface AuthState {
    user: UserDto | null;
    ready: boolean;
    bootstrap: () => Promise<void>;
    setAuth: (auth: AuthResponse) => void;
    setUser: (user: UserDto) => void;
    logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
    user: null,
    ready: false,
    bootstrap: async () => {
        await refreshSession();
        set({ ready: true });
    },
    setAuth: (auth) => {
        setAccessToken(auth.accessToken);
        set({ user: auth.user });
    },
    setUser: (user) => set({ user }),
    logout: async () => {
        try {
            await api('/auth/logout', { method: 'POST' });
        } finally {
            setAccessToken(null);
            set({ user: null });
        }
    },
}));

subscribeSession((auth) => useAuth.setState({ user: auth?.user ?? null }));

// Access-токен живёт 15 минут — обновляем заранее, пока вкладка открыта
setInterval(
    () => {
        if (useAuth.getState().user) void refreshSession();
    },
    12 * 60 * 1000,
);
