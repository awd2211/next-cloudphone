import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorController } from './visitor.controller';
import { VisitorService } from './visitor.service';
import {
  VisitorProfile,
  VisitorEvent,
  Conversation,
  SatisfactionRating,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitorProfile,
      VisitorEvent,
      Conversation,
      SatisfactionRating,
    ]),
  ],
  controllers: [VisitorController],
  providers: [VisitorService],
  exports: [VisitorService],
})
export class VisitorModule {}
