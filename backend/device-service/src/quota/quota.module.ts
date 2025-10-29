import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HttpClientModule } from "@cloudphone/shared";
import { QuotaClientService } from "./quota-client.service";
import { QuotaGuard } from "./quota.guard";

@Module({
  imports: [HttpClientModule, ConfigModule],
  providers: [QuotaClientService, QuotaGuard],
  exports: [QuotaClientService, QuotaGuard],
})
export class QuotaModule {}
