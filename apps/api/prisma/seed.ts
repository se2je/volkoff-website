// Наполняет БД текущим каталогом (перенесён из старого фронтенда) и создаёт админа.
// Запуск: npm run db:seed  (идемпотентно — повторный запуск обновит товары, а не задублирует)
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { generateNickname } from '@volkoff/shared';

const prisma = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));
// В dev сид лежит в prisma/, в docker-образе — собран в dist/ рядом с копией seed-media
const MEDIA = [path.join(here, 'seed-media', 'items'), path.join(here, '..', 'prisma', 'seed-media', 'items')].find((p) =>
    existsSync(p),
) ?? path.join(here, 'seed-media', 'items');
const UPLOADS = path.resolve(process.env.UPLOADS_DIR ?? './uploads', 'products');

const categories = [
    { slug: 'outerwear', nameRu: 'верх', nameEn: 'outerwear', sortOrder: 1 },
    { slug: 'denim', nameRu: 'деним', nameEn: 'denim', sortOrder: 2 },
    { slug: 'knit', nameRu: 'трикотаж', nameEn: 'knit', sortOrder: 3 },
    { slug: 'accessories', nameRu: 'аксессуары', nameEn: 'accessories', sortOrder: 4 },
];

const JACKET = ['S', 'M', 'L'];
const JEANS = ['30', '32', '34'];
const ONE = ['ONE SIZE'];

type Seed = {
    id: string;
    cat: string;
    sizes: string[];
    tags: string[];
    name: string;
    ru: string;
    en: string;
    rub: number;
    usd: number;
};

