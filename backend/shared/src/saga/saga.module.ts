import { Module } from '@nestjs/common';
import { SagaOrchestratorService } from './saga-orchestrator.service';

/**
 * Saga Module
 *
 * 提供分布式事务(Saga)编排能力
 *
 * ⚠️ 重要: 此模块需要 TypeORM 的 DataSource,因此使用它的服务必须已经配置了 TypeOrmModule.forRoot()
 *
 * 使用方法:
 * 1. 确保 AppModule 中已配置 TypeOrmModule.forRoot()
 * 2. 在 AppModule 中导入 SagaModule
 * 3. 注入 SagaOrchestratorService 到需要使用的服务中
 *
 * @example
 * ```typescript
 * // app.module.ts
 * import { SagaModule } from '@cloudphone/shared';
 *
 * @Module({
 *   imports: [
 *     TypeOrmModule.forRoot({...}), // 必须先配置 TypeORM
 *     SagaModule, // 然后导入 Saga 模块
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
@Module({
  providers: [SagaOrchestratorService],
  exports: [SagaOrchestratorService],
})
export class SagaModule {}
