/**
 * 会话监听/插话模块
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { SupervisionController } from './supervision.controller';
import { SupervisionService } from './supervision.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message])],
  controllers: [SupervisionController],
  providers: [SupervisionService],
  exports: [SupervisionService],
})
export class SupervisionModule {}
