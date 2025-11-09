import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { register } from 'prom-client';

// Mock prom-client register
jest.mock('prom-client', () => ({
  register: {
    metrics: jest.fn(),
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
  },
}));

describe('MetricsController', () => {
  let controller: MetricsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('getMetrics', () => {
    it('should return Prometheus metrics', async () => {
      const mockMetrics = `# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 0.5

# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds.
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total 0.3

# HELP nodejs_heap_size_total_bytes Process heap size from Node.js in bytes.
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 50000000`;

      (register.metrics as jest.Mock).mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toBe(mockMetrics);
      expect(register.metrics).toHaveBeenCalled();
    });

    it('should return metrics in Prometheus format', async () => {
      const mockMetrics = `# HELP test_metric Test metric
# TYPE test_metric counter
test_metric 42`;

      (register.metrics as jest.Mock).mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(typeof result).toBe('string');
      expect(result).toContain('# HELP');
      expect(result).toContain('# TYPE');
    });

    it('should call register.metrics()', async () => {
      (register.metrics as jest.Mock).mockResolvedValue('');

      await controller.getMetrics();

      expect(register.metrics).toHaveBeenCalledTimes(1);
    });

    it('should return empty string when no metrics registered', async () => {
      (register.metrics as jest.Mock).mockResolvedValue('');

      const result = await controller.getMetrics();

      expect(result).toBe('');
    });

    it('should return metrics with multiple metric types', async () => {
      const mockMetrics = `# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 100

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 50
http_request_duration_seconds_bucket{le="0.5"} 90
http_request_duration_seconds_bucket{le="+Inf"} 100

# HELP nodejs_active_handles Number of active handles
# TYPE nodejs_active_handles gauge
nodejs_active_handles 10`;

      (register.metrics as jest.Mock).mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toContain('counter');
      expect(result).toContain('histogram');
      expect(result).toContain('gauge');
    });

    it('should return metrics with labels', async () => {
      const mockMetrics = `# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 100
http_requests_total{method="POST",status="201"} 50`;

      (register.metrics as jest.Mock).mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toContain('method="GET"');
      expect(result).toContain('method="POST"');
      expect(result).toContain('status="200"');
      expect(result).toContain('status="201"');
    });

    it('should handle metrics with special characters', async () => {
      const mockMetrics = `# HELP my_metric_total My metric with special chars: äöü
# TYPE my_metric_total counter
my_metric_total 123`;

      (register.metrics as jest.Mock).mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toBe(mockMetrics);
    });

    it('should return consistent metrics format', async () => {
      const mockMetrics = `# HELP metric1 First metric
# TYPE metric1 counter
metric1 100`;

      (register.metrics as jest.Mock).mockResolvedValue(mockMetrics);

      const result1 = await controller.getMetrics();
      const result2 = await controller.getMetrics();

      expect(result1).toBe(mockMetrics);
      expect(result2).toBe(mockMetrics);
      expect(register.metrics).toHaveBeenCalledTimes(2);
    });
  });

  describe('Prometheus Integration', () => {
    it('should use correct content type', () => {
      expect(register.contentType).toBe('text/plain; version=0.0.4; charset=utf-8');
    });

    it('should return string type suitable for Prometheus scraping', async () => {
      const mockMetrics = 'test_metric 42';
      (register.metrics as jest.Mock).mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from register.metrics()', async () => {
      const error = new Error('Failed to collect metrics');
      (register.metrics as jest.Mock).mockRejectedValue(error);

      await expect(controller.getMetrics()).rejects.toThrow('Failed to collect metrics');
    });

    it('should handle empty metrics gracefully', async () => {
      (register.metrics as jest.Mock).mockResolvedValue('');

      const result = await controller.getMetrics();

      expect(result).toBe('');
      expect(typeof result).toBe('string');
    });
  });
});
