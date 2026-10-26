import { useQuery } from '@tanstack/react-query';
import type { CatalogFacets, CategoryDto, NewsDto, OrderDto, ProductDto, SiteContentDto } from '@volkoff/shared';
import { api } from './client';

export interface CatalogParams {
    category?: string;
    size?: string;
    q?: string;
    min?: number;
    max?: number;
    inStock?: boolean;
    sort?: string;
    currency: string;
}

export const useProducts = (params: CatalogParams) =>
    useQuery({
        queryKey: ['products', params],
        queryFn: () =>
            api<ProductDto[]>('/products', {
                query: { ...params, inStock: params.inStock ? '1' : undefined },
            }),
        placeholderData: (prev) => prev,
    });

export const useProduct = (slug: string | undefined) =>
    useQuery({
        queryKey: ['product', slug],
        queryFn: () => api<ProductDto>(`/products/${slug}`),
        enabled: !!slug,
    });

export const useCategories = () =>
    useQuery({ queryKey: ['categories'], queryFn: () => api<CategoryDto[]>('/categories'), staleTime: 5 * 60_000 });

export const useFacets = () =>
    useQuery({ queryKey: ['facets'], queryFn: () => api<CatalogFacets>('/products/facets'), staleTime: 5 * 60_000 });

export const useMyOrders = (enabled = true) =>
    useQuery({ queryKey: ['my-orders'], queryFn: () => api<OrderDto[]>('/me/orders'), enabled });

// Пока заказ ждёт оплаты — опрашиваем каждые 4 с: подтверждение от банка приходит вебхуком чуть позже покупателя
export const useOrder = (id: string | undefined) =>
    useQuery({
        queryKey: ['order', id],
        queryFn: () => api<OrderDto>(`/orders/${id}`),
        enabled: !!id,
        refetchInterval: (query) => (query.state.data?.status === 'PENDING_PAYMENT' ? 4000 : false),
    });

export const useSiteContent = () =>
    useQuery({ queryKey: ['content'], queryFn: () => api<SiteContentDto>('/content'), staleTime: 5 * 60_000 });

export const useNews = () => useQuery({ queryKey: ['news'], queryFn: () => api<NewsDto[]>('/news'), staleTime: 60_000 });
