/**
 * Saga Orchestration Module
 *
 * 提供分布式事务(Saga)编排能力，用于协调跨服务的长事务
 *
 * 核心概念:
 * - Saga: 一系列本地事务的序列，每个步骤都有对应的补偿操作
 * - Orchestrator: 中央协调器，负责执行 Saga 步骤和补偿逻辑
 * - State: 持久化的 Saga 状态，支持崩溃恢复
 *
 * 适用场景:
 * - 支付退款（跨 Payment + Billing + Notification 服务）
 * - 设备创建（跨 Device + Docker + User 服务）
 * - 应用上传（跨 App + MinIO + Device 服务）
 */

export { SagaOrchestratorService } from './saga-orchestrator.service';
export { SagaModule } from './saga.module';

// Export types and enums
export type {
  SagaState,
  SagaStep,
  SagaDefinition,
} from './saga-orchestrator.service';

export { SagaStatus, SagaType } from './saga-orchestrator.service';
