import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import {
    adminOrderUpdateSchema,
    adminUserUpdateSchema,
    categoryUpsertSchema,
    ORDER_STATUSES,
    productUpsertSchema,
    type AdminStats,
    type Locale,
    type OrderStatus,
    type ProductUpsertInput,
} from '@volkoff/shared';
import { prisma } from '../../db';
import { env } from '../../env';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { adminOrderInclude, productInclude, toCategoryDto, toOrderDto, toProductDto, toUserDto } from '../../lib/serializers';
import { enqueueMail } from '../../mail/outbox';
import { orderShippedTemplate } from '../../mail/templates';
import { parse, requireAdmin } from '../../plugins/auth';
import { cancelOrder } from '../orders';
import { getProvider } from '../../payments';

export const slugify = (s: string) =>
    s
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100) || 'item';

const uniqueSlug = async (base: string, excludeId?: string) => {
    let slug = base;
    for (let i = 2; ; i++) {
        const found = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
        if (!found || found.id === excludeId) return slug;
        slug = `${base}-${i}`;
    }
};

const nextCode = async () => {
    const codes = await prisma.product.findMany({ select: { code: true } });
    const max = codes.reduce((m, { code }) => Math.max(m, Number(code.match(/(\d+)$/)?.[1] ?? 0)), 0);
    return `VK-${String(max + 1).padStart(3, '0')}`;
};

