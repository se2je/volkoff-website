import { useQuery } from '@tanstack/react-query';
import type { CatalogFacets, CategoryDto, OrderDto, ProductDto } from '@volkoff/shared';
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

export const useOrder = (id: string | undefined) =>
    useQuery({ queryKey: ['order', id], queryFn: () => api<OrderDto>(`/orders/${id}`), enabled: !!id });
