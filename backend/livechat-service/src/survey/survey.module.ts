import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyController } from './survey.controller';
import { SurveyService } from './survey.service';
import { SurveyTemplate, SurveyResponse, Conversation } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([SurveyTemplate, SurveyResponse, Conversation]),
  ],
  controllers: [SurveyController],
  providers: [SurveyService],
  exports: [SurveyService],
})
export class SurveyModule {}
