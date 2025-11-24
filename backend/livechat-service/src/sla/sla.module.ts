/**
 * SLA 预警系统模块
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlaRule } from '../entities/sla-rule.entity';
import { SlaAlert } from '../entities/sla-alert.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { SlaController } from './sla.controller';
import { SlaService } from './sla.service';

@Module({
  imports: [TypeOrmModule.forFeature([SlaRule, SlaAlert, Conversation, Message])],
  controllers: [SlaController],
  providers: [SlaService],
  exports: [SlaService],
})
export class SlaModule {}
