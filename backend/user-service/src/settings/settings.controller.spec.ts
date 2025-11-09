import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingCategory } from './entities/setting.entity';

describe('SettingsController', () => {
  let controller: SettingsController;
  let settingsService: any;

  const mockSettingsService = {
    getAll: jest.fn(),
    getByCategory: jest.fn(),
    updateCategory: jest.fn(),
    initializeDefaults: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
    settingsService = module.get(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have settingsService injected', () => {
      expect(settingsService).toBeDefined();
      expect(settingsService).toBe(mockSettingsService);
    });
  });

  describe('getAll', () => {
    it('should return all settings', async () => {
      const mockSettings = [
        { key: 'app_name', value: 'CloudPhone Platform', category: SettingCategory.BASIC },
        { key: 'smtp_host', value: 'smtp.example.com', category: SettingCategory.EMAIL },
        { key: 'sms_provider', value: 'twilio', category: SettingCategory.SMS },
      ];

      mockSettingsService.getAll.mockResolvedValue(mockSettings);

      const result = await controller.getAll();

      expect(result).toEqual(mockSettings);
      expect(mockSettingsService.getAll).toHaveBeenCalled();
    });

    it('should return empty array when no settings', async () => {
      mockSettingsService.getAll.mockResolvedValue([]);

      const result = await controller.getAll();

      expect(result).toEqual([]);
    });

    it('should include all setting categories', async () => {
      const mockSettings = [
        { category: SettingCategory.BASIC },
        { category: SettingCategory.EMAIL },
        { category: SettingCategory.SMS },
        { category: SettingCategory.PAYMENT },
        { category: SettingCategory.STORAGE },
        { category: SettingCategory.SECURITY },
        { category: SettingCategory.NOTIFICATION },
      ];

      mockSettingsService.getAll.mockResolvedValue(mockSettings);

      const result = await controller.getAll();

      expect(result).toHaveLength(7);
    });
  });

  describe('getByCategory', () => {
    it('should return settings by category', async () => {
      const mockSettings = [
        { key: 'smtp_host', value: 'smtp.example.com', category: SettingCategory.EMAIL },
        { key: 'smtp_port', value: 587, category: SettingCategory.EMAIL },
      ];

      mockSettingsService.getByCategory.mockResolvedValue(mockSettings);

      const result = await controller.getByCategory(SettingCategory.EMAIL);

      expect(result).toEqual(mockSettings);
      expect(mockSettingsService.getByCategory).toHaveBeenCalledWith(SettingCategory.EMAIL);
    });

    it('should return basic category settings', async () => {
      const mockSettings = [
        { key: 'app_name', value: 'CloudPhone', category: SettingCategory.BASIC },
        { key: 'app_version', value: '1.0.0', category: SettingCategory.BASIC },
      ];

      mockSettingsService.getByCategory.mockResolvedValue(mockSettings);

      const result = await controller.getByCategory(SettingCategory.BASIC);

      expect(result).toHaveLength(2);
      expect(mockSettingsService.getByCategory).toHaveBeenCalledWith(SettingCategory.BASIC);
    });

    it('should return empty array for category with no settings', async () => {
      mockSettingsService.getByCategory.mockResolvedValue([]);

      const result = await controller.getByCategory(SettingCategory.PAYMENT);

      expect(result).toEqual([]);
    });
  });

  describe('updateBasic', () => {
    it('should update basic settings', async () => {
      const data = {
        app_name: 'CloudPhone Platform',
        app_version: '2.0.0',
        timezone: 'Asia/Shanghai',
      };

      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      const result = await controller.updateBasic(data);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Basic settings updated');
      expect(mockSettingsService.updateCategory).toHaveBeenCalledWith(
        SettingCategory.BASIC,
        data
      );
    });

    it('should handle empty data object', async () => {
      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      const result = await controller.updateBasic({});

      expect(result.success).toBe(true);
      expect(mockSettingsService.updateCategory).toHaveBeenCalledWith(SettingCategory.BASIC, {});
    });
  });

  describe('updateEmail', () => {
    it('should update email settings', async () => {
      const data = {
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_user: 'noreply@example.com',
        smtp_from: 'CloudPhone <noreply@example.com>',
      };

      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      const result = await controller.updateEmail(data);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email settings updated');
      expect(mockSettingsService.updateCategory).toHaveBeenCalledWith(SettingCategory.EMAIL, data);
    });

    it('should handle partial email updates', async () => {
      const data = { smtp_port: 465 };

      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      const result = await controller.updateEmail(data);

      expect(result.success).toBe(true);
    });
  });

  describe('updateSms', () => {
    it('should update SMS settings', async () => {
      const data = {
        sms_provider: 'twilio',
        sms_api_key: 'ACxxxxxxxxxxxxx',
        sms_api_secret: 'secret123',
        sms_from: '+1234567890',
      };

      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      const result = await controller.updateSms(data);

      expect(result.success).toBe(true);
      expect(result.message).toBe('SMS settings updated');
      expect(mockSettingsService.updateCategory).toHaveBeenCalledWith(SettingCategory.SMS, data);
    });

    it('should handle different SMS providers', async () => {
      const providers = ['twilio', 'aliyun', 'tencent'];

      for (const provider of providers) {
        mockSettingsService.updateCategory.mockResolvedValue(undefined);

        const result = await controller.updateSms({ sms_provider: provider });

        expect(result.success).toBe(true);
      }

      expect(mockSettingsService.updateCategory).toHaveBeenCalledTimes(3);
    });
  });

  describe('updatePayment', () => {
    it('should update payment settings', async () => {
      const data = {
        payment_provider: 'stripe',
        stripe_public_key: 'pk_test_xxxx',
        stripe_secret_key: 'sk_test_xxxx',
        currency: 'USD',
      };

      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      const result = await controller.updatePayment(data);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment settings updated');
      expect(mockSettingsService.updateCategory).toHaveBeenCalledWith(
        SettingCategory.PAYMENT,
        data
      );
    });

    it('should handle multiple payment providers', async () => {
      const data = {
        stripe_enabled: true,
        alipay_enabled: true,
        wechat_pay_enabled: true,
      };

      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      const result = await controller.updatePayment(data);

      expect(result.success).toBe(true);
    });

    it('should handle currency settings', async () => {
      const data = {
        currency: 'CNY',
        currency_symbol: '¥',
      };

      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      const result = await controller.updatePayment(data);

      expect(result.success).toBe(true);
    });
  });

  describe('updateStorage', () => {
    it('should update storage settings', async () => {
      const data = {
        storage_provider: 'minio',
        minio_endpoint: 'http://localhost:9000',
        minio_access_key: 'minioadmin',
        minio_bucket: 'cloudphone',
      };

      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      const result = await controller.updateStorage(data);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Storage settings updated');
      expect(mockSettingsService.updateCategory).toHaveBeenCalledWith(
        SettingCategory.STORAGE,
        data
      );
    });

    it('should handle S3 storage provider', async () => {
      const data = {
        storage_provider: 's3',
        s3_region: 'us-east-1',
        s3_bucket: 'cloudphone-prod',
      };

      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      const result = await controller.updateStorage(data);

      expect(result.success).toBe(true);
    });

    it('should handle local storage configuration', async () => {
      const data = {
        storage_provider: 'local',
        local_path: '/var/data/cloudphone',
      };

      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      const result = await controller.updateStorage(data);

      expect(result.success).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should initialize default settings', async () => {
      mockSettingsService.initializeDefaults.mockResolvedValue(undefined);

      const result = await controller.initialize();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Default settings initialized');
      expect(mockSettingsService.initializeDefaults).toHaveBeenCalled();
    });

    it('should call service method once', async () => {
      mockSettingsService.initializeDefaults.mockResolvedValue(undefined);

      await controller.initialize();

      expect(mockSettingsService.initializeDefaults).toHaveBeenCalledTimes(1);
    });

    it('should be an async operation', async () => {
      mockSettingsService.initializeDefaults.mockResolvedValue(undefined);

      const promise = controller.initialize();

      expect(promise).toBeInstanceOf(Promise);
      await promise;
    });
  });

  describe('Response Format', () => {
    it('should return standard response format for updates', async () => {
      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      const result = await controller.updateBasic({});

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should return consistent response format across all update methods', async () => {
      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      const results = await Promise.all([
        controller.updateBasic({}),
        controller.updateEmail({}),
        controller.updateSms({}),
        controller.updatePayment({}),
        controller.updateStorage({}),
      ]);

      for (const result of results) {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result.success).toBe(true);
      }
    });

    it('should return standard response format for initialize', async () => {
      mockSettingsService.initializeDefaults.mockResolvedValue(undefined);

      const result = await controller.initialize();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result.success).toBe(true);
    });
  });

  describe('Service Integration', () => {
    it('should pass data correctly to service', async () => {
      const testData = { key1: 'value1', key2: 'value2' };

      mockSettingsService.updateCategory.mockResolvedValue(undefined);

      await controller.updateBasic(testData);

      expect(mockSettingsService.updateCategory).toHaveBeenCalledWith(
        SettingCategory.BASIC,
        testData
      );
    });

    it('should call correct service methods', async () => {
      mockSettingsService.getAll.mockResolvedValue([]);
      mockSettingsService.getByCategory.mockResolvedValue([]);
      mockSettingsService.updateCategory.mockResolvedValue(undefined);
      mockSettingsService.initializeDefaults.mockResolvedValue(undefined);

      await controller.getAll();
      await controller.getByCategory(SettingCategory.BASIC);
      await controller.updateBasic({});
      await controller.initialize();

      expect(mockSettingsService.getAll).toHaveBeenCalled();
      expect(mockSettingsService.getByCategory).toHaveBeenCalled();
      expect(mockSettingsService.updateCategory).toHaveBeenCalled();
      expect(mockSettingsService.initializeDefaults).toHaveBeenCalled();
    });
  });
});
