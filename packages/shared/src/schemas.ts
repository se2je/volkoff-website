import { z } from 'zod';
import {
    CURRENCIES,
    LOCALES,
    ORDER_STATUSES,
    PASSWORD_MAX,
    PASSWORD_MIN,
    PAYMENT_METHODS,
    PRODUCT_STATUSES,
    ROLES,
} from './constants';

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);
const token = z.string().min(20).max(200);

// ------------------------------------------------------------
// Auth
// ------------------------------------------------------------
export const registerSchema = z.object({
    email,
    password,
    locale: z.enum(LOCALES).default('ru'),
    /** Отдельное согласие на обработку ПДн (152-ФЗ) — обязательно. */
    consent: z.literal(true),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
    email,
    password: z.string().min(1).max(PASSWORD_MAX),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({ token });
export const forgotPasswordSchema = z.object({ email, locale: z.enum(LOCALES).optional() });
export const resetPasswordSchema = z.object({ token, password });

export const updateProfileSchema = z.object({
    fullName: z.string().trim().max(120).nullable().optional(),
    phone: z.string().trim().max(32).nullable().optional(),
    locale: z.enum(LOCALES).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1).max(PASSWORD_MAX),
    newPassword: password,
});

// ------------------------------------------------------------
// Catalog
// ------------------------------------------------------------
export const SORTS = ['new', 'price_asc', 'price_desc', 'manual'] as const;
export type CatalogSort = (typeof SORTS)[number];

export const catalogQuerySchema = z.object({
    category: z.string().trim().max(64).optional(),
    size: z.string().trim().max(32).optional(),
    q: z.string().trim().max(100).optional(),
    currency: z.enum(CURRENCIES).default('RUB'),
    /** min / max — в основных единицах валюты (рубли / доллары) */
    min: z.coerce.number().int().nonnegative().optional(),
    max: z.coerce.number().int().nonnegative().optional(),
    inStock: z
        .enum(['1', '0', 'true', 'false'])
        .transform((v) => v === '1' || v === 'true')
        .optional(),
    sort: z.enum(SORTS).default('new'),
    /** Сид для «по вайбу» — один и тот же сид даёт тот же случайный порядок (назад/вперёд не перемешивает) */
    seed: z.string().trim().max(32).optional(),
});
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

const localizedString = (max: number, required = true) =>
    z.object({
        ru: required ? z.string().trim().min(1).max(max) : z.string().trim().max(max),
        en: required ? z.string().trim().min(1).max(max) : z.string().trim().max(max),
    });

export const productVariantInput = z.object({
    id: z.string().optional(),
    size: z.string().trim().min(1).max(32),
    stock: z.number().int().min(0).max(100000),
});

export const productImageInput = z.object({
    id: z.string().optional(),
    url: z.string().trim().min(1).max(500),
    alt: z.string().trim().max(200).optional().nullable(),
});

export const productUpsertSchema = z.object({
    slug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug: только латиница, цифры и дефисы')
        .max(120)
        .optional(),
    code: z.string().trim().max(16).optional(),
    name: localizedString(160),
    description: localizedString(5000, false),
    /** Цены в минорных единицах (копейки / центы) */
    priceRub: z.number().int().min(0).max(100_000_000_00),
    priceUsd: z.number().int().min(0).max(1_000_000_00),
    categoryId: z.string().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    status: z.enum(PRODUCT_STATUSES).default('DRAFT'),
    isFeatured: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
    /** Дата выхода, YYYY-MM-DD */
    releasedAt: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'дата выхода: ГГГГ-ММ-ДД')
        .optional(),
    images: z.array(productImageInput).max(20).default([]),
    variants: z.array(productVariantInput).max(30).default([]),
});
export type ProductUpsertInput = z.infer<typeof productUpsertSchema>;

export const categoryUpsertSchema = z.object({
    slug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .max(64),
    name: localizedString(80),
    sortOrder: z.number().int().default(0),
});
export type CategoryUpsertInput = z.infer<typeof categoryUpsertSchema>;

// ------------------------------------------------------------
// Orders
// ------------------------------------------------------------
export const shippingSchema = z.object({
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(5).max(32),
    country: z.string().trim().min(2).max(64),
    city: z.string().trim().min(1).max(120),
    address: z.string().trim().min(3).max(300),
    postalCode: z.string().trim().max(16).optional().default(''),
    comment: z.string().trim().max(1000).optional().default(''),
});
export type ShippingInput = z.infer<typeof shippingSchema>;

export const createOrderSchema = z.object({
    items: z
        .array(
            z.object({
                productId: z.string().min(1),
                size: z.string().min(1).max(32),
                quantity: z.number().int().min(1).max(10),
            }),
        )
        .min(1)
        .max(30),
    paymentMethod: z.enum(PAYMENT_METHODS),
    shipping: shippingSchema,
    /** Явное согласие с публичной офертой при оформлении. */
    acceptOffer: z.literal(true),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const adminOrderUpdateSchema = z.object({
    status: z.enum(ORDER_STATUSES).optional(),
    trackingNumber: z.string().trim().max(100).nullable().optional(),
    adminNote: z.string().trim().max(2000).nullable().optional(),
});

export const adminUserUpdateSchema = z.object({
    role: z.enum(ROLES),
});
