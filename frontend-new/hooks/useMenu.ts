import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { MenuItem, MenuCategory, ApiResponse } from '../types';

export const menuKeys = {
  categories: ['menu', 'categories'] as const,
  items: ['menu', 'items'] as const,
  categoryDetail: (id: string) => ['menu', 'categories', id] as const,
  itemDetail: (id: string) => ['menu', 'items', id] as const,
};

export function useMenuCategories() {
  return useQuery({
    queryKey: menuKeys.categories,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<MenuCategory[]>>('/menu/categories');
      return response.data.data;
    },
  });
}

export function useMenuItems() {
  return useQuery({
    queryKey: menuKeys.items,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<MenuItem[]>>('/menu/items');
      return response.data.data;
    },
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemData: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiClient.post<ApiResponse<MenuItem>>('/menu/items', itemData);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.items });
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<MenuItem>) => {
      const response = await apiClient.put<ApiResponse<MenuItem>>(`/menu/items/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.items });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/menu/items/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.items });
    },
  });
}
