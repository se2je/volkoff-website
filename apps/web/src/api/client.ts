import type { ApiErrorBody, AuthResponse } from '@volkoff/shared';

export class ApiError extends Error {
    constructor(
        public status: number,
        public code: string,
        message: string,
        public details?: unknown,
    ) {
        super(message);
    }
}

// Access-токен живёт только в памяти (не в localStorage) — XSS не утащит его надолго.
// Refresh-токен — в httpOnly cookie, JS его не видит.
let accessToken: string | null = null;
let onSessionChange: ((auth: AuthResponse | null) => void) | null = null;

export const setAccessToken = (token: string | null) => {
    accessToken = token;
};
export const subscribeSession = (fn: (auth: AuthResponse | null) => void) => {
    onSessionChange = fn;
};

let refreshing: Promise<AuthResponse | null> | null = null;

export const refreshSession = (): Promise<AuthResponse | null> => {
    refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
        .then(async (res) => {
            if (!res.ok) return null;
            return (await res.json()) as AuthResponse;
        })
        .catch(() => null)
        .then((auth) => {
            accessToken = auth?.accessToken ?? null;
            onSessionChange?.(auth);
            return auth;
        })
        .finally(() => {
            refreshing = null;
        });
    return refreshing;
};

interface RequestOptions {
    method?: string;
    body?: unknown;
    form?: FormData;
    query?: Record<string, string | number | boolean | undefined | null>;
}

export const api = async <T>(path: string, opts: RequestOptions = {}, retried = false): Promise<T> => {
    let url = `/api${path}`;
    if (opts.query) {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(opts.query)) {
            if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
        }
        const qs = params.toString();
        if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
        method: opts.method ?? (opts.body !== undefined || opts.form ? 'POST' : 'GET'),
        headers,
        credentials: 'include',
        body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });

    // Протух access-токен — пробуем тихо обновить сессию и повторить запрос
    if (res.status === 401 && !retried && accessToken && !path.startsWith('/auth/')) {
        const refreshed = await refreshSession();
        if (refreshed) return api<T>(path, opts, true);
    }

    if (!res.ok) {
        let body: Partial<ApiErrorBody> = {};
        try {
            body = await res.json();
        } catch {
            /* пустое тело */
        }
        throw new ApiError(res.status, body.error ?? 'HTTP_ERROR', body.message ?? res.statusText, body.details);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
};
