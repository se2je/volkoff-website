import type { OrderStatus, ProductStatus } from '@volkoff/shared';

export const STATUS_LABEL: Record<OrderStatus, string> = {
    PENDING_PAYMENT: 'ждёт оплаты',
    PAID: 'оплачен',
    PROCESSING: 'собираем',
    SHIPPED: 'отправлен',
    DELIVERED: 'доставлен',
    CANCELLED: 'отменён',
    REFUNDED: 'возврат',
};

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
    DRAFT: 'черновик',
    ACTIVE: 'в продаже',
    ARCHIVED: 'архив',
};
