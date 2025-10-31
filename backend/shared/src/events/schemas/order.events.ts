/**
 * 订单相关事件定义
 */

export class OrderCreatedEvent {
  orderId: string;
  userId: string;
  planId: string;
  amount: number;
  timestamp: string;
}

export class OrderPaidEvent {
  orderId: string;
  userId: string;
  paymentId: string;
  amount: number;
  paidAt: Date;
  timestamp: string;
}

export class OrderCancelledEvent {
  orderId: string;
  userId: string;
  reason: string;
  cancelledAt: Date;
  timestamp: string;
}

export class OrderRefundedEvent {
  orderId: string;
  userId: string;
  refundAmount: number;
  reason: string;
  refundedAt: Date;
  timestamp: string;
}
