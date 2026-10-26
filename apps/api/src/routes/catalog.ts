import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { catalogQuerySchema, compareSizes, hashString, type CatalogFacets } from '@volkoff/shared';
import { prisma } from '../db';
import { notFound } from '../lib/errors';
import { productInclude, toCategoryDto, toProductDto } from '../lib/serializers';
import { parse } from '../plugins/auth';

export default async function catalogRoutes(app: FastifyInstance) {
    app.get('/categories', async () => {
        const categories = await prisma.category.findMany({
            orderBy: { sortOrder: 'asc' },
            include: { _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
        });
        return categories.map(toCategoryDto);
    });

    app.get('/products', async (req) => {
        const q = parse(catalogQuerySchema, req.query);
        const priceField = q.currency === 'RUB' ? 'priceRub' : 'priceUsd';

        const where: Prisma.ProductWhereInput = { status: 'ACTIVE' };
        if (q.category) where.category = { slug: q.category };
        if (q.size || q.inStock) {
            where.variants = {
                some: {
                    ...(q.size ? { size: q.size } : {}),
                    ...(q.inStock ? { stock: { gt: 0 } } : {}),
                },
            };
        }
        if (q.min !== undefined || q.max !== undefined) {
            where[priceField] = {
                ...(q.min !== undefined ? { gte: q.min * 100 } : {}),
                ...(q.max !== undefined ? { lte: q.max * 100 } : {}),
            };
        }
        if (q.q) {
            const term = q.q.replace(/^#/, '');
            where.OR = [
                { nameRu: { contains: term, mode: 'insensitive' } },
                { nameEn: { contains: term, mode: 'insensitive' } },
                { descriptionRu: { contains: term, mode: 'insensitive' } },
                { descriptionEn: { contains: term, mode: 'insensitive' } },
                { tags: { has: term.toLowerCase() } },
                { code: { contains: term } },
            ];
        }

        const orderBy: Prisma.ProductOrderByWithRelationInput[] =
            q.sort === 'price_asc'
                ? [{ [priceField]: 'asc' }]
                : q.sort === 'price_desc'
                  ? [{ [priceField]: 'desc' }]
                  : q.sort === 'new'
                    ? [{ releasedAt: 'desc' }, { createdAt: 'desc' }]
                    : [{ createdAt: 'desc' }];

        const products = await prisma.product.findMany({ where, orderBy, include: productInclude });
        let dtos = products.map(toProductDto);
        if (q.sort === 'manual') {
            // «По вайбу» — случайный порядок, но стабильный для сида: назад из карточки не перемешивает.
            // Закреплённые в админке всё равно сверху.
            const seed = q.seed ?? Math.random().toString(36);
            const rank = new Map(dtos.map((p) => [p.id, hashString(`${seed}:${p.id}`)]));
            dtos = dtos.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || rank.get(a.id)! - rank.get(b.id)!);
        }
        // Распроданное — в конец, но не прячем: витрина «архива» тоже продаёт
        return [...dtos.filter((p) => p.inStock), ...dtos.filter((p) => !p.inStock)];
    });

    app.get('/products/facets', async (): Promise<CatalogFacets> => {
        const [variants, agg, products] = await Promise.all([
            prisma.productVariant.findMany({
                where: { product: { status: 'ACTIVE' } },
                select: { size: true },
                distinct: ['size'],
            }),
            prisma.product.aggregate({
                where: { status: 'ACTIVE' },
                _min: { priceRub: true, priceUsd: true },
                _max: { priceRub: true, priceUsd: true },
            }),
            prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { tags: true } }),
        ]);
        const tagCount = new Map<string, number>();
        for (const p of products) for (const t of p.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
        return {
            sizes: variants.map((v) => v.size).sort(compareSizes),
            tags: [...tagCount.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t),
            priceRange: {
                RUB: [Math.floor((agg._min.priceRub ?? 0) / 100), Math.ceil((agg._max.priceRub ?? 0) / 100)],
                USD: [Math.floor((agg._min.priceUsd ?? 0) / 100), Math.ceil((agg._max.priceUsd ?? 0) / 100)],
            },
        };
    });

    app.get<{ Params: { slug: string } }>('/products/:slug', async (req) => {
        const product = await prisma.product.findFirst({
            where: { slug: req.params.slug, status: { in: ['ACTIVE', 'ARCHIVED'] } },
            include: productInclude,
        });
        if (!product) throw notFound();
        return toProductDto(product);
    });
}
