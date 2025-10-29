import { Module, Global } from '@nestjs/common';
import { SagaOrchestratorService } from './saga-orchestrator.service';

/**
 * Saga Module
 *
 * 提供分布式事务(Saga)编排能力
 *
 * 使用方法:
 * 1. 在服务的 AppModule 中导入 SagaModule
 * 2. 注入 SagaOrchestratorService 到需要使用的服务中
 *
 * @example
 * ```typescript
 * // app.module.ts
 * import { SagaModule } from '@cloudphone/shared';
 *
 * @Module({
 *   imports: [
 *     SagaModule, // 导入 Saga 模块
 *     // ... other modules
 *   ],
 * })
 * export class AppModule {}
 *
 * // payment.service.ts
 * import { SagaOrchestratorService, SagaDefinition, SagaType } from '@cloudphone/shared';
 *
 * @Injectable()
 * export class PaymentService {
 *   constructor(
 *     private readonly sagaOrchestrator: SagaOrchestratorService,
 *   ) {}
 *
 *   async processRefund(refundDto: RefundDto) {
 *     const refundSaga: SagaDefinition = {
 *       type: SagaType.PAYMENT_REFUND,
 *       timeoutMs: 300000, // 5 minutes
 *       steps: [
 *         {
 *           name: 'INITIATE_REFUND',
 *           execute: async (state) => {
 *             const refund = await this.initiateRefund(state.paymentId);
 *             return { refundId: refund.id };
 *           },
 *           compensate: async (state) => {
 *             await this.cancelRefund(state.refundId);
 *           },
 *         },
 *         // ... more steps
 *       ],
 *     };
 *
 *     const sagaId = await this.sagaOrchestrator.executeSaga(refundSaga, {
 *       paymentId: refundDto.paymentId,
 *       userId: refundDto.userId,
 *       amount: refundDto.amount,
 *     });
 *
 *     return { sagaId };
 *   }
 * }
 * ```
 */
@Global()
@Module({
  providers: [SagaOrchestratorService],
  exports: [SagaOrchestratorService],
})
export class SagaModule {}
