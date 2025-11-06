/**
 * 订单相关事件定义
 *
 * 所有订单事件统一遵循以下规范：
 * 1. 包含 userRole 和 userEmail（用于角色化通知）✨ 2025-11-03
 */

export class OrderCreatedEvent {
  orderId: string;
  userId: string;
  userRole: string;
  userEmail?: string;
  planId: string;
  amount: number;
  timestamp: string;
}

export class OrderPaidEvent {
  orderId: string;
  userId: string;
  userRole: string;
  userEmail?: string;
  paymentId: string;
  amount: number;
  paidAt: Date;
  timestamp: string;
}

export class OrderCancelledEvent {
  orderId: string;
  userId: string;
  userRole: string;
  userEmail?: string;
  reason: string;
  cancelledAt: Date;
  timestamp: string;
}

export class OrderRefundedEvent {
  orderId: string;
  userId: string;
  userRole: string;
  userEmail?: string;
  refundAmount: number;
  reason: string;
  refundedAt: Date;
  timestamp: string;
}
