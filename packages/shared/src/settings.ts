import { z } from 'zod';
import { safeLink } from './content';

// ------------------------------------------------------------
// Настройки, которые меняются из админки без релиза
// ------------------------------------------------------------

/** Рожицы корзины по порядку «настроения» (картинки — в MoodFace на фронте) */
export const MOOD_KEYS = ['empty', 'tiny', 'ok', 'taste', 'rich', 'fire', 'king', 'dead'] as const;
export type MoodKey = (typeof MOOD_KEYS)[number];

const label = z.object({ ru: z.string().trim().max(60), en: z.string().trim().max(60) });

export const cartMoodLevelSchema = z.object({
    key: z.enum(MOOD_KEYS),
    /** с какой суммы в корзине (в рублях / долларах, целые) включается рожица */
    rub: z.number().int().min(0).max(100_000_000),
    usd: z.number().int().min(0).max(1_000_000),
    label,
});
export type CartMoodLevel = z.infer<typeof cartMoodLevelSchema>;

export const cartMoodsSchema = z
    .array(cartMoodLevelSchema)
    .length(MOOD_KEYS.length)
    .superRefine((levels, ctx) => {
        if (levels[0].rub !== 0 || levels[0].usd !== 0) {
            ctx.addIssue({ code: 'custom', message: 'первая рожица — пустая корзина, порог 0' });
        }
        for (let i = 1; i < levels.length; i++) {
            if (levels[i].rub <= levels[i - 1].rub || levels[i].usd <= levels[i - 1].usd) {
                ctx.addIssue({ code: 'custom', message: `пороги должны расти: строка ${i + 1}` });
            }
        }
    });

export const DEFAULT_CART_MOODS: CartMoodLevel[] = [
    { key: 'empty', rub: 0, usd: 0, label: { ru: 'злится', en: 'angry' } },
    { key: 'tiny', rub: 1, usd: 1, label: { ru: 'и это всё?', en: "that's it?" } },
    { key: 'ok', rub: 8000, usd: 90, label: { ru: 'уже лучше', en: 'getting better' } },
    { key: 'taste', rub: 20000, usd: 230, label: { ru: 'вкус есть', en: 'got taste' } },
    { key: 'rich', rub: 40000, usd: 460, label: { ru: 'богато', en: 'rich' } },
    { key: 'fire', rub: 80000, usd: 900, label: { ru: 'горишь', en: 'on fire' } },
    { key: 'king', rub: 150000, usd: 1700, label: { ru: 'король улиц', en: 'king of the streets' } },
    { key: 'dead', rub: 300000, usd: 3500, label: { ru: 'убил', en: 'you killed it' } },
];

export const tagRailItemSchema = z.object({
    text: z.object({ ru: z.string().trim().min(1).max(80), en: z.string().trim().min(1).max(80) }),
    /** необязательная ссылка: /catalog?q=leather или https://… */
    link: safeLink.nullable().optional(),
});
export type TagRailItem = z.infer<typeof tagRailItemSchema>;

export const tagRailSchema = z.object({
    items: z.array(tagRailItemSchema).max(40),
    /** подмешивать теги товаров (#leather, #kurabo…) — ведут в поиск */
    showProductTags: z.boolean(),
    /** время полного круга, секунд: меньше — быстрее */
    durationSec: z.number().int().min(10).max(300),
});
export type TagRail = z.infer<typeof tagRailSchema>;

export const DEFAULT_TAG_RAIL: TagRail = {
    items: [
        { text: { ru: 'ручная работа', en: 'handmade' } },
        { text: { ru: 'сделано в Москве', en: 'made in Moscow' } },
        { text: { ru: 'каждая вещь — в одном экземпляре', en: 'every piece is one of a kind' } },
        { text: { ru: 'кожа, деним Kurabo, болото', en: 'leather, Kurabo denim, swamp' } },
        { text: { ru: 'доставка по России бесплатно', en: 'free shipping in Russia' } },
        { text: { ru: 'no fast fashion', en: 'no fast fashion' } },
        { text: { ru: 'упал — встал', en: 'fall down — get up' } },
    ],
    showProductTags: true,
    durationSec: 70,
};

/** Большой баннер-обложка над каталогом */
export const heroSchema = z.object({
    enabled: z.boolean(),
    imageUrl: z.string().trim().max(500).nullable(),
    title: z.object({ ru: z.string().trim().max(120), en: z.string().trim().max(120) }),
    subtitle: z.object({ ru: z.string().trim().max(300), en: z.string().trim().max(300) }),
    link: safeLink.nullable().optional(),
    linkLabel: z.object({ ru: z.string().trim().max(60), en: z.string().trim().max(60) }),
    /** фото в ч/б под монохром сайта */
    grayscale: z.boolean(),
});
export type Hero = z.infer<typeof heroSchema>;

export const DEFAULT_HERO: Hero = {
    enabled: false,
    imageUrl: null,
    title: { ru: '', en: '' },
    subtitle: { ru: '', en: '' },
    link: null,
    linkLabel: { ru: '', en: '' },
    grayscale: false,
};

export interface SiteSettingsDto {
    cartMoods: CartMoodLevel[];
    tagRail: TagRail;
    hero: Hero;
}

export const SETTINGS_SCHEMAS = {
    cartMoods: cartMoodsSchema,
    tagRail: tagRailSchema,
    hero: heroSchema,
} as const;
export type SettingKey = keyof typeof SETTINGS_SCHEMAS;

export const DEFAULT_SETTINGS: SiteSettingsDto = {
    cartMoods: DEFAULT_CART_MOODS,
    tagRail: DEFAULT_TAG_RAIL,
    hero: DEFAULT_HERO,
};
