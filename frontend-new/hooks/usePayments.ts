import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { Payment, PaymentStatus, CreatePaymentReq, ApiResponse } from '../types';

export const paymentKeys = {
  all: ['payments'] as const,
  byOrder: (orderId: string) => [...paymentKeys.all, 'order', orderId] as const,
  detail: (id: string) => [...paymentKeys.all, 'detail', id] as const,
};

export function usePaymentsByOrder(orderId: string) {
  return useQuery({
    queryKey: paymentKeys.byOrder(orderId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Payment[]>>(`/orders/${orderId}/payments`);
      return response.data.data;
    },
    enabled: !!orderId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (paymentData: CreatePaymentReq) => {
      const response = await apiClient.post<ApiResponse<Payment>>('/payments', paymentData);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.byOrder(data.orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PaymentStatus }) => {
      const response = await apiClient.put<ApiResponse<Payment>>(`/payments/${id}/status`, { status });
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.byOrder(data.orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
