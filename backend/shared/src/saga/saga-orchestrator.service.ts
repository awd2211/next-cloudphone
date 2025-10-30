import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Saga Status Enum
 */
export enum SagaStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Saga Type Enum
 */
export enum SagaType {
  PAYMENT_REFUND = 'PAYMENT_REFUND',
  PAYMENT_PURCHASE = 'PAYMENT_PURCHASE', // ✅ 订单购买流程
  DEVICE_CREATION = 'DEVICE_CREATION',
  APP_UPLOAD = 'APP_UPLOAD',
}

/**
 * Saga State Entity
 */
export interface SagaState {
  id?: number;
  sagaId: string;
  sagaType: SagaType;
  currentStep: string;
  stepIndex: number;
  state: Record<string, any>;
  status: SagaStatus;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  timeoutAt?: Date;
  startedAt: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Saga Step Definition
 */
export interface SagaStep<T = any> {
  name: string;
  execute: (state: T) => Promise<Partial<T>>;
  compensate: (state: T) => Promise<void>;
}

/**
 * Saga Definition
 */
export interface SagaDefinition<T = any> {
  type: SagaType;
  steps: SagaStep<T>[];
  timeoutMs?: number;
  maxRetries?: number;
}

/**
 * Saga Orchestrator Service
 *
 * 管理分布式事务(Saga)的执行、补偿和恢复
 *
 * 核心功能:
 * - 创建和执行 Saga
 * - 自动补偿失败的 Saga
 * - 超时检测和处理
 * - 崩溃恢复（从 saga_state 表恢复）
 *
 * 使用示例:
 * ```typescript
 * // 1. 定义 Saga
 * const refundSaga: SagaDefinition = {
 *   type: SagaType.PAYMENT_REFUND,
 *   timeoutMs: 300000, // 5 minutes
 *   steps: [
 *     {
 *       name: 'INITIATE_REFUND',
 *       execute: async (state) => {
 *         const refund = await this.paymentService.initiateRefund(state.paymentId);
 *         return { refundId: refund.id };
 *       },
 *       compensate: async (state) => {
 *         await this.paymentService.cancelRefund(state.refundId);
 *       },
 *     },
 *     {
 *       name: 'UPDATE_BALANCE',
 *       execute: async (state) => {
 *         await this.billingService.addBalance(state.userId, state.amount);
 *         return { balanceUpdated: true };
 *       },
 *       compensate: async (state) => {
 *         await this.billingService.subtractBalance(state.userId, state.amount);
 *       },
 *     },
 *     {
 *       name: 'SEND_NOTIFICATION',
 *       execute: async (state) => {
 *         await this.notificationService.sendRefundNotification(state.userId);
 *         return { notificationSent: true };
 *       },
 *       compensate: async (state) => {
 *         // No compensation needed for notifications
 *       },
 *     },
 *   ],
 * };
 *
 * // 2. 执行 Saga
 * const initialState = {
 *   paymentId: 'pay-123',
 *   userId: 'user-456',
 *   amount: 100.00,
 * };
 *
 * const sagaId = await this.sagaOrchestrator.executeSaga(refundSaga, initialState);
 *
 * // 3. 查询 Saga 状态
 * const state = await this.sagaOrchestrator.getSagaState(sagaId);
 * console.log(state.status); // COMPLETED, FAILED, etc.
 * ```
 */
@Injectable()
export class SagaOrchestratorService {
  private readonly logger = new Logger(SagaOrchestratorService.name);
  private sagaRepository: Repository<SagaState>;

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {
    // 初始化 repository（直接使用 DataSource 的查询能力）
    this.sagaRepository = this.dataSource.getRepository('saga_state');
  }

