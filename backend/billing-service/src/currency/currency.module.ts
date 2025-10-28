import { Module } from '@nestjs/common';
import { HttpClientModule } from '@cloudphone/shared';
import { ConfigModule } from '@nestjs/config';
import { CurrencyService } from './currency.service';

@Module({
  imports: [HttpClientModule, ConfigModule],
  providers: [CurrencyService],
  exports: [CurrencyService],
})
export class CurrencyModule {}
