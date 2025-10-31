import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const metrics = await service.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should include custom metrics', async () => {
      const metrics = await service.getMetrics();

      expect(metrics).toContain('api_gateway_http_requests_total');
      expect(metrics).toContain('api_gateway_proxy_requests_total');
      expect(metrics).toContain('api_gateway_memory_usage_bytes');
    });
  });

  describe('recordHttpRequest', () => {
    it('should record HTTP request metrics', () => {
      expect(() => {
        service.recordHttpRequest('GET', '/test', 200, 0.5);
      }).not.toThrow();
    });

    it('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        expect(() => {
          service.recordHttpRequest(method, '/test', 200, 0.1);
        }).not.toThrow();
      });
    });
  });

  describe('recordHttpError', () => {
    it('should record HTTP error metrics', () => {
      expect(() => {
        service.recordHttpError('GET', '/test', 500, 'InternalServerError');
      }).not.toThrow();
    });
  });

  describe('recordProxyRequest', () => {
    it('should record proxy request metrics', () => {
      expect(() => {
        service.recordProxyRequest('user-service', 'GET', 200, 1.5);
      }).not.toThrow();
    });

    it('should handle different services', () => {
      const services = ['user-service', 'device-service', 'billing-service'];

      services.forEach((serviceName) => {
        expect(() => {
          service.recordProxyRequest(serviceName, 'POST', 201, 0.8);
        }).not.toThrow();
      });
    });
  });

  describe('recordProxyError', () => {
    it('should record proxy error metrics', () => {
      expect(() => {
        service.recordProxyError('user-service', 'GET', 'ServiceUnavailable');
      }).not.toThrow();
    });
  });

  describe('activeConnections', () => {
    it('should increment active connections', () => {
      expect(() => {
        service.incrementActiveConnections();
      }).not.toThrow();
    });

    it('should decrement active connections', () => {
      expect(() => {
        service.decrementActiveConnections();
      }).not.toThrow();
    });
  });

  describe('getContentType', () => {
    it('should return Prometheus content type', () => {
      const contentType = service.getContentType();

      expect(contentType).toBeDefined();
      expect(typeof contentType).toBe('string');
      expect(contentType).toContain('text/plain');
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', () => {
      // Record some metrics
      service.recordHttpRequest('GET', '/test', 200, 0.5);
      service.recordProxyRequest('user-service', 'GET', 200, 1.0);

      // Reset
      expect(() => {
        service.resetMetrics();
      }).not.toThrow();
    });
  });
});
