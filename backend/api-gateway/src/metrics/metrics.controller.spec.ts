import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [MetricsService],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return Prometheus metrics', async () => {
      const mockMetrics =
        '# HELP api_gateway_http_requests_total\n# TYPE api_gateway_http_requests_total counter\n';
      jest.spyOn(metricsService, 'getMetrics').mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toBe(mockMetrics);
      expect(metricsService.getMetrics).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(metricsService, 'getMetrics').mockRejectedValue(new Error('Metrics error'));

      await expect(controller.getMetrics()).rejects.toThrow('Metrics error');
    });
  });
});
