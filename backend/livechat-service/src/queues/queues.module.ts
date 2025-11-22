import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueuesService } from './queues.service';
import { QueuesController } from './queues.controller';
import { QueueConfig } from '../entities/queue-config.entity';
import { QueueItem } from '../entities/queue-item.entity';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QueueConfig, QueueItem]),
    AgentsModule,
  ],
  controllers: [QueuesController],
  providers: [QueuesService],
  exports: [QueuesService],
})
export class QueuesModule {}