  /**
   * 执行 Saga
   *
   * @param definition Saga 定义
   * @param initialState 初始状态
   * @returns Saga ID
   */
  async executeSaga<T = any>(
    definition: SagaDefinition<T>,
    initialState: T,
  ): Promise<string> {
    const sagaId = `${definition.type.toLowerCase()}-${uuidv4()}`;

    // 创建 Saga 状态记录
    const timeoutAt = definition.timeoutMs
      ? new Date(Date.now() + definition.timeoutMs)
      : null;

    await this.createSagaState({
      sagaId,
      sagaType: definition.type,
      currentStep: definition.steps[0].name,
      stepIndex: 0,
      state: initialState as any,
      status: SagaStatus.RUNNING,
      retryCount: 0,
      maxRetries: definition.maxRetries ?? 3,
      timeoutAt,
      startedAt: new Date(),
    });

    // 异步执行 Saga（不阻塞调用者）
    this.runSaga(sagaId, definition, initialState).catch((error) => {
      this.logger.error(
        `Saga ${sagaId} execution failed: ${error.message}`,
        error.stack,
      );
    });

    return sagaId;
  }

  /**
   * 运行 Saga（内部方法）
   */
  private async runSaga<T = any>(
    sagaId: string,
    definition: SagaDefinition<T>,
    initialState: T,
  ): Promise<void> {
    let currentState = await this.getSagaState(sagaId);
    let state = { ...initialState, ...currentState.state };

    try {
      // 执行所有步骤
      for (let i = currentState.stepIndex; i < definition.steps.length; i++) {
        const step = definition.steps[i];

        // 检查超时
        if (currentState.timeoutAt && new Date() > currentState.timeoutAt) {
          throw new Error('Saga timeout exceeded');
        }

        this.logger.log(`Saga ${sagaId} executing step ${i}: ${step.name}`);

        // 执行步骤（带重试）
        const result = await this.executeStepWithRetry(
          sagaId,
          step,
          state,
          currentState.maxRetries,
        );

        // 更新状态
        state = { ...state, ...result };
        await this.updateSagaState(sagaId, {
          currentStep: step.name,
          stepIndex: i,
          state,
          retryCount: 0, // 重置重试计数
        });

        currentState = await this.getSagaState(sagaId);
      }

      // 所有步骤成功，标记为完成
      await this.completeSaga(sagaId);
      this.logger.log(`Saga ${sagaId} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Saga ${sagaId} failed at step ${currentState.currentStep}: ${error.message}`,
      );

      // 执行补偿逻辑
      await this.compensateSaga(sagaId, definition, currentState.stepIndex);
    }
  }