const items: Seed[] = [
    { id: '001', cat: 'outerwear', sizes: JACKET, tags: ['leather', 'calfskin', 'storytelling'], name: 'Oliva Leather Jacket',
        ru: 'Натуральная телячья кожа\nПодкладка — турецкий трикотаж\nКожа хранит свою историю',
        en: 'Natural calf skin\nLining turechka knitwear\nThe skin carries a story', rub: 35000, usd: 400 },
    { id: '002', cat: 'knit', sizes: JACKET, tags: ['knit', 'farmcore'], name: 'Farm Cardigan', ru: '', en: '', rub: 6000, usd: 65 },
    { id: '003', cat: 'denim', sizes: JEANS, tags: ['selvedge', 'japan', 'jeans'], name: 'MV classic jeans',
        ru: 'Из японского селвидж-денима\nДжинсы как универсальная вещь\n\nУлучшен выбор цвета',
        en: 'Made from Japanese selvidge\nJeans are a multi-thing\n\nThe choice of jeans color has been improved', rub: 12000, usd: 150 },
    { id: '004', cat: 'denim', sizes: JEANS, tags: ['kurabo', 'swamp', 'jeans', 'dirty'], name: 'DRT White jeans',
        ru: 'Материал — японский деним (Kurabo). Классический прямой крой с лёгким расширением книзу. Ткань пролежала 2 дня в болотистой местности. Для любителей лесных трофеев.',
        en: 'Material, Japanese denim (Kurabo) Classic straight cut with low flaring at the bottom. The fabric lay for 2 days in a swampy area. For lovers of forest treasures', rub: 12000, usd: 150 },
    { id: '005', cat: 'outerwear', sizes: JACKET, tags: ['leather', 'tartan', 'british'], name: 'Leather Bomber',
        ru: 'Натуральная телячья кожа\nПодкладка в шотландскую клетку\nВдохновлено английской культурой',
        en: 'Natural calf skin\nScottish cage lining\nInspired by English culture', rub: 32000, usd: 400 },
    { id: '006', cat: 'denim', sizes: JEANS, tags: ['italian', 'skinny', 'jeans'], name: 'Skinny jeans',
        ru: '100% итальянский хлопок\n\nУлучшен выбор цвета', en: '100% Italian cotton\n\nThe choice of jeans color has been improved', rub: 12000, usd: 150 },
    { id: '007', cat: 'knit', sizes: JACKET, tags: ['knit', 'farmcore'], name: 'Farm Cardigan 2', ru: '', en: '', rub: 6000, usd: 65 },
    { id: '008', cat: 'outerwear', sizes: JACKET, tags: ['leather', 'leopard', 'fur', 'winter'], name: 'Down jacket',
        ru: 'Пуховик из натуральной кожи, с подкладкой из леопардового меха и отделкой мехом енота.',
        en: 'Down jacket made of genuine leather, with leopard fur lining, fringe of raccoon fur.', rub: 50000, usd: 600 },
    { id: '009', cat: 'outerwear', sizes: JACKET, tags: ['cordura', 'military', 'antidrone'], name: 'Afgana jacket',
        ru: 'Материал Cordura, водоотталкивающая ткань, защита от ИК-излучения — дроны тебя не заметят. Куртка для настоящих ветеранов афганского куша, текстура ткани напоминает прожжённые лёгкие. Будь готов объявить войну своей зависимости.',
        en: 'Cordura material, water-repellent fabric, IR (infrared protection) drones will not see you. The jacket is for real veterans of the Afghan kush, the texture of the fabric resembles burnt lungs. Be ready to declare war on your addiction.', rub: 35000, usd: 430 },
    { id: '010', cat: 'outerwear', sizes: JACKET, tags: ['cordura', 'graffiti', 'street'], name: 'FedEx anorak',
        ru: 'Материал Cordura, водоотталкивающая текстура, устойчива к ветру. Анорак для любителей граффити и уличного движа 😁',
        en: 'Material, Cordura, Water-repellent texture, resistant to winds. Anorak for lovers of wall painting and street movement 😁', rub: 45000, usd: 560 },
    { id: '011', cat: 'outerwear', sizes: JACKET, tags: ['leather', 'cowboy', 'moscow'], name: 'MV Calf Skin Jacket',
        ru: 'Материал — натуральная телячья кожа. Почувствуй себя настоящим ковбоем на диком западе Москвы',
        en: 'Material, Genuine calf leather, feel like a real cowboy in the wild west of Moscow', rub: 25000, usd: 300 },
    { id: '012', cat: 'denim', sizes: JEANS, tags: ['kurabo', 'arizona', 'jeans', 'dirty'], name: 'DRT Black jeans',
        ru: 'Материал — японский деним (Kurabo). Классический прямой крой. Выцветшая грязная ткань, будто в этих джинсах провели неделю в песках Аризоны, в этих джинсах ты будешь выглядеть как Дэниел Крэйг из фильма «Ковбои против пришельцев».',
        en: "Material, Japanese denim (Kurabo) Classic straight cut. The fabric is faded and dirty, as if you spent a week in the sands of Arizona in these jeans. You'll look like Daniel Craig from the movie Cowboys vs Aliens.", rub: 17000, usd: 210 },
    { id: '013', cat: 'denim', sizes: JEANS, tags: ['kurabo', 'swamp', 'jeans', 'dirty'], name: 'DRT Oliva jeans',
        ru: 'Материал — японский деним (Kurabo). Классический прямой крой с лёгким расклешением внизу. Ткань два дня пролежала в болотистой местности. Для любителей лесных сокровищ',
        en: 'Material, Japanese denim (Kurabo) Classic straight cut with low flaring at the bottom. The fabric lay for 2 days in a swampy area. For lovers of forest treasures', rub: 17000, usd: 210 },
    { id: '014', cat: 'denim', sizes: JEANS, tags: ['kurabo', 'punk', 'jeans', 'dirty'], name: 'DRT Blue punk jeans',
        ru: 'Материал — японский деним (Kurabo) с классическим прямым кроем. Легендарный бледно-голубой цвет с оттенком грязи. Всегда оставайся молодым панком, способным на всё. Упал — встал, и не важно, во что ты одет.',
        en: "The material is Japanese denim (kurabo) with a classic straight cut. The legendary pale blue color and the color of mud. Always be a young punk, capable of anything. Fall down and get up, and it doesn't matter what you're wearing.", rub: 17000, usd: 210 },
    { id: '015', cat: 'accessories', sizes: ONE, tags: ['cap', 'sss25'], name: 'SSS25 Black cap',
        ru: 'Обычная кепка, выполнена в общем стиле коллекции', en: 'ordinary cap\nmade in the general style of the collection', rub: 4000, usd: 50 },
    { id: '016', cat: 'accessories', sizes: ONE, tags: ['cap', 'sss25'], name: 'SSS25 Brown cap',
        ru: 'Обычная кепка, выполнена в общем стиле коллекции', en: 'ordinary cap\nmade in the general style of the collection', rub: 4000, usd: 50 },
    { id: '017', cat: 'accessories', sizes: ONE, tags: ['cap', 'sss25'], name: 'SSS25 Khaki cap',
        ru: 'Обычная кепка, выполнена в общем стиле коллекции', en: 'ordinary cap\nmade in the general style of the collection', rub: 4000, usd: 50 },
    { id: '018', cat: 'accessories', sizes: ONE, tags: ['bag', 'escape', 'rehab'], name: 'Sporto duffle bag',
        ru: 'Большая сумка на все случаи: путешествия, граффити, побеги, рехаб, сбор урожая. Выполнена в общем стиле вещей.',
        en: 'A large bag for any purpose, travel, painting, escape, harvesting. Made in the general style of things.', rub: 10000, usd: 130 },
    { id: '019', cat: 'denim', sizes: JEANS, tags: ['leopard', 'pink', 'jeans'], name: 'Pink leopard jeans',
        ru: 'Розовые джинсы с леопардовым принтом, рваные детали и широкий крой.', en: 'Pink leopard print jeans, distressed details, wide leg cut.', rub: 11000, usd: 120 },
    { id: '020', cat: 'outerwear', sizes: JACKET, tags: ['leather', 'leopard', 'red'], name: 'Red MVLeather jacket',
        ru: 'Телячья кожа, лакированная фурнитура сверху, кольца и леопардовая подкладка.', en: 'Calfskin, lacquered top hardware, rings and leopard lining.', rub: 40000, usd: 450 },
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const copyImages = async (id: string) => {
    const dir = path.join(MEDIA, id);
    const files = (await readdir(dir).catch(() => [])).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
    files.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    await mkdir(UPLOADS, { recursive: true });
    const urls: string[] = [];
    for (const file of files) {
        const target = `seed-${id}-${file}`;
        await copyFile(path.join(dir, file), path.join(UPLOADS, target));
        urls.push(`/uploads/products/${target}`);
    }
    return urls;
};

async function main() {
    // В контейнере сид запускается на каждом старте с --if-empty: наполняет только пустую базу
    if (process.argv.includes('--if-empty') && (await prisma.product.count()) > 0) {
        console.log('seed: база уже наполнена, пропускаем');
        return;
    }
    const catIds: Record<string, string> = {};
    for (const c of categories) {
        const row = await prisma.category.upsert({ where: { slug: c.slug }, create: c, update: c });
        catIds[c.slug] = row.id;
    }

    for (const [index, item] of items.entries()) {
        const code = `VK-${item.id}`;
        const images = await copyImages(item.id);
        const data = {
            slug: slugify(item.name),
            code,
            nameRu: item.name,
            nameEn: item.name,
            descriptionRu: item.ru,
            descriptionEn: item.en,
            priceRub: item.rub * 100,
            priceUsd: item.usd * 100,
            categoryId: catIds[item.cat],
            tags: item.tags,
            status: 'ACTIVE' as const,
            sortOrder: index,
            // новинки на момент запуска — только последние две вещи
            releasedAt: ['019', '020'].includes(item.id) ? new Date() : new Date(Date.now() - 60 * 86400_000),
        };
        const product = await prisma.product.upsert({ where: { code }, create: data, update: data });
        await prisma.productImage.deleteMany({ where: { productId: product.id } });
        await prisma.productImage.createMany({
            data: images.map((url, i) => ({ productId: product.id, url, sortOrder: i, alt: item.name })),
        });
        for (const [i, size] of item.sizes.entries()) {
            await prisma.productVariant.upsert({
                where: { productId_size: { productId: product.id, size } },
                create: { productId: product.id, size, stock: item.cat === 'accessories' ? 5 : 1, sortOrder: i },
                update: {},
            });
        }
        console.log(`✓ ${code} ${item.name} (${images.length} img)`);
    }

    const adminEmail = (process.env.ADMIN_EMAILS ?? '').split(',')[0]?.trim().toLowerCase();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
        await prisma.user.upsert({
            where: { email: adminEmail },
            create: {
                email: adminEmail,
                passwordHash: await hash(adminPassword),
                nickname: generateNickname('ru'),
                avatarSeed: Math.random().toString(36).slice(2),
                role: 'ADMIN',
                emailVerifiedAt: new Date(),
                consentAt: new Date(),
            },
            update: { role: 'ADMIN' },
        });
        console.log(`✓ admin: ${adminEmail}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
