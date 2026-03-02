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
import item1_old from "@/media/old/1-min.png";
import item2_old from "@/media/old/2-min.png";
import item3_old from "@/media/old/3-min.png";
import item4_old from "@/media/old/4-min.png";
import item5_old from "@/media/old/5-min.png";
import item6_old from "@/media/old/6-min.png";
import item7_old from "@/media/old/7-min.png";
import item8_old from "@/media/old/8-min.png";
import item9_old from "@/media/old/9-min.png";
import item10_old from "@/media/old/10-min.png";
import item11_old from "@/media/old/11-min.png";
import item12_old from "@/media/old/12-min.png";
import item13_old from "@/media/old/13-min.png";
import item14_old from "@/media/old/14-min.png";
import item15_old from "@/media/old/15-min.png";
import item16_old from "@/media/old/16-min.png";
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
    },

    {
        id: 'item-011',
        name: 'items.item11.name',
        description: 'items.item11.descr',
        price: 'items.item11.price',
        priceRub: 'items.item11.priceRub',
        images: [item1_old, item2_old],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-012',
        name: 'items.item12.name',
        description: 'items.item12.descr',
        price: 'items.item12.price',
        priceRub: 'items.item12.priceRub',
        images: [item3_old, item4_old],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-013',
        name: 'items.item13.name',
        description: 'items.item13.descr',
        price: 'items.item13.price',
        priceRub: 'items.item13.priceRub',
        images: [item5_old, item6_old],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-014',
        name: 'items.item14.name',
        description: 'items.item14.descr',
        price: 'items.item14.price',
        priceRub: 'items.item14.priceRub',
        images: [item7_old, item8_old],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-015',
        name: 'items.item15.name',
        description: 'items.item15.descr',
        price: 'items.item15.price',
        priceRub: 'items.item15.priceRub',
        images: [item9_old, item10_old],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-016',
        name: 'items.item16.name',
        description: 'items.item16.descr',
        price: 'items.item16.price',
        priceRub: 'items.item16.priceRub',
        images: [item11_old, item12_old],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-017',
        name: 'items.item17.name',
        description: 'items.item17.descr',
        price: 'items.item17.price',
        priceRub: 'items.item17.priceRub',
        images: [item13_old],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-018',
        name: 'items.item18.name',
        description: 'items.item18.descr',
        price: 'items.item18.price',
        priceRub: 'items.item18.priceRub',
        images: [item14_old],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-019',
        name: 'items.item19.name',
        description: 'items.item19.descr',
        price: 'items.item19.price',
        priceRub: 'items.item19.priceRub',
        images: [item15_old],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    },
    {
        id: 'item-020',
        name: 'items.item20.name',
        description: 'items.item20.descr',
        price: 'items.item20.price',
        priceRub: 'items.item20.priceRub',
        images: [item16_old],
        socialLink: 'https://www.instagram.com/volkoff_mv?igsh=Z2VhNXNkamQxeXE2'
    }
];