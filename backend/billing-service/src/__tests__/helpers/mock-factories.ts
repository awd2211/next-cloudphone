/**
 * Mock Factory Helpers for Testing
 *
 * Provides complete mock implementations of entity classes
 * to satisfy strict TypeScript checks in tests
 */

import { Invoice, InvoiceType, InvoiceStatus } from '../../invoices/entities/invoice.entity';
import { Payment, PaymentMethod, PaymentStatus } from '../../payments/entities/payment.entity';
import { Order, OrderStatus } from '../../billing/entities/order.entity';
import { UsageRecord, PricingTier } from '../../billing/entities/usage-record.entity';
import { DeviceProviderType, DeviceType } from '@cloudphone/shared';

/**
 * Create a complete mock Invoice entity
 */
export function createMockInvoice(overrides?: Partial<Invoice>): Invoice {
  const mockInvoice = {
    id: 'test-invoice-id',
    invoiceNumber: 'INV-2024-001',
    userId: 'test-user-id',
    type: InvoiceType.MONTHLY,
    status: InvoiceStatus.PENDING,
    subtotal: 100,
    tax: 10,
    discount: 0,
    total: 110,
    items: [],
    dueDate: new Date(),
    paidAt: null,
    paymentId: null,
    paymentMethod: null,
    currency: 'USD',
    notes: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),

    // Entity methods as jest functions
    calculateTotal: jest.fn().mockReturnValue(110),
    isPaid: jest.fn().mockReturnValue(false),
    isOverdue: jest.fn().mockReturnValue(false),
    canCancel: jest.fn().mockReturnValue(true),
    addItem: jest.fn(),
    removeItem: jest.fn(),

    ...overrides,
  } as unknown as Invoice;

  return mockInvoice;
}

/**
 * Create a complete mock Payment entity
 */
export function createMockPayment(overrides?: Partial<Payment>): Payment {
  const mockPayment = {
    id: 'test-payment-id',
    orderId: 'test-order-id',
    order: null as any,
    userId: 'test-user-id',
    amount: 100,
    method: PaymentMethod.STRIPE,
    status: PaymentStatus.PENDING,
    transactionId: null,
    providerOrderId: null,
    providerPaymentId: null,
    currency: 'USD',
    description: 'Test payment',
    failureReason: null,
    refundedAmount: 0,
    refundedAt: null,
    confirmedAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),

    ...overrides,
  } as unknown as Payment;

  return mockPayment;
}

/**
 * Create mock BalanceDeductResponse
 */
export function createMockBalanceResponse(overrides?: any) {
  return {
    success: true,
    transactionId: 'txn-123',
    newBalance: 100,
    ...overrides,
  };
}

/**
 * Create a complete mock Order entity
 */
export function createMockOrder(overrides?: Partial<Order>): Order {
  const mockOrder = {
    id: 'test-order-id',
    userId: 'test-user-id',
    amount: 99.99,
    status: OrderStatus.PENDING,
    currency: 'USD',
    description: 'Test order',
    items: [],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),

    ...overrides,
  } as unknown as Order;

  return mockOrder;
}

/**
 * Create a complete mock UsageRecord entity
 */
export function createMockUsageRecord(overrides?: Partial<UsageRecord>): UsageRecord {
  const mockUsageRecord = {
    id: 'test-usage-record-id',
    deviceId: 'test-device-id',
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    usageType: 'device_usage' as any,
    quantity: 1,
    unit: 'GB',
    cost: 2.5,
    startTime: new Date(),
    endTime: new Date(),
    durationSeconds: 3600,
    isBilled: false,
    billingRate: 2.5,
    pricingTier: PricingTier.STANDARD,
    providerType: DeviceProviderType.REDROID,
    deviceType: DeviceType.PHONE,
    deviceName: 'Test Device',
    deviceConfig: {
      cpuCores: 2,
      memoryMB: 2048,
      storageGB: 64,
      gpuEnabled: false,
    },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    recordedAt: new Date(),

    ...overrides,
  } as unknown as UsageRecord;

  return mockUsageRecord;
}

/**
 * Create mock BillingCalculation result
 */
export function createMockBillingCalculation(overrides?: any) {
  return {
    totalCost: 2.5,
    billingRate: 2.5,
    durationHours: 1,
    pricingTier: PricingTier.STANDARD,
    breakdown: {
      base: 2.0,
      cpu: 0.3,
      memory: 0.2,
    },
    ...overrides,
  };
}
