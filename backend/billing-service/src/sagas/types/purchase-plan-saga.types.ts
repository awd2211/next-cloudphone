/**
 * Purchase Plan Saga 状态定义
 *
 * 用于 SagaOrchestratorService 管理订单购买流程
 */
export interface PurchasePlanSagaState {
  // ==================== 业务数据 ====================
  userId: string;
  planId: string;
  amount: number;

  // ==================== 步骤执行结果 ====================
  orderId?: string;
  deviceId?: string;
  paymentId?: string;

  // ==================== 元数据 ====================
  startTime: Date;
  attempts?: Record<string, number>; // 每个步骤的尝试次数
}

/**
 * 设备分配请求事件
 */
export interface DeviceAllocationRequest {
  orderId: string;
  userId: string;
  planId: string;
  timestamp: string;
}

/**
 * 设备分配响应事件
 */
export interface DeviceAllocationResponse {
  orderId: string;
  deviceId: string | null;
  success: boolean;
  error?: string;
  timestamp: string;
}