const productData = (input: ProductUpsertInput) => ({
    nameRu: input.name.ru,
    nameEn: input.name.en,
    descriptionRu: input.description.ru,
    descriptionEn: input.description.en,
    priceRub: input.priceRub,
    priceUsd: input.priceUsd,
    categoryId: input.categoryId || null,
    tags: [...new Set(input.tags.map((t) => t.replace(/^#/, '').toLowerCase()))],
    status: input.status,
    isFeatured: input.isFeatured,
    sortOrder: input.sortOrder,
    // полдень UTC — чтобы в любом часовом поясе дата читалась тем же днём
    ...(input.releasedAt ? { releasedAt: new Date(`${input.releasedAt}T12:00:00Z`) } : {}),
});

/** Картинки пересоздаём в нужном порядке, варианты — апсертим по размеру (чтобы не терять ссылки из заказов). */
const syncChildren = async (tx: Prisma.TransactionClient, productId: string, input: ProductUpsertInput) => {
    await tx.productImage.deleteMany({ where: { productId } });
    if (input.images.length) {
        await tx.productImage.createMany({
            data: input.images.map((img, i) => ({ productId, url: img.url, alt: img.alt ?? null, sortOrder: i })),
        });
    }
    const sizes = input.variants.map((v) => v.size);
    if (new Set(sizes).size !== sizes.length) throw badRequest('DUPLICATE_SIZE');
    await tx.productVariant.deleteMany({ where: { productId, size: { notIn: sizes } } });
    for (const [i, v] of input.variants.entries()) {
        await tx.productVariant.upsert({
            where: { productId_size: { productId, size: v.size } },
            create: { productId, size: v.size, stock: v.stock, sortOrder: i },
            update: { stock: v.stock, sortOrder: i },
        });
    }
};

// Проверяем сигнатуру файла, а не только расширение/MIME из запроса
const detectImage = (buf: Buffer): string | null => {
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
    if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
    if (buf.subarray(4, 12).toString() === 'ftypavif') return 'avif';
    return null;
};

export default async function adminRoutes(app: FastifyInstance) {
    app.addHook('preHandler', requireAdmin);

    // ---------------- Stats ----------------
    app.get('/stats', async (): Promise<AdminStats> => {
        const [users, products, byStatus, revenue, lowStock] = await Promise.all([
            prisma.user.count(),
            prisma.product.count({ where: { status: { not: 'ARCHIVED' } } }),
            prisma.order.groupBy({ by: ['status'], _count: true }),
            prisma.order.groupBy({
                by: ['currency'],
                where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
                _sum: { total: true },
            }),
            prisma.productVariant.findMany({
                where: { stock: 0, product: { status: 'ACTIVE' } },
                include: { product: { select: { id: true, nameRu: true, nameEn: true } } },
                take: 20,
                orderBy: { stock: 'asc' },
            }),
        ]);
        return {
            users,
            products,
            ordersByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
            revenue: {
                RUB: revenue.find((r) => r.currency === 'RUB')?._sum.total ?? 0,
                USD: revenue.find((r) => r.currency === 'USD')?._sum.total ?? 0,
            },
            lowStock: lowStock.map((v) => ({
                productId: v.product.id,
                name: { ru: v.product.nameRu, en: v.product.nameEn },
                size: v.size,
                stock: v.stock,
            })),
        };
    });

    // ---------------- Products ----------------
    app.get('/products', async () => {
        const products = await prisma.product.findMany({
            include: productInclude,
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        });
        return products.map(toProductDto);
    });

    app.get<{ Params: { id: string } }>('/products/:id', async (req) => {
        const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: productInclude });
        if (!product) throw notFound();
        return toProductDto(product);
    });

    app.post('/products', async (req, reply) => {
        const input = parse(productUpsertSchema, req.body);
        const slug = await uniqueSlug(input.slug || slugify(input.name.en));
        const code = input.code || (await nextCode());
        if (await prisma.product.findUnique({ where: { code } })) throw conflict('CODE_TAKEN');
        const product = await prisma.$transaction(async (tx) => {
            const created = await tx.product.create({ data: { ...productData(input), slug, code } });
            await syncChildren(tx, created.id, input);
            return tx.product.findUniqueOrThrow({ where: { id: created.id }, include: productInclude });
        });
        reply.code(201);
        return toProductDto(product);
    });

    app.put<{ Params: { id: string } }>('/products/:id', async (req) => {
        const input = parse(productUpsertSchema, req.body);
        const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
        if (!existing) throw notFound();
        const slug = input.slug ? await uniqueSlug(input.slug, existing.id) : existing.slug;
        const code = input.code || existing.code;
        const codeOwner = await prisma.product.findUnique({ where: { code }, select: { id: true } });
        if (codeOwner && codeOwner.id !== existing.id) throw conflict('CODE_TAKEN');
        const product = await prisma.$transaction(async (tx) => {
            await tx.product.update({ where: { id: existing.id }, data: { ...productData(input), slug, code } });
            await syncChildren(tx, existing.id, input);
            return tx.product.findUniqueOrThrow({ where: { id: existing.id }, include: productInclude });
        });
        return toProductDto(product);
    });

    // Товар с заказами не удаляем, а архивируем — чтобы история заказов не ломалась
    app.delete<{ Params: { id: string } }>('/products/:id', async (req) => {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: { _count: { select: { orderItems: true } } },
        });
        if (!product) throw notFound();
        if (product._count.orderItems > 0) {
            await prisma.product.update({ where: { id: product.id }, data: { status: 'ARCHIVED' } });
            return { ok: true, archived: true };
        }
        await prisma.product.delete({ where: { id: product.id } });
        return { ok: true, archived: false };
    });

    // ---------------- Uploads ----------------
    app.post('/uploads', async (req) => {
        const file = await req.file({ limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
        if (!file) throw badRequest('NO_FILE');
        const buf = await file.toBuffer();
        if (file.file.truncated) throw badRequest('FILE_TOO_LARGE');
        const ext = detectImage(buf);
        if (!ext) throw badRequest('UNSUPPORTED_IMAGE', 'Only png / jpg / webp / avif');
        const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${ext}`;
        const dir = path.resolve(env.UPLOADS_DIR, 'products');
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, name), buf);
        return { url: `/uploads/products/${name}` };
    });

    // ---------------- Categories ----------------
    app.get('/categories', async () => {
        const categories = await prisma.category.findMany({
            orderBy: { sortOrder: 'asc' },
            include: { _count: { select: { products: true } } },
        });
        return categories.map(toCategoryDto);
    });

    app.post('/categories', async (req, reply) => {
        const input = parse(categoryUpsertSchema, req.body);
        try {
            const c = await prisma.category.create({
                data: { slug: input.slug, nameRu: input.name.ru, nameEn: input.name.en, sortOrder: input.sortOrder },
            });
            reply.code(201);
            return toCategoryDto(c);
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw conflict('SLUG_TAKEN');
            throw err;
        }
    });

    app.put<{ Params: { id: string } }>('/categories/:id', async (req) => {
        const input = parse(categoryUpsertSchema, req.body);
        const c = await prisma.category.update({
            where: { id: req.params.id },
            data: { slug: input.slug, nameRu: input.name.ru, nameEn: input.name.en, sortOrder: input.sortOrder },
        });
        return toCategoryDto(c);
    });

    app.delete<{ Params: { id: string } }>('/categories/:id', async (req) => {
        await prisma.category.delete({ where: { id: req.params.id } });
        return { ok: true };
    });

    // ---------------- Orders ----------------
    app.get<{ Querystring: { status?: string } }>('/orders', async (req) => {
        const status = ORDER_STATUSES.includes(req.query.status as OrderStatus) ? (req.query.status as OrderStatus) : undefined;
        const orders = await prisma.order.findMany({
            where: status ? { status } : undefined,
            include: adminOrderInclude,
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        return orders.map((o) => toOrderDto(o, { admin: true }));
    });

    app.patch<{ Params: { id: string } }>('/orders/:id', async (req) => {
        const input = parse(adminOrderUpdateSchema, req.body);
        const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { user: true } });
        if (!order) throw notFound();

        if (input.status === 'CANCELLED' || input.status === 'REFUNDED') {
            // Если заказ был оплачен через провайдера с API возврата — возвращаем деньги автоматически
            const paid = await prisma.payment.findFirst({ where: { orderId: order.id, status: 'SUCCEEDED' } });
            const provider = paid ? getProvider(paid.provider) : undefined;
            if (paid?.providerPaymentId && provider?.refund) {
                const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
                await provider.refund({
                    providerPaymentId: paid.providerPaymentId,
                    amount: paid.amount,
                    items: items.map((i) => ({ name: i.nameRu, unitPrice: i.unitPrice, quantity: i.quantity })),
                    shippingCost: order.shippingCost,
                    customerEmail: order.email,
                });
                await prisma.payment.update({ where: { id: paid.id }, data: { status: 'REFUNDED' } });
            }
            // Возвращаем товар на склад
            await cancelOrder(order.id, paid ? 'REFUNDED' : input.status);
        } else if (input.status) {
            await prisma.order.update({ where: { id: order.id }, data: { status: input.status, expiresAt: null } });
        }
        await prisma.order.update({
            where: { id: order.id },
            data: { trackingNumber: input.trackingNumber, adminNote: input.adminNote },
        });

        if (input.status === 'SHIPPED' && order.status !== 'SHIPPED') {
            await enqueueMail({
                to: order.email,
                ...orderShippedTemplate(
                    order.user.locale as Locale,
                    order.number,
                    input.trackingNumber ?? order.trackingNumber,
                    `${env.WEB_URL}/account/orders/${order.id}`,
                ),
            });
        }
        const full = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: adminOrderInclude });
        return toOrderDto(full, { admin: true });
    });

    // ---------------- Users ----------------
    app.get<{ Querystring: { q?: string } }>('/users', async (req) => {
        const q = req.query.q?.trim();
        const users = await prisma.user.findMany({
            where: q
                ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { nickname: { contains: q, mode: 'insensitive' } }] }
                : undefined,
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                _count: { select: { orders: true } },
                // для подсказки в админке: куда доставляли последний раз и когда заходил
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { fullName: true, phone: true, country: true, city: true, address: true, postalCode: true },
                },
                sessions: { orderBy: { lastUsedAt: 'desc' }, take: 1, select: { lastUsedAt: true } },
            },
        });
        return users.map(({ orders, sessions, _count, ...u }) => ({
            ...toUserDto(u),
            orderCount: _count.orders,
            lastShipping: orders[0] ?? null,
            lastSeenAt: sessions[0]?.lastUsedAt.toISOString() ?? null,
        }));
    });

    app.patch<{ Params: { id: string } }>('/users/:id', async (req) => {
        const input = parse(adminUserUpdateSchema, req.body);
        if (req.params.id === req.auth!.sub && input.role !== 'ADMIN') throw badRequest('CANNOT_DEMOTE_SELF');
        const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: input.role } });
        return toUserDto(user);
    });
}
