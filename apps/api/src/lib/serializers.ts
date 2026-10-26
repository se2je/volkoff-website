import type { Prisma, User } from '@prisma/client';
import type { CategoryDto, Locale, OrderDto, ProductDto, UserDto } from '@volkoff/shared';
import { REROLL_COOLDOWN_MS } from '@volkoff/shared';

/** Когда снова можно перегенерировать — или null, если уже можно */
const nextReroll = (at: Date | null) => {
    if (!at) return null;
    const next = at.getTime() + REROLL_COOLDOWN_MS;
    return next > Date.now() ? new Date(next).toISOString() : null;
};

export const toUserDto = (u: User): UserDto => ({
    id: u.id,
    email: u.email,
    nickname: u.nickname,
    avatarSeed: u.avatarSeed,
    role: u.role,
    emailVerified: !!u.emailVerifiedAt,
    locale: (u.locale === 'en' ? 'en' : 'ru') as Locale,
    fullName: u.fullName,
    phone: u.phone,
    createdAt: u.createdAt.toISOString(),
    avatarRerollAt: nextReroll(u.avatarRerolledAt),
    nicknameRerollAt: nextReroll(u.nicknameRerolledAt),
});

export const toCategoryDto = (c: Prisma.CategoryGetPayload<object> & { _count?: { products: number } }): CategoryDto => ({
    id: c.id,
    slug: c.slug,
    name: { ru: c.nameRu, en: c.nameEn },
    sortOrder: c.sortOrder,
    productCount: c._count?.products,
});

export const productInclude = {
    category: true,
    images: { orderBy: { sortOrder: 'asc' } },
    variants: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ProductInclude;

type ProductFull = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export const toProductDto = (p: ProductFull): ProductDto => ({
    id: p.id,
    slug: p.slug,
    code: p.code,
    name: { ru: p.nameRu, en: p.nameEn },
    description: { ru: p.descriptionRu, en: p.descriptionEn },
    priceRub: p.priceRub,
    priceUsd: p.priceUsd,
    category: p.category ? toCategoryDto(p.category) : null,
    tags: p.tags,
    status: p.status,
    isFeatured: p.isFeatured,
    sortOrder: p.sortOrder,
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
    variants: p.variants.map((v) => ({ id: v.id, size: v.size, stock: v.stock })),
    inStock: p.variants.some((v) => v.stock > 0),
    releasedAt: p.releasedAt.toISOString(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
});

export const orderInclude = {
    items: { include: { product: { select: { slug: true } } } },
    payments: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.OrderInclude;

export const adminOrderInclude = {
    ...orderInclude,
    user: { select: { id: true, email: true, nickname: true, avatarSeed: true } },
} satisfies Prisma.OrderInclude;

type OrderFull = Prisma.OrderGetPayload<{ include: typeof orderInclude }> & {
    user?: { id: string; email: string; nickname: string; avatarSeed: string };
};

export const toOrderDto = (o: OrderFull, opts: { admin?: boolean } = {}): OrderDto => ({
    id: o.id,
    number: o.number,
    status: o.status,
    currency: o.currency,
    paymentMethod: o.paymentMethod as OrderDto['paymentMethod'],
    subtotal: o.subtotal,
    shippingCost: o.shippingCost,
    total: o.total,
    fullName: o.fullName,
    phone: o.phone,
    email: o.email,
    country: o.country,
    city: o.city,
    address: o.address,
    postalCode: o.postalCode,
    comment: o.comment,
    trackingNumber: o.trackingNumber,
    expiresAt: o.expiresAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productSlug: i.product?.slug ?? null,
        name: { ru: i.nameRu, en: i.nameEn },
        image: i.image,
        size: i.size,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
    })),
    payments: o.payments.map((p) => ({
        id: p.id,
        provider: p.provider,
        status: p.status,
        amount: p.amount,
        currency: p.currency,
        redirectUrl: p.status === 'PENDING' ? p.redirectUrl : null,
    })),
    ...(opts.admin ? { user: o.user, adminNote: o.adminNote } : {}),
});
