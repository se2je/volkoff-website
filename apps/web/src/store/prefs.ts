import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Currency } from '@volkoff/shared';

interface PrefsState {
    currency: Currency;
    /** Пользователь сам выбрал валюту — тогда смена языка её не трогает */
    currencyPinned: boolean;
    view: 'grid' | 'big';
    setCurrency: (c: Currency, pinned?: boolean) => void;
    setView: (v: 'grid' | 'big') => void;
}

const initialCurrency = (): Currency => {
    try {
        const lang = localStorage.getItem('i18nextLng') ?? navigator.language;
        return lang.startsWith('en') ? 'USD' : 'RUB';
    } catch {
        return 'RUB';
    }
};

export const usePrefs = create<PrefsState>()(
    persist(
        (set) => ({
            currency: initialCurrency(),
            currencyPinned: false,
            view: 'grid',
            setCurrency: (currency, pinned = true) => set((s) => ({ currency, currencyPinned: pinned || s.currencyPinned })),
            setView: (view) => set({ view }),
        }),
        { name: 'vk-prefs' },
    ),
);
