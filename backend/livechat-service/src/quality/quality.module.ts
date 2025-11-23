import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityService } from './quality.service';
import { QualityController } from './quality.controller';
import { QualityReview } from '../entities/quality-review.entity';
import { SensitiveWord } from '../entities/sensitive-word.entity';
import { SatisfactionRating } from '../entities/satisfaction-rating.entity';
import { Message } from '../entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QualityReview, SensitiveWord, SatisfactionRating, Message])],
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}
