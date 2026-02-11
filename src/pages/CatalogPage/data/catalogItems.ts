// import item1 from '@/media/new/1-a.jpg'
import item2 from '@/media/new/2-a.png'
import item2_2 from '@/media/new/2-b.png'
import item3 from '@/media/new/3-a.png'
import item4 from '@/media/new/4-a.png'
import item4_2 from '@/media/new/4-b.png'
import item5 from '@/media/new/5-a.png'
import item5_2 from '@/media/new/5-b.png'
import item6 from '@/media/new/6-a.png'
import item6_2 from '@/media/new/6-b.png'
import item7 from '@/media/new/7-a.png'
import item8 from '@/media/new/8-a.png'
// import item9 from '@/media/new/9-a.png'
import item10 from '@/media/new/10-a.png'
import item10_2 from '@/media/new/10-b.png'

export interface CatalogItemType {
    id: string;
    name: string;
    description: string;
    price: string;
    priceRub: string;
    images: string[];
    socialLink: string;
}

export const catalogItems: CatalogItemType[] = [
    // {
    //     id: 'item-001',
    //     name: 'items.item1.name',
    //     description: 'items.item1.descr',
    //     price: 'items.item1.price',
    //     priceRub: 'items.item1.priceRub',
    //     images: [item1],
    //     socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    // },
    {
        id: 'item-002',
        name: 'items.item2.name',
        description: 'items.item2.descr',
        price: 'items.item2.price',
        priceRub: 'items.item2.priceRub',
        images: [item2, item2_2],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-003',
        name: 'items.item3.name',
        description: 'items.item3.descr',
        price: 'items.item3.price',
        priceRub: 'items.item3.priceRub',
        images: [item3],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-004',
        name: 'items.item4.name',
        description: 'items.item4.descr',
        price: 'items.item4.price',
        priceRub: 'items.item4.priceRub',
        images: [item4, item4_2],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-005',
        name: 'items.item5.name',
        description: 'items.item5.descr',
        price: 'items.item5.price',
        priceRub: 'items.item5.priceRub',
        images: [item5, item5_2],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-006',
        name: 'items.item6.name',
        description: 'items.item6.descr',
        price: 'items.item6.price',
        priceRub: 'items.item6.priceRub',
        images: [item6, item6_2],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-007',
        name: 'items.item7.name',
        description: 'items.item7.descr',
        price: 'items.item7.price',
        priceRub: 'items.item7.priceRub',
        images: [item7],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-008',
        name: 'items.item8.name',
        description: 'items.item8.descr',
        price: 'items.item8.price',
        priceRub: 'items.item8.priceRub',
        images: [item8],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    // {
    //     id: 'item-009',
    //     name: 'items.item9.name',
    //     description: 'items.item9.descr',
    //     price: 'items.item9.price',
    //     priceRub: 'items.item9.priceRub',
    //     images: [item9],
    //     socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    // },
    {
        id: 'item-010',
        name: 'items.item10.name',
        description: 'items.item10.descr',
        price: 'items.item10.price',
        priceRub: 'items.item10.priceRub',
        images: [item10, item10_2],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    }
];