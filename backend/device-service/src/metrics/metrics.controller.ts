import { Controller, Get, Header } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { MetricsService } from "./metrics.service";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("metrics")
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Public() // Prometheus 需要公开访问（无需JWT认证）
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  @ApiOperation({
    summary: "Prometheus metrics endpoint",
    description: "Returns all metrics in Prometheus format for scraping",
  })
  @ApiResponse({
    status: 200,
    description: "Metrics in Prometheus format",
    type: String,
  })
  async getMetrics(): Promise<string> {
    return await this.metricsService.getMetrics();
  }
}
