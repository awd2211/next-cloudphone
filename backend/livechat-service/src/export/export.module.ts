import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import {
  ExportTask,
  Conversation,
  Agent,
  SatisfactionRating,
  QualityReview,
  AgentSchedule,
  TrainingEnrollment,
  SlaAlert,
  VisitorProfile,
  BotConversation,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExportTask,
      Conversation,
      Agent,
      SatisfactionRating,
      QualityReview,
      AgentSchedule,
      TrainingEnrollment,
      SlaAlert,
      VisitorProfile,
      BotConversation,
    ]),
  ],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
