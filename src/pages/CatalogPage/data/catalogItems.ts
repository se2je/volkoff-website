// ============================================================
// КАК ДОБАВИТЬ НОВУЮ ВЕЩЬ
// ============================================================
// 1. Создай папку src/media/items/<id>/ (id — следующий по номеру,
//    например "021"), и положи туда картинки с именами 1.png, 2.png...
//    (порядок файлов = порядок в слайдере на сайте).
// 2. Добавь объект в массив catalogItems ниже — просто скопируй
//    последний элемент и поменяй id/name/description/price.
// Картинки подхватятся сами, импортировать их руками не нужно.
// ============================================================

export interface LocalizedText {
    ru: string;
    en: string;
}

export interface CatalogItemType {
    id: string;
    name: LocalizedText;
    description: LocalizedText;
    /** Цена БЕЗ символа валюты, числом — символ (₽ / $) подставляется автоматически */
    price: {
        ru: number;
        en: number;
    };
    images: string[];
    socialLink: string;
}

const DEFAULT_SOCIAL_LINK =
    'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2';

// ------------------------------------------------------------
// Автосбор картинок из src/media/items/<id>/*
// ------------------------------------------------------------
const imageModules = import.meta.glob('/src/media/items/*/*.{png,jpg,jpeg,webp}', {
    eager: true,
    import: 'default',
}) as Record<string, string>;

const naturalFileOrder = (path: string): number => {
    const match = path.match(/(\d+)(?!.*\d)/);
    return match ? parseInt(match[0], 10) : 0;
};

const getImages = (id: string): string[] => {
    return Object.keys(imageModules)
        .filter((path) => path.includes(`/items/${id}/`))
        .sort((a, b) => naturalFileOrder(a) - naturalFileOrder(b))
        .map((path) => imageModules[path]);
};

// ------------------------------------------------------------
// Данные вещей
// ------------------------------------------------------------
interface CatalogItemInput {
    id: string;
    name: LocalizedText;
    description: LocalizedText;
    price: { ru: number; en: number };
    socialLink?: string;
}

