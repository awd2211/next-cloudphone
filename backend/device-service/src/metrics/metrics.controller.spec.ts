import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: any;

  const mockMetricsService = {
    getMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    metricsService = module.get(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const mockMetrics = `# HELP device_service_active_devices Number of active devices
# TYPE device_service_active_devices gauge
device_service_active_devices 42

# HELP device_service_total_requests Total number of HTTP requests
# TYPE device_service_total_requests counter
device_service_total_requests 1234

# HELP device_service_request_duration_seconds HTTP request duration
# TYPE device_service_request_duration_seconds histogram
device_service_request_duration_seconds_bucket{le="0.1"} 100
device_service_request_duration_seconds_bucket{le="0.5"} 150
device_service_request_duration_seconds_bucket{le="1"} 180
device_service_request_duration_seconds_bucket{le="+Inf"} 200
device_service_request_duration_seconds_sum 150.5
device_service_request_duration_seconds_count 200
`;

      metricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toBe(mockMetrics);
      expect(result).toContain('device_service_active_devices');
      expect(result).toContain('device_service_total_requests');
      expect(result).toContain('device_service_request_duration_seconds');
      expect(metricsService.getMetrics).toHaveBeenCalled();
    });

    it('should return gauge metrics', async () => {
      const mockMetrics = `# HELP device_service_memory_usage Memory usage in bytes
# TYPE device_service_memory_usage gauge
device_service_memory_usage 1048576
`;

      metricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toContain('# TYPE device_service_memory_usage gauge');
      expect(result).toContain('device_service_memory_usage 1048576');
    });

    it('should return counter metrics', async () => {
      const mockMetrics = `# HELP device_service_device_created_total Total devices created
# TYPE device_service_device_created_total counter
device_service_device_created_total 500
`;

      metricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toContain('# TYPE device_service_device_created_total counter');
      expect(result).toContain('device_service_device_created_total 500');
    });

    it('should return histogram metrics', async () => {
      const mockMetrics = `# HELP http_request_duration_seconds Request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.005"} 10
http_request_duration_seconds_bucket{le="0.01"} 25
http_request_duration_seconds_bucket{le="0.025"} 50
http_request_duration_seconds_bucket{le="+Inf"} 100
http_request_duration_seconds_sum 5.5
http_request_duration_seconds_count 100
`;

      metricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toContain('http_request_duration_seconds_bucket');
      expect(result).toContain('http_request_duration_seconds_sum');
      expect(result).toContain('http_request_duration_seconds_count');
    });

    it('should return summary metrics', async () => {
      const mockMetrics = `# HELP rpc_duration_seconds RPC latency
# TYPE rpc_duration_seconds summary
rpc_duration_seconds{quantile="0.5"} 0.05
rpc_duration_seconds{quantile="0.9"} 0.1
rpc_duration_seconds{quantile="0.99"} 0.5
rpc_duration_seconds_sum 10.5
rpc_duration_seconds_count 100
`;

      metricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toContain('# TYPE rpc_duration_seconds summary');
      expect(result).toContain('quantile="0.5"');
      expect(result).toContain('rpc_duration_seconds_sum');
    });

    it('should return metrics with labels', async () => {
      const mockMetrics = `# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1000
http_requests_total{method="POST",status="200"} 500
http_requests_total{method="GET",status="404"} 10
http_requests_total{method="POST",status="500"} 5
`;

      metricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toContain('method="GET"');
      expect(result).toContain('status="200"');
      expect(result).toContain('method="POST"');
      expect(result).toContain('status="404"');
    });

    it('should return device-specific metrics', async () => {
      const mockMetrics = `# HELP device_service_devices_by_status Devices grouped by status
# TYPE device_service_devices_by_status gauge
device_service_devices_by_status{status="running"} 30
device_service_devices_by_status{status="stopped"} 10
device_service_devices_by_status{status="error"} 2

# HELP device_service_docker_containers Total Docker containers
# TYPE device_service_docker_containers gauge
device_service_docker_containers 42
`;

      metricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toContain('device_service_devices_by_status');
      expect(result).toContain('device_service_docker_containers');
      expect(result).toContain('status="running"');
      expect(result).toContain('status="stopped"');
      expect(result).toContain('status="error"');
    });

    it('should return empty string when no metrics available', async () => {
      metricsService.getMetrics.mockResolvedValue('');

      const result = await controller.getMetrics();

      expect(result).toBe('');
      expect(metricsService.getMetrics).toHaveBeenCalled();
    });

    it('should handle multiple metric types together', async () => {
      const mockMetrics = `# HELP device_count Current device count
# TYPE device_count gauge
device_count 100

# HELP request_total Total requests
# TYPE request_total counter
request_total 5000

# HELP latency_seconds Request latency
# TYPE latency_seconds histogram
latency_seconds_bucket{le="0.1"} 500
latency_seconds_bucket{le="+Inf"} 5000
latency_seconds_sum 250
latency_seconds_count 5000
`;

      metricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toContain('# TYPE device_count gauge');
      expect(result).toContain('# TYPE request_total counter');
      expect(result).toContain('# TYPE latency_seconds histogram');
    });

    it('should return metrics with timestamps', async () => {
      const mockMetrics = `# HELP process_cpu_seconds_total Total user and system CPU time
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 123.45 1609459200000

# HELP process_resident_memory_bytes Resident memory size
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 41943040 1609459200000
`;

      metricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toContain('1609459200000');
      expect(result).toContain('process_cpu_seconds_total');
      expect(result).toContain('process_resident_memory_bytes');
    });

    it('should handle service call correctly', async () => {
      const mockMetrics = '# Metrics data';
      metricsService.getMetrics.mockResolvedValue(mockMetrics);

      await controller.getMetrics();

      expect(metricsService.getMetrics).toHaveBeenCalledTimes(1);
      expect(metricsService.getMetrics).toHaveBeenCalledWith();
    });

    it('should return system metrics', async () => {
      const mockMetrics = `# HELP nodejs_heap_size_total_bytes Total heap size
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 50331648

# HELP nodejs_heap_size_used_bytes Used heap size
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 25165824

# HELP nodejs_eventloop_lag_seconds Event loop lag
# TYPE nodejs_eventloop_lag_seconds gauge
nodejs_eventloop_lag_seconds 0.002
`;

      metricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toContain('nodejs_heap_size_total_bytes');
      expect(result).toContain('nodejs_heap_size_used_bytes');
      expect(result).toContain('nodejs_eventloop_lag_seconds');
    });

    it('should handle very long metrics output', async () => {
      let longMetrics = '';
      for (let i = 0; i < 100; i++) {
        longMetrics += `# HELP metric_${i} Metric ${i}\n`;
        longMetrics += `# TYPE metric_${i} gauge\n`;
        longMetrics += `metric_${i} ${i}\n\n`;
      }

      metricsService.getMetrics.mockResolvedValue(longMetrics);

      const result = await controller.getMetrics();

      expect(result).toBe(longMetrics);
      expect(result.split('\n').length).toBeGreaterThan(300);
    });

    it('should return custom business metrics', async () => {
      const mockMetrics = `# HELP device_creation_duration_seconds Time to create a device
# TYPE device_creation_duration_seconds histogram
device_creation_duration_seconds_bucket{le="5"} 50
device_creation_duration_seconds_bucket{le="10"} 90
device_creation_duration_seconds_bucket{le="+Inf"} 100
device_creation_duration_seconds_sum 650
device_creation_duration_seconds_count 100

# HELP adb_command_errors_total Total ADB command errors
# TYPE adb_command_errors_total counter
adb_command_errors_total{command="install"} 5
adb_command_errors_total{command="shell"} 2
`;

      metricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toContain('device_creation_duration_seconds');
      expect(result).toContain('adb_command_errors_total');
      expect(result).toContain('command="install"');
      expect(result).toContain('command="shell"');
    });
  });
});
