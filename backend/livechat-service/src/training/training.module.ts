import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import {
  TrainingCourse,
  TrainingEnrollment,
  Exam,
  ExamAttempt,
  Agent,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrainingCourse,
      TrainingEnrollment,
      Exam,
      ExamAttempt,
      Agent,
    ]),
  ],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
