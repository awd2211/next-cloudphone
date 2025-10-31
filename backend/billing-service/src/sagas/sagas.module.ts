import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasePlanSagaV2 as PurchasePlanSaga } from './purchase-plan-v2.saga';
import { SagaConsumer } from './saga.consumer';
import { Order } from '../billing/entities/order.entity';
import { Plan } from '../billing/entities/plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Plan]),
    // EventBusModule 是全局模块，已在 AppModule 中导入，无需重复导入
  ],
  providers: [PurchasePlanSaga, SagaConsumer],
  exports: [PurchasePlanSaga],
})
export class SagasModule {}
