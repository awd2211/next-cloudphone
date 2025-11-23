import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { Agent } from '../entities/agent.entity';
import { SatisfactionRating } from '../entities/satisfaction-rating.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, Agent, SatisfactionRating])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