  /**
   * 执行步骤（带重试）
   */
  private async executeStepWithRetry<T = any>(
    sagaId: string,
    step: SagaStep<T>,
    state: T,
    maxRetries: number,
  ): Promise<Partial<T>> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await step.execute(state);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Saga ${sagaId} step ${step.name} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}`,
        );

        // 更新重试计数
        await this.dataSource.query(
          `UPDATE saga_state SET retry_count = $1 WHERE saga_id = $2`,
          [attempt + 1, sagaId],
        );

        // 如果还有重试机会，等待后重试
        if (attempt < maxRetries) {
          await this.sleep(Math.pow(2, attempt) * 1000); // 指数退避
        }
      }
    }

    throw lastError;
  }

  /**
   * 补偿 Saga（回滚已执行的步骤）
   */
  private async compensateSaga<T = any>(
    sagaId: string,
    definition: SagaDefinition<T>,
    failedStepIndex: number,
  ): Promise<void> {
    const currentState = await this.getSagaState(sagaId);

    // 标记为补偿中
    await this.updateSagaState(sagaId, {
      status: SagaStatus.COMPENSATING,
      errorMessage: currentState.errorMessage,
    });

    this.logger.log(
      `Saga ${sagaId} compensating from step ${failedStepIndex}`,
    );

    // 反向执行补偿逻辑
    for (let i = failedStepIndex; i >= 0; i--) {
      const step = definition.steps[i];

      try {
        this.logger.log(`Saga ${sagaId} compensating step ${i}: ${step.name}`);
        await step.compensate(currentState.state as T);
      } catch (error) {
        this.logger.error(
          `Saga ${sagaId} compensation failed at step ${step.name}: ${error.message}`,
        );
        // 继续补偿其他步骤（尽力而为）
      }
    }

    // 标记为已补偿
    await this.updateSagaState(sagaId, {
      status: SagaStatus.COMPENSATED,
      completedAt: new Date(),
    });

    this.logger.log(`Saga ${sagaId} compensated successfully`);
  }

  /**
   * 完成 Saga
   */
  private async completeSaga(sagaId: string): Promise<void> {
    await this.updateSagaState(sagaId, {
      status: SagaStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  /**
   * 创建 Saga 状态记录
   */
  private async createSagaState(state: SagaState): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO saga_state
       (saga_id, saga_type, current_step, step_index, state, status,
        retry_count, max_retries, timeout_at, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        state.sagaId,
        state.sagaType,
        state.currentStep,
        state.stepIndex,
        JSON.stringify(state.state),
        state.status,
        state.retryCount,
        state.maxRetries,
        state.timeoutAt,
        state.startedAt,
      ],
    );
  }

  /**
   * 更新 Saga 状态
   */
  private async updateSagaState(
    sagaId: string,
    updates: Partial<SagaState>,
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.currentStep !== undefined) {
      fields.push(`current_step = $${paramIndex++}`);
      values.push(updates.currentStep);
    }
    if (updates.stepIndex !== undefined) {
      fields.push(`step_index = $${paramIndex++}`);
      values.push(updates.stepIndex);
    }
    if (updates.state !== undefined) {
      fields.push(`state = $${paramIndex++}`);
      values.push(JSON.stringify(updates.state));
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.errorMessage !== undefined) {
      fields.push(`error_message = $${paramIndex++}`);
      values.push(updates.errorMessage);
    }
    if (updates.retryCount !== undefined) {
      fields.push(`retry_count = $${paramIndex++}`);
      values.push(updates.retryCount);
    }
    if (updates.completedAt !== undefined) {
      fields.push(`completed_at = $${paramIndex++}`);
      values.push(updates.completedAt);
    }

    if (fields.length === 0) return;

    values.push(sagaId);

    await this.dataSource.query(
      `UPDATE saga_state SET ${fields.join(', ')} WHERE saga_id = $${paramIndex}`,
      values,
    );
  }

  /**
   * 获取 Saga 状态
   */
  async getSagaState(sagaId: string): Promise<SagaState> {
    const [result] = await this.dataSource.query(
      `SELECT * FROM saga_state WHERE saga_id = $1`,
      [sagaId],
    );

    if (!result) {
      throw new Error(`Saga ${sagaId} not found`);
    }

    return {
      id: result.id,
      sagaId: result.saga_id,
      sagaType: result.saga_type,
      currentStep: result.current_step,
      stepIndex: result.step_index,
      state: result.state,
      status: result.status,
      errorMessage: result.error_message,
      retryCount: result.retry_count,
      maxRetries: result.max_retries,
      timeoutAt: result.timeout_at,
      startedAt: result.started_at,
      completedAt: result.completed_at,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  /**
   * 恢复超时的 Saga（定期任务调用）
   */
  async recoverTimeoutSagas(): Promise<number> {
    const result = await this.dataSource.query(
      `UPDATE saga_state
       SET status = $1, error_message = 'Saga timeout exceeded', completed_at = CURRENT_TIMESTAMP
       WHERE status = $2 AND timeout_at < CURRENT_TIMESTAMP
       RETURNING saga_id`,
      [SagaStatus.TIMEOUT, SagaStatus.RUNNING],
    );

    const count = result.length;
    if (count > 0) {
      this.logger.warn(`Recovered ${count} timed-out sagas`);
    }

    return count;
  }

  /**
   * 清理旧的 Saga 记录（定期任务调用）
   */
  async cleanupOldSagas(retentionDays: number = 30): Promise<number> {
    const result = await this.dataSource.query(
      `DELETE FROM saga_state
       WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
       AND status IN ($1, $2, $3, $4)
       RETURNING saga_id`,
      [
        SagaStatus.COMPLETED,
        SagaStatus.COMPENSATED,
        SagaStatus.FAILED,
        SagaStatus.TIMEOUT,
      ],
    );

    const count = result.length;
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} old saga records`);
    }

    return count;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
