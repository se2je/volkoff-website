import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Currency, Localized, ProductDto } from '@volkoff/shared';

export interface CartLine {
    productId: string;
    slug: string;
    code: string;
    name: Localized;
    image: string | null;
    size: string;
    quantity: number;
    maxQuantity: number;
    priceRub: number;
    priceUsd: number;
}

interface CartState {
    lines: CartLine[];
    open: boolean;
    /** Счётчик «пинков» — чтобы анимировать иконку корзины при добавлении */
    bump: number;
    add: (product: ProductDto, size: string) => void;
    setQuantity: (productId: string, size: string, quantity: number) => void;
    remove: (productId: string, size: string) => void;
    clear: () => void;
    setOpen: (open: boolean) => void;
}

export const useCart = create<CartState>()(
    persist(
        (set) => ({
            lines: [],
            open: false,
            bump: 0,
            add: (product, size) =>
                set((s) => {
                    const variant = product.variants.find((v) => v.size === size);
                    const max = Math.min(variant?.stock ?? 1, 10);
                    const existing = s.lines.find((l) => l.productId === product.id && l.size === size);
                    const lines = existing
                        ? s.lines.map((l) =>
                              l === existing ? { ...l, quantity: Math.min(l.quantity + 1, max), maxQuantity: max } : l,
                          )
                        : [
                              ...s.lines,
                              {
                                  productId: product.id,
                                  slug: product.slug,
                                  code: product.code,
                                  name: product.name,
                                  image: product.images[0]?.url ?? null,
                                  size,
                                  quantity: 1,
                                  maxQuantity: max,
                                  priceRub: product.priceRub,
                                  priceUsd: product.priceUsd,
                              },
                          ];
                    return { lines, bump: s.bump + 1 };
                }),
            setQuantity: (productId, size, quantity) =>
                set((s) => ({
                    lines: s.lines.map((l) =>
                        l.productId === productId && l.size === size
                            ? { ...l, quantity: Math.max(1, Math.min(quantity, l.maxQuantity)) }
                            : l,
                    ),
                })),
            remove: (productId, size) =>
                set((s) => ({ lines: s.lines.filter((l) => !(l.productId === productId && l.size === size)) })),
            clear: () => set({ lines: [] }),
            setOpen: (open) => set({ open }),
        }),
        { name: 'vk-cart', partialize: (s) => ({ lines: s.lines }) },
    ),
);

export const lineTotal = (l: CartLine, currency: Currency) => (currency === 'RUB' ? l.priceRub : l.priceUsd) * l.quantity;
export const cartTotal = (lines: CartLine[], currency: Currency) => lines.reduce((sum, l) => sum + lineTotal(l, currency), 0);
export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
