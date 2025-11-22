import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmsService } from './cms.service';
import { CmsController } from './cms.controller';
import {
  SiteSetting,
  CmsContent,
  JobPosition,
  LegalDocument,
  CaseStudy,
  PricingPlan,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SiteSetting,
      CmsContent,
      JobPosition,
      LegalDocument,
      CaseStudy,
      PricingPlan,
    ]),
  ],
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