const catalogItemsInput: CatalogItemInput[] = [
    {
        id: '001',
        name: { ru: 'Oliva Leather Jacket', en: 'Oliva Leather Jacket' },
        description: {
            ru: 'Натуральная телячья кожа\nПодкладка — турецкий трикотаж\nКожа хранит свою историю',
            en: 'Natural calf skin\nLining turechka knitwear\nThe skin carries a story',
        },
        price: { ru: 35000, en: 400 },
    },
    {
        id: '002',
        name: { ru: 'Farm Cardigan', en: 'Farm Cardigan' },
        description: { ru: '', en: '' },
        price: { ru: 6000, en: 65 },
    },
    {
        id: '003',
        name: { ru: 'MV classic jeans', en: 'MV classic jeans' },
        description: {
            ru: 'Из японского селвидж-денима\nДжинсы как универсальная вещь\n\nУлучшен выбор цвета',
            en: 'Made from Japanese selvidge\nJeans are a multi-thing\n\nThe choice of jeans color has been improved',
        },
        price: { ru: 12000, en: 150 },
    },
    {
        id: '004',
        name: { ru: 'DRT White jeans', en: 'DRT White jeans' },
        description: {
            ru: 'Материал — японский деним (Kurabo). Классический прямой крой с лёгким расширением книзу. Ткань пролежала 2 дня в болотистой местности. Для любителей лесных трофеев.',
            en: 'Material, Japanese denim (Kurabo) Classic straight cut with low flaring at the bottom. The fabric lay for 2 days in a swampy area. For lovers of forest treasures',
        },
        price: { ru: 12000, en: 150 },
    },
    {
        id: '005',
        name: { ru: 'Leather Bomber', en: 'Leather Bomber' },
        description: {
            ru: 'Натуральная телячья кожа\nПодкладка в шотландскую клетку\nВдохновлено английской культурой',
            en: 'Natural calf skin\nScottish cage lining\nInspired by English culture',
        },
        price: { ru: 32000, en: 400 },
    },
    {
        id: '006',
        name: { ru: 'Skinny jeans', en: 'Skinny jeans' },
        description: {
            ru: '100% итальянский хлопок\n\nУлучшен выбор цвета',
            en: '100% Italian cotton\n\nThe choice of jeans color has been improved',
        },
        price: { ru: 12000, en: 150 },
    },
    {
        id: '007',
        name: { ru: 'Farm Cardigan 2', en: 'Farm Cardigan 2' },
        description: { ru: '', en: '' },
        price: { ru: 6000, en: 65 },
    },
    {
        id: '008',
        name: { ru: 'Down jacket', en: 'Down jacket' },
        description: {
            ru: 'Пуховик из натуральной кожи, с подкладкой из леопардового меха и отделкой мехом енота.',
            en: 'Down jacket made of genuine leather, with leopard fur lining, fringe of raccoon fur.',
        },
        price: { ru: 50000, en: 600 },
    },
    {
        id: '009',
        name: { ru: 'Afgana jacket', en: 'Afgana jacket' },
        description: {
            ru: 'Материал Cordura, водоотталкивающая ткань, защита от ИК-излучения — дроны тебя не заметят. Куртка для настоящих ветеранов афганского куша, текстура ткани напоминает прожжённые лёгкие. Будь готов объявить войну своей зависимости.',
            en: 'Cordura material, water-repellent fabric, IR (infrared protection) drones will not see you. The jacket is for real veterans of the Afghan kush, the texture of the fabric resembles burnt lungs. Be ready to declare war on your addiction.',
        },
        price: { ru: 35000, en: 430 },
    },
    {
        id: '010',
        name: { ru: 'FedEx anorak', en: 'FedEx anorak' },
        description: {
            ru: 'Материал Cordura, водоотталкивающая текстура, устойчива к ветру. Анорак для любителей граффити и уличного движа 😁',
            en: 'Material, Cordura, Water-repellent texture, resistant to winds. Anorak for lovers of wall painting and street movement 😁',
        },
        price: { ru: 45000, en: 560 },
    },
    {
        id: '011',
        name: { ru: 'MV Calf Skin Jacket', en: 'MV Calf Skin Jacket' },
        description: {
            ru: 'Материал — натуральная телячья кожа. Почувствуй себя настоящим ковбоем на диком западе Москвы',
            en: 'Material, Genuine calf leather, feel like a real cowboy in the wild west of Moscow',
        },
        price: { ru: 25000, en: 300 },
    },
    {
        id: '012',
        name: { ru: 'DRT Black jeans', en: 'DRT Black jeans' },
        description: {
            ru: 'Материал — японский деним (Kurabo). Классический прямой крой. Выцветшая грязная ткань, будто в этих джинсах провели неделю в песках Аризоны, в этих джинсах ты будешь выглядеть как Дэниел Крэйг из фильма «Ковбои против пришельцев».',
            en: "Material, Japanese denim (Kurabo) Classic straight cut. The fabric is faded and dirty, as if you spent a week in the sands of Arizona in these jeans. You'll look like Daniel Craig from the movie Cowboys vs Aliens.",
        },
        price: { ru: 17000, en: 210 },
    },
    {
        id: '013',
        name: { ru: 'DRT Oliva jeans', en: 'DRT Oliva jeans' },
        description: {
            ru: 'Материал — японский деним (Kurabo). Классический прямой крой с лёгким расклешением внизу. Ткань два дня пролежала в болотистой местности. Для любителей лесных сокровищ',
            en: 'Material, Japanese denim (Kurabo) Classic straight cut with low flaring at the bottom. The fabric lay for 2 days in a swampy area. For lovers of forest treasures',
        },
        price: { ru: 17000, en: 210 },
    },
    {
        id: '014',
        name: { ru: 'DRT Blue punk jeans', en: 'DRT Blue punk jeans' },
        description: {
            ru: 'Материал — японский деним (Kurabo) с классическим прямым кроем. Легендарный бледно-голубой цвет с оттенком грязи. Всегда оставайся молодым панком, способным на всё. Упал — встал, и не важно, во что ты одет.',
            en: "The material is Japanese denim (kurabo) with a classic straight cut. The legendary pale blue color and the color of mud. Always be a young punk, capable of anything. Fall down and get up, and it doesn't matter what you're wearing.",
        },
        price: { ru: 17000, en: 210 },
    },
    {
        id: '015',
        name: { ru: 'SSS25 Black cap', en: 'SSS25 Black cap' },
        description: {
            ru: 'Обычная кепка, выполнена в общем стиле коллекции',
            en: 'ordinary cap\nmade in the general style of the collection',
        },
        price: { ru: 4000, en: 50 },
    },
    {
        id: '016',
        name: { ru: 'SSS25 Brown cap', en: 'SSS25 Brown cap' },
        description: {
            ru: 'Обычная кепка, выполнена в общем стиле коллекции',
            en: 'ordinary cap\nmade in the general style of the collection',
        },
        price: { ru: 4000, en: 50 },
    },
    {
        id: '017',
        name: { ru: 'SSS25 Khaki cap', en: 'SSS25 Khaki cap' },
        description: {
            ru: 'Обычная кепка, выполнена в общем стиле коллекции',
            en: 'ordinary cap\nmade in the general style of the collection',
        },
        price: { ru: 4000, en: 50 },
    },
    {
        id: '018',
        name: { ru: 'Sporto duffle bag', en: 'Sporto duffle bag' },
        description: {
            ru: 'Большая сумка на все случаи: путешествия, граффити, побеги, рехаб, сбор урожая. Выполнена в общем стиле вещей.',
            en: 'A large bag for any purpose, travel, painting, escape, harvesting. Made in the general style of things.',
        },
        price: { ru: 10000, en: 130 },
    },
    {
        id: '019',
        name: { ru: 'Pink leopard jeans', en: 'Pink leopard jeans' },
        description: {
            ru: 'Розовые джинсы с леопардовым принтом, рваные детали и широкий крой.',
            en: 'Pink leopard print jeans, distressed details, wide leg cut.',
        },
        price: { ru: 11000, en: 120 },
    },
    {
        id: '020',
        name: { ru: 'Red MVLeather jacket', en: 'Red MVLeather jacket' },
        description: {
            ru: 'Телячья кожа, лакированная фурнитура сверху, кольца и леопардовая подкладка.',
            en: 'Calfskin, lacquered top hardware, rings and leopard lining.',
        },
        price: { ru: 40000, en: 450 },
    },
];

export const catalogItems: CatalogItemType[] = catalogItemsInput.map((item) => ({
    ...item,
    images: getImages(item.id),
    socialLink: item.socialLink ?? DEFAULT_SOCIAL_LINK,
}));
