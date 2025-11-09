import { Test, TestingModule } from '@nestjs/testing';
import { ProxyGeoMatchingController } from './proxy-geo-matching.controller';
import { ProxyGeoMatchingService } from '../services/proxy-geo-matching.service';
import {
  ConfigureDeviceGeoDto,
  GeoMatchQueryDto,
  GeoRecommendationDto,
  BatchConfigureGeoDto,
} from '../dto';

describe('ProxyGeoMatchingController', () => {
  let controller: ProxyGeoMatchingController;
  let geoMatchingService: any;

  const mockGeoMatchingService = {
    configureDeviceGeo: jest.fn(),
    batchConfigureDeviceGeo: jest.fn(),
    getDeviceGeoSetting: jest.fn(),
    matchProxiesByGeo: jest.fn(),
    recommendGeoLocation: jest.fn(),
    getIspProviders: jest.fn(),
    getGeoStatistics: jest.fn(),
  };

  const mockDeviceGeoSetting = {
    id: 'geo-123',
    deviceId: 'device-123',
    userId: 'user-456',
    targetCountry: 'US',
    targetCity: 'New York',
    ispType: 'residential',
    preferredProviders: ['Comcast', 'Verizon'],
    autoMatch: true,
    priority: 5,
    createdAt: new Date('2025-01-06T00:00:00.000Z'),
    updatedAt: new Date('2025-01-06T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyGeoMatchingController],
      providers: [
        {
          provide: ProxyGeoMatchingService,
          useValue: mockGeoMatchingService,
        },
      ],
    }).compile();

    controller = module.get<ProxyGeoMatchingController>(
      ProxyGeoMatchingController,
    );
    geoMatchingService = module.get(ProxyGeoMatchingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('configureDeviceGeo', () => {
    it('should configure device geo location', async () => {
      const dto: ConfigureDeviceGeoDto = {
        deviceId: 'device-123',
        userId: 'user-456',
        targetCountry: 'US',
        targetCity: 'New York',
        ispType: 'residential',
        preferredProviders: ['Comcast'],
      };

      mockGeoMatchingService.configureDeviceGeo.mockResolvedValue(
        mockDeviceGeoSetting,
      );

      const result = await controller.configureDeviceGeo(dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDeviceGeoSetting);
      expect(result.message).toBe('Geo configuration saved');
      expect(geoMatchingService.configureDeviceGeo).toHaveBeenCalledWith(dto);
    });

    it('should configure device with different ISP types', async () => {
      const ispTypes = ['residential', 'datacenter', 'mobile'];

      for (const ispType of ispTypes) {
        const dto: ConfigureDeviceGeoDto = {
          deviceId: 'device-123',
          userId: 'user-456',
          targetCountry: 'US',
          ispType: ispType as any,
        };

        const mockSetting = {
          ...mockDeviceGeoSetting,
          ispType,
        };

        mockGeoMatchingService.configureDeviceGeo.mockResolvedValue(mockSetting);

        const result = await controller.configureDeviceGeo(dto);

        expect(result.data.ispType).toBe(ispType);
        expect(geoMatchingService.configureDeviceGeo).toHaveBeenCalledWith(dto);
      }
    });
  });

  describe('batchConfigureGeo', () => {
    it('should batch configure multiple devices', async () => {
      const dto: BatchConfigureGeoDto = {
        configs: [
          {
            deviceId: 'device-1',
            userId: 'user-1',
            targetCountry: 'US',
            ispType: 'residential',
          },
          {
            deviceId: 'device-2',
            userId: 'user-2',
            targetCountry: 'UK',
            ispType: 'datacenter',
          },
        ],
      };

      const mockResult = {
        success: 2,
        failed: 0,
        errors: [],
      };

      mockGeoMatchingService.batchConfigureDeviceGeo.mockResolvedValue(mockResult);

      const result = await controller.batchConfigureGeo(dto);

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(2);
      expect(result.data.failed).toBe(0);
      expect(geoMatchingService.batchConfigureDeviceGeo).toHaveBeenCalledWith(
        dto.configs,
      );
    });

    it('should handle partial failures', async () => {
      const dto: BatchConfigureGeoDto = {
        configs: [
          { deviceId: 'device-1', userId: 'user-1', targetCountry: 'US' },
          { deviceId: 'device-2', userId: 'user-2', targetCountry: 'INVALID' },
        ],
      };

      const mockResult = {
        success: 1,
        failed: 1,
        errors: [{ deviceId: 'device-2', error: 'Invalid country' }],
      };

      mockGeoMatchingService.batchConfigureDeviceGeo.mockResolvedValue(mockResult);

      const result = await controller.batchConfigureGeo(dto);

      expect(result.data.success).toBe(1);
      expect(result.data.failed).toBe(1);
      expect(result.data.errors).toHaveLength(1);
    });
  });

  describe('getDeviceGeoSetting', () => {
    it('should return device geo setting', async () => {
      const deviceId = 'device-123';

      mockGeoMatchingService.getDeviceGeoSetting.mockResolvedValue(
        mockDeviceGeoSetting,
      );

      const result = await controller.getDeviceGeoSetting(deviceId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDeviceGeoSetting);
      expect(geoMatchingService.getDeviceGeoSetting).toHaveBeenCalledWith(deviceId);
    });

    it('should return null for device without setting', async () => {
      mockGeoMatchingService.getDeviceGeoSetting.mockResolvedValue(null);

      const result = await controller.getDeviceGeoSetting('device-new');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('matchProxiesByGeo', () => {
    it('should match proxies by geo', async () => {
      const dto: GeoMatchQueryDto = {
        targetCountry: 'US',
        targetCity: 'New York',
        ispType: 'residential',
        limit: 5,
      };

      const mockMatches = [
        {
          proxy: { id: 'proxy-1', country: 'US', city: 'New York' },
          matchScore: 95,
          matchReasons: ['Country match', 'City match'],
        },
        {
          proxy: { id: 'proxy-2', country: 'US', city: 'New York' },
          matchScore: 90,
          matchReasons: ['Country match', 'City match'],
        },
      ];

      mockGeoMatchingService.matchProxiesByGeo.mockResolvedValue(mockMatches);

      const result = await controller.matchProxiesByGeo(dto);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].matchScore).toBe(95);
      expect(geoMatchingService.matchProxiesByGeo).toHaveBeenCalledWith(dto);
    });

    it('should handle no matches', async () => {
      const dto: GeoMatchQueryDto = {
        targetCountry: 'RARE',
      };

      mockGeoMatchingService.matchProxiesByGeo.mockResolvedValue([]);

      const result = await controller.matchProxiesByGeo(dto);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('recommendGeoLocation', () => {
    it('should recommend geo location', async () => {
      const dto: GeoRecommendationDto = {
        targetUrl: 'https://www.amazon.com',
        userId: 'user-123',
      };

      const mockRecommendation = {
        recommendedCountry: 'US',
        recommendedCity: 'Seattle',
        reason: 'Target domain is US-based',
        alternatives: [
          { country: 'US', city: 'New York', reason: 'Alternative location' },
        ],
      };

      mockGeoMatchingService.recommendGeoLocation.mockResolvedValue(
        mockRecommendation,
      );

      const result = await controller.recommendGeoLocation(dto);

      expect(result.success).toBe(true);
      expect(result.data.recommendedCountry).toBe('US');
      expect(result.data.alternatives).toHaveLength(1);
      expect(geoMatchingService.recommendGeoLocation).toHaveBeenCalledWith(dto);
    });

    it('should recommend for different domains', async () => {
      const testCases = [
        { url: 'https://amazon.co.uk', country: 'UK' },
        { url: 'https://taobao.com', country: 'CN' },
      ];

      for (const testCase of testCases) {
        const dto: GeoRecommendationDto = {
          targetUrl: testCase.url,
          userId: 'user-123',
        };

        mockGeoMatchingService.recommendGeoLocation.mockResolvedValue({
          recommendedCountry: testCase.country,
          reason: 'Domain based recommendation',
          alternatives: [],
        });

        const result = await controller.recommendGeoLocation(dto);

        expect(result.data.recommendedCountry).toBe(testCase.country);
      }
    });
  });

  describe('getIspProviders', () => {
    it('should return all ISP providers', async () => {
      const mockProviders = [
        {
          id: 'isp-1',
          country: 'US',
          ispName: 'Comcast',
          ispType: 'residential',
          proxyCount: 500,
          lastUpdated: new Date(),
        },
        {
          id: 'isp-2',
          country: 'US',
          ispName: 'Verizon',
          ispType: 'residential',
          proxyCount: 450,
          lastUpdated: new Date(),
        },
      ];

      mockGeoMatchingService.getIspProviders.mockResolvedValue(mockProviders);

      const result = await controller.getIspProviders();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(geoMatchingService.getIspProviders).toHaveBeenCalledWith({
        country: undefined,
        ispType: undefined,
        limit: undefined,
      });
    });

    it('should filter by country', async () => {
      const mockProviders = [
        {
          id: 'isp-uk-1',
          country: 'UK',
          ispName: 'BT',
          ispType: 'residential',
          proxyCount: 300,
          lastUpdated: new Date(),
        },
      ];

      mockGeoMatchingService.getIspProviders.mockResolvedValue(mockProviders);

      const result = await controller.getIspProviders('UK');

      expect(result.data[0].country).toBe('UK');
      expect(geoMatchingService.getIspProviders).toHaveBeenCalledWith({
        country: 'UK',
        ispType: undefined,
        limit: undefined,
      });
    });

    it('should filter by ISP type and limit', async () => {
      const mockProviders = Array(3)
        .fill(null)
        .map((_, i) => ({
          id: `isp-${i}`,
          country: 'US',
          ispName: `Provider-${i}`,
          ispType: 'datacenter',
          proxyCount: 100,
          lastUpdated: new Date(),
        }));

      mockGeoMatchingService.getIspProviders.mockResolvedValue(mockProviders);

      const result = await controller.getIspProviders(undefined, 'datacenter', 3);

      expect(result.data).toHaveLength(3);
      expect(geoMatchingService.getIspProviders).toHaveBeenCalledWith({
        country: undefined,
        ispType: 'datacenter',
        limit: 3,
      });
    });
  });

  describe('getGeoStatistics', () => {
    it('should return geo statistics', async () => {
      const mockStats = {
        totalDevices: 100,
        devicesByCountry: {
          US: 45,
          UK: 25,
          CN: 20,
        },
        devicesByIspType: {
          residential: 60,
          datacenter: 30,
          mobile: 10,
        },
        topCities: [
          { city: 'New York', count: 15 },
          { city: 'London', count: 12 },
        ],
      };

      mockGeoMatchingService.getGeoStatistics.mockResolvedValue(mockStats);

      const result = await controller.getGeoStatistics();

      expect(result.success).toBe(true);
      expect(result.data.totalDevices).toBe(100);
      expect(result.data.devicesByCountry).toBeDefined();
      expect(result.data.topCities).toHaveLength(2);
      expect(geoMatchingService.getGeoStatistics).toHaveBeenCalledWith(undefined);
    });

    it('should filter by userId', async () => {
      const mockStats = {
        totalDevices: 10,
        devicesByCountry: { US: 6, UK: 4 },
        devicesByIspType: { residential: 8, datacenter: 2 },
        topCities: [{ city: 'New York', count: 4 }],
      };

      mockGeoMatchingService.getGeoStatistics.mockResolvedValue(mockStats);

      const result = await controller.getGeoStatistics('user-123');

      expect(result.data.totalDevices).toBe(10);
      expect(geoMatchingService.getGeoStatistics).toHaveBeenCalledWith('user-123');
    });

    it('should handle empty statistics', async () => {
      const mockStats = {
        totalDevices: 0,
        devicesByCountry: {},
        devicesByIspType: {},
        topCities: [],
      };

      mockGeoMatchingService.getGeoStatistics.mockResolvedValue(mockStats);

      const result = await controller.getGeoStatistics('user-new');

      expect(result.data.totalDevices).toBe(0);
      expect(Object.keys(result.data.devicesByCountry).length).toBe(0);
    });
  });

  describe('Response Format', () => {
    it('should return ProxyApiResponse for all endpoints', async () => {
      mockGeoMatchingService.configureDeviceGeo.mockResolvedValue(
        mockDeviceGeoSetting,
      );
      mockGeoMatchingService.batchConfigureDeviceGeo.mockResolvedValue({
        success: 0,
        failed: 0,
        errors: [],
      });
      mockGeoMatchingService.getDeviceGeoSetting.mockResolvedValue(
        mockDeviceGeoSetting,
      );
      mockGeoMatchingService.matchProxiesByGeo.mockResolvedValue([]);
      mockGeoMatchingService.recommendGeoLocation.mockResolvedValue({
        recommendedCountry: 'US',
        reason: 'test',
        alternatives: [],
      });
      mockGeoMatchingService.getIspProviders.mockResolvedValue([]);
      mockGeoMatchingService.getGeoStatistics.mockResolvedValue({
        totalDevices: 0,
        devicesByCountry: {},
        devicesByIspType: {},
        topCities: [],
      });

      const configResult = await controller.configureDeviceGeo({
        deviceId: 'test',
        userId: 'user-1',
        targetCountry: 'US',
      });
      const batchResult = await controller.batchConfigureGeo({ configs: [] });
      const getResult = await controller.getDeviceGeoSetting('device-1');
      const matchResult = await controller.matchProxiesByGeo({
        targetCountry: 'US',
      });
      const recommendResult = await controller.recommendGeoLocation({
        targetUrl: 'https://example.com',
        userId: 'user-1',
      });
      const ispResult = await controller.getIspProviders();
      const statsResult = await controller.getGeoStatistics();

      expect(configResult.success).toBe(true);
      expect(batchResult.success).toBe(true);
      expect(getResult.success).toBe(true);
      expect(matchResult.success).toBe(true);
      expect(recommendResult.success).toBe(true);
      expect(ispResult.success).toBe(true);
      expect(statsResult.success).toBe(true);
    });

    it('should include message in config endpoint', async () => {
      mockGeoMatchingService.configureDeviceGeo.mockResolvedValue(
        mockDeviceGeoSetting,
      );

      const result = await controller.configureDeviceGeo({
        deviceId: 'test',
        userId: 'user-1',
        targetCountry: 'US',
      });

      expect(result.message).toBe('Geo configuration saved');
    });
  });
});
