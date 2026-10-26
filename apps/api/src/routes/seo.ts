import type { FastifyInstance } from 'fastify';
import { formatMoney } from '@volkoff/shared';
import { prisma } from '../db';
import { env } from '../env';

// SEO для одностраничного сайта: Telegram / VK / поисковики не выполняют JS,
// поэтому для страниц товаров сервер отдаёт index.html с уже подставленными мета-тегами.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const absolute = (url: string) => (url.startsWith('http') ? url : `${env.WEB_URL}${url}`);

// Шаблон index.html берём у фронта и кэшируем — так не нужно собирать фронт внутрь API
let template: { html: string; at: number } | null = null;
const TEMPLATE_TTL = 5 * 60_000;

const loadTemplate = async (): Promise<string> => {
    if (template && Date.now() - template.at < TEMPLATE_TTL) return template.html;
    const base = env.WEB_INTERNAL_URL || env.WEB_URL;
    const res = await fetch(`${base}/index.html`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) throw new Error(`index.html: HTTP ${res.status}`);
    const html = await res.text();
    template = { html, at: Date.now() };
    return html;
};

interface PageMeta {
    title: string;
    description: string;
    url: string;
    image?: string;
    type?: string;
    extraHead?: string;
}

/** Заменяет title / description / canonical / og / twitter в шаблоне и дописывает extraHead */
const renderPage = (html: string, m: PageMeta): string => {
    const setMeta = (src: string, attr: 'name' | 'property', key: string, value: string) => {
        const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*">`);
        const tag = `<meta ${attr}="${key}" content="${esc(value)}">`;
        return re.test(src) ? src.replace(re, tag) : src.replace('</head>', `    ${tag}\n</head>`);
    };
    let out = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(m.title)}</title>`);
    out = out.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(m.url)}">`);
    out = setMeta(out, 'name', 'description', m.description);
    out = setMeta(out, 'property', 'og:title', m.title);
    out = setMeta(out, 'property', 'og:description', m.description);
    out = setMeta(out, 'property', 'og:url', m.url);
    if (m.type) out = setMeta(out, 'property', 'og:type', m.type);
    if (m.image) {
        out = setMeta(out, 'property', 'og:image', m.image);
        out = setMeta(out, 'name', 'twitter:image', m.image);
        // фото товара не 1200×630 — убираем фиксированные размеры, чтобы соцсети не обрезали криво
        out = out.replace(/\s*<meta property="og:image:(width|height)" content="[^"]*">/g, '');
    }
    if (m.extraHead) out = out.replace('</head>', `${m.extraHead}\n</head>`);
    return out;
};

const shorten = (s: string, max = 160) => {
    const clean = s.replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
};

export default async function seoRoutes(app: FastifyInstance) {
    // Страница товара с мета-тегами. nginx проксирует сюда /product/:slug
    app.get<{ Params: { slug: string } }>('/render/product/:slug', async (req, reply) => {
        const html = await loadTemplate();
        const product = await prisma.product.findFirst({
            where: { slug: req.params.slug, status: { in: ['ACTIVE', 'ARCHIVED'] } },
            include: { images: { orderBy: { sortOrder: 'asc' } }, variants: true, category: true },
        });
        reply.type('text/html; charset=utf-8').header('Cache-Control', 'no-cache');
        if (!product) return reply.code(404).send(html);

        const url = `${env.WEB_URL}/product/${product.slug}`;
        const inStock = product.status === 'ACTIVE' && product.variants.some((v) => v.stock > 0);
        const price = formatMoney(product.priceRub, 'RUB');
        const description = shorten(product.descriptionRu || `${product.nameRu} — ручная работа VOLKOFF. ${price}.`);
        const images = product.images.map((i) => absolute(i.url));

        const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.nameRu,
            sku: product.code,
            description,
            image: images,
            brand: { '@type': 'Brand', name: 'VOLKOFF' },
            category: product.category?.nameRu,
            url,
            offers: {
                '@type': 'Offer',
                url,
                priceCurrency: 'RUB',
                price: (product.priceRub / 100).toFixed(0),
                availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                itemCondition: 'https://schema.org/NewCondition',
            },
        };

        return renderPage(html, {
            title: `${product.nameRu} — ${price} · VOLKOFF`,
            description,
            url,
            image: images[0],
            type: 'product',
            extraHead: [
                `    <meta property="product:price:amount" content="${(product.priceRub / 100).toFixed(0)}">`,
                `    <meta property="product:price:currency" content="RUB">`,
                `    <meta property="product:availability" content="${inStock ? 'in stock' : 'out of stock'}">`,
                // JSON внутри <script>: экранируем «<», чтобы текст описания не закрыл тег
                `    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
            ].join('\n'),
        });
    });

    // Карта сайта: главные страницы + все товары в продаже
    app.get('/sitemap.xml', async (_req, reply) => {
        const products = await prisma.product.findMany({
            where: { status: 'ACTIVE' },
            select: { slug: true, updatedAt: true },
            orderBy: { createdAt: 'desc' },
        });
        const urls = [
            { loc: '/', priority: '1.0' },
            { loc: '/catalog', priority: '0.9' },
            { loc: '/about', priority: '0.5' },
            ...['offer', 'privacy', 'consent', 'cookies'].map((d) => ({ loc: `/legal/${d}`, priority: '0.2' })),
            ...products.map((p) => ({ loc: `/product/${p.slug}`, priority: '0.8', lastmod: p.updatedAt.toISOString().slice(0, 10) })),
        ];
        const body =
            '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            urls
                .map(
                    (u) =>
                        `  <url><loc>${esc(env.WEB_URL + u.loc)}</loc>${'lastmod' in u && u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`,
                )
                .join('\n') +
            '\n</urlset>\n';
        return reply.type('application/xml; charset=utf-8').header('Cache-Control', 'public, max-age=3600').send(body);
    });
}
