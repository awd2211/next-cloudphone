import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: any;

  const mockAppService = {
    getHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have appService injected', () => {
      expect(appService).toBeDefined();
      expect(appService).toBe(mockAppService);
    });
  });

  describe('Service Integration', () => {
    it('should have access to appService.getHealth method', () => {
      expect(appService.getHealth).toBeDefined();
      expect(typeof appService.getHealth).toBe('function');
    });

    it('should be able to call appService.getHealth', () => {
      const mockHealth = {
        status: 'ok',
        service: 'api-gateway',
        timestamp: '2025-01-06T10:00:00.000Z',
      };

      mockAppService.getHealth.mockReturnValue(mockHealth);

      const result = appService.getHealth();

      expect(result).toEqual(mockHealth);
      expect(result.status).toBe('ok');
      expect(result.service).toBe('api-gateway');
      expect(mockAppService.getHealth).toHaveBeenCalled();
    });

    it('should return health status with timestamp', () => {
      const mockHealth = {
        status: 'ok',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
      };

      mockAppService.getHealth.mockReturnValue(mockHealth);

      const result = appService.getHealth();

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('Controller Structure', () => {
    it('should have appService as a property', () => {
      expect((controller as any).appService).toBeDefined();
    });

    it('should maintain appService reference', () => {
      const serviceRef = (controller as any).appService;
      expect(serviceRef).toBe(mockAppService);
    });
  });
});
