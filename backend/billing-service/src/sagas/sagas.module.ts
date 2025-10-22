import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasePlanSaga } from './purchase-plan.saga';
import { SagaConsumer } from './saga.consumer';
import { Order } from '../billing/entities/order.entity';
import { Plan } from '../billing/entities/plan.entity';
import { EventBusModule } from '@cloudphone/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Plan]),
    EventBusModule,
  ],
  providers: [PurchasePlanSaga, SagaConsumer],
  exports: [PurchasePlanSaga],
})
export class SagasModule {}

