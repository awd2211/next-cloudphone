/**
 * Order Mock Data
 * 符合 OrderSchema 定义
 */
import type { Order } from '@/types';
import { OrderStatus, PaymentMethod } from '@/types';

export const mockOrder: Order = {
  id: 'order-1',
  orderNo: 'ORD-2025010100001',
  userId: '550e8400-e29b-41d4-a716-446655440001',
  planId: 'plan-basic',
  amount: '99.99',
  status: OrderStatus.PAID,
  paymentMethod: PaymentMethod.ALIPAY,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:05:00Z',
  paidAt: '2025-01-01T00:05:00Z',
  expiresAt: '2025-02-01T00:00:00Z',
};

export const mockOrder2: Order = {
  id: 'order-2',
  orderNo: 'ORD-2025011000002',
  userId: '550e8400-e29b-41d4-a716-446655440001',
  planId: 'plan-premium',
  amount: '299.99',
  status: OrderStatus.PENDING,
  createdAt: '2025-01-10T10:00:00Z',
  updatedAt: '2025-01-10T10:00:00Z',
};

export const mockOrders: Order[] = [mockOrder, mockOrder2];
