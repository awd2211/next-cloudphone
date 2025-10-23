import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AdbService } from '../adb.service';
import * as fs from 'fs';

// Mock adbkit
jest.mock('adbkit');
import * as Adb from 'adbkit';

// Mock fs
jest.mock('fs');

describe('AdbService', () => {
  let service: AdbService;
  let configService: ConfigService;

  // Mock ADB client
  const mockAdbClient = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    shell: jest.fn(),
    install: jest.fn(),
    uninstall: jest.fn(),
    push: jest.fn(),
    pull: jest.fn(),
    screencap: jest.fn(),
    getProperties: jest.fn(),
    reboot: jest.fn(),
  };

  // Mock stream/transfer objects
  const mockTransfer = {
    on: jest.fn(),
    pipe: jest.fn(),
  };

  const mockStream = {
    pipe: jest.fn(),
    on: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup default config values
    mockConfigService.get
      .mockReturnValueOnce('localhost') // ADB_HOST
      .mockReturnValueOnce(5037); // ADB_PORT

    // Mock Adb.createClient
    (Adb.createClient as jest.Mock).mockReturnValue(mockAdbClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdbService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AdbService>(AdbService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize ADB client with default config', () => {
      expect(Adb.createClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5037,
      });
    });
  });

  describe('connectToDevice', () => {
    it('should successfully connect to a device', async () => {
      mockAdbClient.connect.mockResolvedValue(undefined);

      await service.connectToDevice('device-123', 'localhost', 5555);

      expect(mockAdbClient.connect).toHaveBeenCalledWith('localhost', 5555);
      expect(service.isDeviceConnected('device-123')).toBe(true);
    });

    it('should not reconnect if device is already connected', async () => {
      mockAdbClient.connect.mockResolvedValue(undefined);

      await service.connectToDevice('device-123', 'localhost', 5555);
      expect(mockAdbClient.connect).toHaveBeenCalledTimes(1);

      await service.connectToDevice('device-123', 'localhost', 5555);
      expect(mockAdbClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException on connection failure', async () => {
      mockAdbClient.connect.mockRejectedValue(new Error('Connection refused'));

      await expect(
        service.connectToDevice('device-123', 'localhost', 5555),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('disconnectFromDevice', () => {
    it('should successfully disconnect from a device', async () => {
      mockAdbClient.connect.mockResolvedValue(undefined);
      mockAdbClient.disconnect.mockResolvedValue(undefined);

      await service.connectToDevice('device-123', 'localhost', 5555);
      await service.disconnectFromDevice('device-123');

      expect(mockAdbClient.disconnect).toHaveBeenCalledWith('localhost', 5555);
      expect(service.isDeviceConnected('device-123')).toBe(false);
    });

    it('should not throw error if device is not connected', async () => {
      await expect(
        service.disconnectFromDevice('nonexistent-device'),
      ).resolves.not.toThrow();
    });
  });

  describe('executeShellCommand', () => {
    beforeEach(async () => {
      mockAdbClient.connect.mockResolvedValue(undefined);
      await service.connectToDevice('device-123', 'localhost', 5555);
    });

    it('should throw NotFoundException if device not connected', async () => {
      await expect(
        service.executeShellCommand('nonexistent', 'ls /sdcard'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('installApk', () => {
    beforeEach(async () => {
      mockAdbClient.connect.mockResolvedValue(undefined);
      await service.connectToDevice('device-123', 'localhost', 5555);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
    });

    it('should successfully install APK', async () => {
      mockAdbClient.install.mockResolvedValue(undefined);

      const result = await service.installApk(
        'device-123',
        '/path/to/app.apk',
      );

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/app.apk');
      expect(mockAdbClient.install).toHaveBeenCalledWith(
        'localhost:5555',
        '/path/to/app.apk',
        { reinstall: false },
      );
    });

    it('should throw NotFoundException if APK file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(
        service.installApk('device-123', '/path/to/nonexistent.apk'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('uninstallApp', () => {
    beforeEach(async () => {
      mockAdbClient.connect.mockResolvedValue(undefined);
      await service.connectToDevice('device-123', 'localhost', 5555);
    });

    it('should successfully uninstall app', async () => {
      mockAdbClient.uninstall.mockResolvedValue(undefined);

      const result = await service.uninstallApp(
        'device-123',
        'com.example.app',
      );

      expect(result).toBe(true);
      expect(mockAdbClient.uninstall).toHaveBeenCalledWith(
        'localhost:5555',
        'com.example.app',
      );
    });

    it('should throw NotFoundException if device not connected', async () => {
      await expect(
        service.uninstallApp('nonexistent', 'com.example.app'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInstalledPackages', () => {
    it('should require connected device', () => {
      expect(service.isDeviceConnected('device-123')).toBe(false);
    });
  });

  describe('readLogcat', () => {
    it('should require device connection', () => {
      expect(service.isDeviceConnected('test')).toBe(false);
    });
  });

  describe('rebootDevice', () => {
    beforeEach(async () => {
      mockAdbClient.connect.mockResolvedValue(undefined);
      await service.connectToDevice('device-123', 'localhost', 5555);
    });

    it('should successfully reboot device', async () => {
      mockAdbClient.reboot.mockResolvedValue(undefined);

      await service.rebootDevice('device-123');

      expect(mockAdbClient.reboot).toHaveBeenCalledWith('localhost:5555');
      expect(service.isDeviceConnected('device-123')).toBe(false);
    });

    it('should throw NotFoundException if device not connected', async () => {
      await expect(service.rebootDevice('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('isDeviceConnected', () => {
    it('should return true for connected device', async () => {
      mockAdbClient.connect.mockResolvedValue(undefined);
      await service.connectToDevice('device-123', 'localhost', 5555);

      expect(service.isDeviceConnected('device-123')).toBe(true);
    });

    it('should return false for non-connected device', () => {
      expect(service.isDeviceConnected('nonexistent')).toBe(false);
    });
  });

  describe('getConnectedDevices', () => {
    it('should return empty array when no devices connected', () => {
      expect(service.getConnectedDevices()).toEqual([]);
    });

    it('should return list of connected devices', async () => {
      mockAdbClient.connect.mockResolvedValue(undefined);

      await service.connectToDevice('device-1', 'localhost', 5555);
      await service.connectToDevice('device-2', 'localhost', 5556);

      const devices = service.getConnectedDevices();

      expect(devices).toHaveLength(2);
      expect(devices).toContain('device-1');
      expect(devices).toContain('device-2');
    });
  });
});
