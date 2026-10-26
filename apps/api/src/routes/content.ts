import type { FastifyInstance } from 'fastify';
import type { News, SiteContent } from '@prisma/client';
import {
    CONTENT_KEYS,
    DEFAULT_SETTINGS,
    SETTINGS_SCHEMAS,
    type SettingKey,
    type SiteSettingsDto,
    contentUpdateSchema,
    newsUpsertSchema,
    type ContentKey,
    type NewsDto,
    type NewsUpsertInput,
    type PackDto,
    type SiteContentDto,
} from '@volkoff/shared';
import { prisma } from '../db';
import { badRequest, notFound } from '../lib/errors';
import { parse, requireAdmin } from '../plugins/auth';

const toContentDto = (rows: SiteContent[]): SiteContentDto =>
    Object.fromEntries(
        rows.filter((r) => (CONTENT_KEYS as readonly string[]).includes(r.key)).map((r) => [r.key, { ru: r.ru, en: r.en }]),
    );

const toNewsDto = (n: News): NewsDto => ({
    id: n.id,
    title: { ru: n.titleRu, en: n.titleEn },
    text: { ru: n.textRu, en: n.textEn },
    imageUrl: n.imageUrl,
    linkUrl: n.linkUrl,
    linkLabel: { ru: n.linkLabelRu, en: n.linkLabelEn },
    isActive: n.isActive,
    sortOrder: n.sortOrder,
    createdAt: n.createdAt.toISOString(),
});

const newsData = (input: NewsUpsertInput) => ({
    titleRu: input.title.ru,
    titleEn: input.title.en,
    textRu: input.text.ru,
    textEn: input.text.en,
    imageUrl: input.imageUrl || null,
    linkUrl: input.linkUrl || null,
    linkLabelRu: input.linkLabel.ru,
    linkLabelEn: input.linkLabel.en,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
});

/** Настройки из БД поверх значений по умолчанию; битые/устаревшие записи игнорируются */
const loadSettings = async (): Promise<SiteSettingsDto> => {
    const rows = await prisma.siteSetting.findMany();
    const result: SiteSettingsDto = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
        if (!(row.key in SETTINGS_SCHEMAS)) continue;
        const key = row.key as SettingKey;
        const parsed = SETTINGS_SCHEMAS[key].safeParse(row.value);
        if (parsed.success) (result as Record<SettingKey, unknown>)[key] = parsed.data;
    }
    return result;
};

/** Публичное: тексты сайта, настройки и активные новости */
export async function contentRoutes(app: FastifyInstance) {
    app.get('/content', async () => toContentDto(await prisma.siteContent.findMany()));

    app.get('/settings', async () => loadSettings());

    // «Стая» — все, кто уже что-то купил: только ник и аватарка, без личных данных
    app.get('/pack', async (): Promise<PackDto> => {
        const users = await prisma.user.findMany({
            where: { orders: { some: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } } },
            select: {
                nickname: true,
                avatarSeed: true,
                orders: {
                    where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
                    orderBy: { createdAt: 'asc' },
                    take: 1,
                    select: { createdAt: true },
                },
            },
            take: 1000,
        });
        const members = users
            .map((u) => ({ nickname: u.nickname, avatarSeed: u.avatarSeed, since: u.orders[0].createdAt.toISOString() }))
            .sort((a, b) => a.since.localeCompare(b.since));
        return { count: members.length, members };
    });

    app.get('/news', async () => {
        const news = await prisma.news.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            take: 10,
        });
        return news.map(toNewsDto);
    });
}

/** Админка: редактирование текстов и новостей */
export async function adminContentRoutes(app: FastifyInstance) {
    app.addHook('preHandler', requireAdmin);

    app.get('/content', async () => toContentDto(await prisma.siteContent.findMany()));

    app.put('/content', async (req) => {
        const input = parse(contentUpdateSchema, req.body);
        const entries = Object.entries(input).filter(([, v]) => v) as [ContentKey, { ru: string; en: string }][];
        await prisma.$transaction(
            entries.map(([key, v]) =>
                prisma.siteContent.upsert({ where: { key }, create: { key, ru: v.ru, en: v.en }, update: { ru: v.ru, en: v.en } }),
            ),
        );
        return toContentDto(await prisma.siteContent.findMany());
    });

    app.get('/settings', async () => loadSettings());

    // PUT /api/admin/settings/cartMoods | /tagRail — значение валидируется своей схемой
    app.put<{ Params: { key: string } }>('/settings/:key', async (req) => {
        if (!(req.params.key in SETTINGS_SCHEMAS)) throw notFound();
        const key = req.params.key as SettingKey;
        const value = parse(SETTINGS_SCHEMAS[key] as never, req.body) as object;
        await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
        return loadSettings();
    });

    // Сбросить к значениям по умолчанию
    app.delete<{ Params: { key: string } }>('/settings/:key', async (req) => {
        if (!(req.params.key in SETTINGS_SCHEMAS)) throw badRequest('UNKNOWN_SETTING');
        await prisma.siteSetting.deleteMany({ where: { key: req.params.key } });
        return loadSettings();
    });

    app.get('/news', async () => {
        const news = await prisma.news.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
        return news.map(toNewsDto);
    });

    app.post('/news', async (req, reply) => {
        const input = parse(newsUpsertSchema, req.body);
        const news = await prisma.news.create({ data: newsData(input) });
        reply.code(201);
        return toNewsDto(news);
    });

    app.put<{ Params: { id: string } }>('/news/:id', async (req) => {
        const input = parse(newsUpsertSchema, req.body);
        const exists = await prisma.news.findUnique({ where: { id: req.params.id }, select: { id: true } });
        if (!exists) throw notFound();
        return toNewsDto(await prisma.news.update({ where: { id: req.params.id }, data: newsData(input) }));
    });

    app.delete<{ Params: { id: string } }>('/news/:id', async (req) => {
        await prisma.news.delete({ where: { id: req.params.id } });
        return { ok: true };
    });
}
