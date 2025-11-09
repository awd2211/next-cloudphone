import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('healthCheck', () => {
    it('should return health status', () => {
      const result = controller.healthCheck();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('proxy-service');
      expect(result.version).toBe('1.0.0');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return valid ISO timestamp', () => {
      const result = controller.healthCheck();

      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    it('should return uptime as a number', () => {
      const result = controller.healthCheck();

      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('readyCheck', () => {
    it('should return ready status', () => {
      const result = controller.readyCheck();

      expect(result).toBeDefined();
      expect(result.status).toBe('ready');
      expect(result.timestamp).toBeDefined();
    });

    it('should return valid ISO timestamp', () => {
      const result = controller.readyCheck();

      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });

  describe('liveCheck', () => {
    it('should return alive status', () => {
      const result = controller.liveCheck();

      expect(result).toBeDefined();
      expect(result.status).toBe('alive');
      expect(result.timestamp).toBeDefined();
    });

    it('should return valid ISO timestamp', () => {
      const result = controller.liveCheck();

      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });

  describe('multiple calls', () => {
    it('should return consistent results across multiple calls', () => {
      const result1 = controller.healthCheck();
      const result2 = controller.healthCheck();

      expect(result1.status).toBe(result2.status);
      expect(result1.service).toBe(result2.service);
      expect(result1.version).toBe(result2.version);
    });

    it('should update timestamp on each call', (done) => {
      const result1 = controller.healthCheck();

      setTimeout(() => {
        const result2 = controller.healthCheck();
        expect(result2.timestamp).not.toBe(result1.timestamp);
        done();
      }, 10);
    });
  });
});
