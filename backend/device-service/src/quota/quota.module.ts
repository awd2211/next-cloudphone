import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { QuotaClientService } from './quota-client.service';
import { QuotaGuard } from './quota.guard';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
    ConfigModule,
  ],
  providers: [QuotaClientService, QuotaGuard],
  exports: [QuotaClientService, QuotaGuard],
})
export class QuotaModule {}
