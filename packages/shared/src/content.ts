import { z } from 'zod';

/** Редактируемые из админки тексты сайта. Пустое значение — берётся текст по умолчанию из переводов. */
export const CONTENT_KEYS = ['catalog.lead', 'about.lead', 'about.text', 'about.mission'] as const;
export type ContentKey = (typeof CONTENT_KEYS)[number];

export const CONTENT_LABELS: Record<ContentKey, string> = {
    'catalog.lead': 'Каталог — подзаголовок справа от «каталог»',
    'about.lead': 'О бренде — крупный вводный абзац',
    'about.text': 'О бренде — основной текст',
    'about.mission': 'О бренде — миссия (выделенная цитата)',
};

export type SiteContentDto = Partial<Record<ContentKey, { ru: string; en: string }>>;

const localizedText = z.object({
    ru: z.string().trim().max(5000),
    en: z.string().trim().max(5000),
});

export const contentUpdateSchema = z.object(
    Object.fromEntries(CONTENT_KEYS.map((k) => [k, localizedText.optional()])) as Record<
        ContentKey,
        z.ZodOptional<typeof localizedText>
    >,
);

// Ссылка новости: только http(s) или путь на сайте — никаких javascript:
const safeLink = z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || /^https?:\/\//i.test(v) || /^\/(?!\/)/.test(v), 'ссылка: https://… или /путь');

export const newsUpsertSchema = z.object({
    title: z.object({ ru: z.string().trim().min(1).max(200), en: z.string().trim().min(1).max(200) }),
    text: z.object({ ru: z.string().trim().max(2000), en: z.string().trim().max(2000) }),
    imageUrl: z.string().trim().max(500).nullable().optional(),
    linkUrl: safeLink.nullable().optional(),
    linkLabel: z.object({ ru: z.string().trim().max(60), en: z.string().trim().max(60) }),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
});
export type NewsUpsertInput = z.infer<typeof newsUpsertSchema>;

export interface NewsDto {
    id: string;
    title: { ru: string; en: string };
    text: { ru: string; en: string };
    imageUrl: string | null;
    linkUrl: string | null;
    linkLabel: { ru: string; en: string };
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
}
