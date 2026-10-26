import type { Currency, Locale, OrderStatus, PaymentMethod, ProductStatus, Role } from './constants';

export interface Localized {
    ru: string;
    en: string;
}

export interface UserDto {
    id: string;
    email: string;
    nickname: string;
    avatarSeed: string;
    role: Role;
    emailVerified: boolean;
    locale: Locale;
    fullName: string | null;
    phone: string | null;
    createdAt: string;
}

export interface AuthResponse {
    accessToken: string;
    user: UserDto;
}

export interface CategoryDto {
    id: string;
    slug: string;
    name: Localized;
    sortOrder: number;
    productCount?: number;
}

export interface ProductImageDto {
    id: string;
    url: string;
    alt: string | null;
}

export interface ProductVariantDto {
    id: string;
    size: string;
    stock: number;
}

export interface ProductDto {
    id: string;
    slug: string;
    code: string;
    name: Localized;
    description: Localized;
    priceRub: number;
    priceUsd: number;
    category: CategoryDto | null;
    tags: string[];
    status: ProductStatus;
    isFeatured: boolean;
    sortOrder: number;
    images: ProductImageDto[];
    variants: ProductVariantDto[];
    inStock: boolean;
    releasedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface CatalogFacets {
    sizes: string[];
    tags: string[];
    priceRange: { RUB: [number, number]; USD: [number, number] };
}

export interface OrderItemDto {
    id: string;
    productId: string | null;
    productSlug: string | null;
    name: Localized;
    image: string | null;
    size: string;
    unitPrice: number;
    quantity: number;
}

export interface PaymentDto {
    id: string;
    provider: string;
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'REFUNDED';
    amount: number;
    currency: Currency;
    redirectUrl: string | null;
}

export interface OrderDto {
    id: string;
    number: number;
    status: OrderStatus;
    currency: Currency;
    paymentMethod: PaymentMethod;
    subtotal: number;
    shippingCost: number;
    total: number;
    fullName: string;
    phone: string;
    email: string;
    country: string;
    city: string;
    address: string;
    postalCode: string;
    comment: string;
    trackingNumber: string | null;
    items: OrderItemDto[];
    payments: PaymentDto[];
    expiresAt: string | null;
    createdAt: string;
    user?: { id: string; email: string; nickname: string; avatarSeed: string };
    adminNote?: string | null;
}

export interface CreateOrderResponse {
    order: OrderDto;
    redirectUrl: string | null;
}

export interface AdminStats {
    users: number;
    products: number;
    ordersByStatus: Partial<Record<OrderStatus, number>>;
    revenue: { RUB: number; USD: number };
    lowStock: { productId: string; name: Localized; size: string; stock: number }[];
}

export interface ApiErrorBody {
    error: string;
    message: string;
    details?: unknown;
}
