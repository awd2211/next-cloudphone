import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortManagerService } from './port-manager.service';
import { Device, DeviceStatus } from '../entities/device.entity';

describe('PortManagerService', () => {
  let service: PortManagerService;
  let deviceRepository: Repository<Device>;
  let mockRedis: any;

  const mockDeviceRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    // Mock Redis client
    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      exists: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortManagerService,
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<PortManagerService>(PortManagerService);
    deviceRepository = module.get<Repository<Device>>(getRepositoryToken(Device));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('端口分配', () => {
    it('应该成功分配一组端口（使用Redis）', async () => {
      // Mock: 端口未被占用
      mockRedis.exists.mockResolvedValue(0);

      const allocation = await service.allocatePorts();

      expect(allocation).toBeDefined();
      expect(allocation.adbPort).toBeGreaterThanOrEqual(5555);
      expect(allocation.adbPort).toBeLessThanOrEqual(6554);
      expect(allocation.webrtcPort).toBeGreaterThanOrEqual(8080);
      expect(allocation.webrtcPort).toBeLessThanOrEqual(9079);

      // 验证Redis调用
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('应该在端口被占用时重试', async () => {
      // 前3次尝试端口被占用，第4次成功
      mockRedis.exists
        .mockResolvedValueOnce(1) // 第1次：ADB端口被占用
        .mockResolvedValueOnce(1) // 第2次：ADB端口被占用
        .mockResolvedValueOnce(1) // 第3次：ADB端口被占用
        .mockResolvedValueOnce(0) // 第4次：ADB端口可用
        .mockResolvedValue(0); // 后续所有端口可用

      const allocation = await service.allocatePorts();

      expect(allocation).toBeDefined();
      expect(mockRedis.exists.mock.calls.length).toBeGreaterThan(2);
    });

    it('应该在所有端口被占用时抛出异常', async () => {
      // Mock: 所有端口都被占用
      mockRedis.exists.mockResolvedValue(1);

      await expect(service.allocatePorts()).rejects.toThrow();
    });
  });

  describe('端口释放', () => {
    it('应该成功释放一组端口（使用Redis）', async () => {
      const allocation = {
        adbPort: 5555,
        webrtcPort: 8080,
        scrcpyPort: 27183,
      };

      await service.releasePorts(allocation);

      // 验证Redis删除调用
      expect(mockRedis.del).toHaveBeenCalledTimes(3); // 3个端口
    });

    it('应该成功释放部分端口', async () => {
      const allocation = {
        adbPort: 5555,
        webrtcPort: 8080,
        // scrcpyPort 未分配
      };

      await service.releasePorts(allocation);

      // 验证只删除了2个端口
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
    });

    it('应该处理Redis失败的情况（降级到内存缓存）', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      const allocation = {
        adbPort: 5555,
        webrtcPort: 8080,
      };

      // 不应抛出异常，应该降级到内存缓存
      await expect(service.releasePorts(allocation)).resolves.not.toThrow();
    });
  });

  describe('Redis降级逻辑', () => {
    it('应该在Redis不可用时使用内存缓存', async () => {
      // 创建没有Redis的服务实例
      const moduleWithoutRedis = await Test.createTestingModule({
        providers: [
          PortManagerService,
          {
            provide: getRepositoryToken(Device),
            useValue: mockDeviceRepository,
          },
          // 不提供 REDIS_CLIENT
        ],
      }).compile();

      const serviceWithoutRedis = moduleWithoutRedis.get<PortManagerService>(PortManagerService);

      // 应该能正常分配端口
      const allocation = await serviceWithoutRedis.allocatePorts();

      expect(allocation).toBeDefined();
      expect(allocation.adbPort).toBeGreaterThanOrEqual(5555);
    });
  });

  describe('端口范围验证', () => {
    it('分配的ADB端口应该在有效范围内', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const allocation = await service.allocatePorts();

      expect(allocation.adbPort).toBeGreaterThanOrEqual(5555);
      expect(allocation.adbPort).toBeLessThanOrEqual(6554);
    });

    it('分配的WebRTC端口应该在有效范围内', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const allocation = await service.allocatePorts();

      expect(allocation.webrtcPort).toBeGreaterThanOrEqual(8080);
      expect(allocation.webrtcPort).toBeLessThanOrEqual(9079);
    });

    it('分配的Scrcpy端口应该在有效范围内（如果分配）', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const allocation = await service.allocatePorts();

      if (allocation.scrcpyPort) {
        expect(allocation.scrcpyPort).toBeGreaterThanOrEqual(27183);
        expect(allocation.scrcpyPort).toBeLessThanOrEqual(28182);
      }
    });
  });

  describe('初始化端口缓存', () => {
    it('应该从数据库加载已使用的端口', async () => {
      const mockDevices: Partial<Device>[] = [
        {
          id: 'device-1',
          adbPort: 5555,
          status: DeviceStatus.RUNNING,
          metadata: { webrtcPort: 8080 },
        },
        {
          id: 'device-2',
          adbPort: 5556,
          status: DeviceStatus.STOPPED,
          metadata: { webrtcPort: 8081, scrcpyPort: 27183 },
        },
      ];

      mockDeviceRepository.find.mockResolvedValue(mockDevices as Device[]);

      // 重新创建服务以触发初始化
      const module = await Test.createTestingModule({
        providers: [
          PortManagerService,
          {
            provide: getRepositoryToken(Device),
            useValue: mockDeviceRepository,
          },
          {
            provide: 'REDIS_CLIENT',
            useValue: mockRedis,
          },
        ],
      }).compile();

      const newService = module.get<PortManagerService>(PortManagerService);

      // 等待初始化完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证数据库查询被调用
      expect(mockDeviceRepository.find).toHaveBeenCalled();
    });

    it('应该处理数据库查询失败', async () => {
      mockDeviceRepository.find.mockRejectedValue(new Error('Database error'));

      // 不应抛出异常
      const module = await Test.createTestingModule({
        providers: [
          PortManagerService,
          {
            provide: getRepositoryToken(Device),
            useValue: mockDeviceRepository,
          },
          {
            provide: 'REDIS_CLIENT',
            useValue: mockRedis,
          },
        ],
      }).compile();

      expect(() => module.get<PortManagerService>(PortManagerService)).not.toThrow();
    });
  });

  describe('并发安全性（分布式锁）', () => {
    it('应该使用分布式锁防止端口冲突', async () => {
      // Mock: 第一次获取锁成功，端口未占用
      mockRedis.set.mockResolvedValueOnce('OK'); // 获取锁
      mockRedis.exists.mockResolvedValue(0); // 端口未占用

      const allocation = await service.allocatePorts();

      expect(allocation).toBeDefined();

      // 验证设置了锁和端口分配
      expect(mockRedis.set).toHaveBeenCalled(); // 设置锁
      expect(mockRedis.setex).toHaveBeenCalled(); // 设置端口占用
      expect(mockRedis.del).toHaveBeenCalled(); // 释放锁
    });

    it('应该在获取锁失败时重试', async () => {
      // 前2次获取锁失败，第3次成功
      mockRedis.set
        .mockResolvedValueOnce(null) // 第1次：锁被占用
        .mockResolvedValueOnce(null) // 第2次：锁被占用
        .mockResolvedValueOnce('OK'); // 第3次：获取锁成功

      mockRedis.exists.mockResolvedValue(0);

      const allocation = await service.allocatePorts();

      expect(allocation).toBeDefined();
      expect(mockRedis.set.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });
});
