import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ApkParserService, ApkInfo } from '../apk-parser.service';
import * as fs from 'fs';
import * as path from 'path';

// Mock modules
jest.mock('fs');
jest.mock('path');

// Mock app-info-parser constructor
const mockParse = jest.fn();
jest.mock('app-info-parser', () => {
  return {
    AppInfoParser: jest.fn().mockImplementation(() => ({
      parse: mockParse,
    })),
  };
});

describe('ApkParserService', () => {
  let service: ApkParserService;

  const mockApkInfo = {
    package: 'com.test.app',
    name: 'Test App',
    versionName: '1.0.0',
    versionCode: '1',
    minSdkVersion: '21',
    targetSdkVersion: '30',
    usePermissions: ['android.permission.INTERNET', 'android.permission.CAMERA'],
    icon: Buffer.from('fake-icon-data'),
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    mockParse.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ApkParserService],
    }).compile();

    service = module.get<ApkParserService>(ApkParserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseApk', () => {
    const testApkPath = '/tmp/test.apk';

    it('should parse APK successfully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockParse.mockResolvedValue(mockApkInfo);
      (path.dirname as jest.Mock).mockReturnValue('/tmp');
      (path.join as jest.Mock).mockReturnValue('/tmp/icons/com.test.app.png');
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('icon-data'));

      const result = await service.parseApk(testApkPath);

      expect(result).toMatchObject({
        packageName: 'com.test.app',
        appName: 'Test App',
        versionName: '1.0.0',
        versionCode: 1,
        minSdkVersion: 21,
        targetSdkVersion: 30,
        permissions: ['android.permission.INTERNET', 'android.permission.CAMERA'],
      });
      expect(fs.existsSync).toHaveBeenCalledWith(testApkPath);
      expect(mockParse).toHaveBeenCalled();
    });

    it('should throw BadRequestException if APK file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.parseApk(testApkPath)).rejects.toThrow(BadRequestException);
      await expect(service.parseApk(testApkPath)).rejects.toThrow('APK 文件不存在');
    });

    it('should handle APK with missing fields', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockParse.mockResolvedValue({
        package: 'com.test.app',
        // Missing other fields
      } as any);
      (path.basename as jest.Mock).mockReturnValue('test.apk');

      const result = await service.parseApk(testApkPath);

      expect(result.packageName).toBe('com.test.app');
      expect(result.appName).toBe('test.apk');
      expect(result.versionName).toBe('1.0.0');
      expect(result.versionCode).toBe(1);
    });

    it('should handle permissions as objects', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockParse.mockResolvedValue({
        ...mockApkInfo,
        usePermissions: [
          { name: 'android.permission.INTERNET' },
          { name: 'android.permission.WRITE_EXTERNAL_STORAGE' },
        ],
      } as any);

      const result = await service.parseApk(testApkPath);

      expect(result.permissions).toEqual([
        'android.permission.INTERNET',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ]);
    });

    it('should handle APK parsing failure', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockParse.mockRejectedValue(new Error('Parse failed'));

      await expect(service.parseApk(testApkPath)).rejects.toThrow(BadRequestException);
      await expect(service.parseApk(testApkPath)).rejects.toThrow('APK 解析失败');
    });

    it('should extract icon when available', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockParse.mockResolvedValue(mockApkInfo);
      (path.dirname as jest.Mock).mockReturnValue('/tmp');
      (path.join as jest.Mock)
        .mockReturnValueOnce('/tmp/icons') // iconDir
        .mockReturnValueOnce('/tmp/icons/com.test.app.png'); // iconPath
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('icon-data'));

      const result = await service.parseApk(testApkPath);

      expect(result.icon).toBeDefined();
      expect(result.iconPath).toBeDefined();
    });

    it('should handle icon extraction failure gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockParse.mockResolvedValue(mockApkInfo);
      (path.dirname as jest.Mock).mockReturnValue('/tmp');
      (path.join as jest.Mock).mockImplementation(() => {
        throw new Error('Path error');
      });

      const result = await service.parseApk(testApkPath);

      // Should still return APK info even if icon extraction fails
      expect(result.packageName).toBe('com.test.app');
      expect(result.icon).toBeUndefined();
    });
  });

  describe('validateApk', () => {
    const testApkPath = '/tmp/test.apk';

    it('should validate APK successfully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 10 * 1024 * 1024 }); // 10MB
      mockParse.mockResolvedValue(mockApkInfo);

      const result = await service.validateApk(testApkPath);

      expect(result).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await service.validateApk(testApkPath);

      expect(result).toBe(false);
    });

    it('should return false if file extension is not .apk', async () => {
      const nonApkPath = '/tmp/test.txt';
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await service.validateApk(nonApkPath);

      expect(result).toBe(false);
    });

    it('should return false if file is too large', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        size: 600 * 1024 * 1024, // 600MB
      });

      // validateApk catches the exception and returns false
      const result = await service.validateApk(testApkPath);
      expect(result).toBe(false);
    });

    it('should return false if APK parsing fails', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 10 * 1024 * 1024 });
      mockParse.mockRejectedValue(new Error('Parse failed'));

      const result = await service.validateApk(testApkPath);

      expect(result).toBe(false);
    });
  });

  describe('getApkSummary', () => {
    const testApkPath = '/tmp/test.apk';

    it('should return APK summary for small file (bytes)', async () => {
      (fs.statSync as jest.Mock).mockReturnValue({ size: 500 });
      (path.basename as jest.Mock).mockReturnValue('test.apk');

      const result = await service.getApkSummary(testApkPath);

      expect(result).toEqual({
        fileName: 'test.apk',
        fileSize: 500,
        fileSizeFormatted: '500 B',
      });
    });

    it('should return APK summary for medium file (KB)', async () => {
      (fs.statSync as jest.Mock).mockReturnValue({ size: 2048 });
      (path.basename as jest.Mock).mockReturnValue('test.apk');

      const result = await service.getApkSummary(testApkPath);

      expect(result).toEqual({
        fileName: 'test.apk',
        fileSize: 2048,
        fileSizeFormatted: '2.00 KB',
      });
    });

    it('should return APK summary for large file (MB)', async () => {
      (fs.statSync as jest.Mock).mockReturnValue({
        size: 5 * 1024 * 1024,
      }); // 5MB
      (path.basename as jest.Mock).mockReturnValue('test.apk');

      const result = await service.getApkSummary(testApkPath);

      expect(result).toEqual({
        fileName: 'test.apk',
        fileSize: 5 * 1024 * 1024,
        fileSizeFormatted: '5.00 MB',
      });
    });

    it('should return APK summary for very large file (GB)', async () => {
      (fs.statSync as jest.Mock).mockReturnValue({
        size: 2 * 1024 * 1024 * 1024,
      }); // 2GB
      (path.basename as jest.Mock).mockReturnValue('test.apk');

      const result = await service.getApkSummary(testApkPath);

      expect(result).toEqual({
        fileName: 'test.apk',
        fileSize: 2 * 1024 * 1024 * 1024,
        fileSizeFormatted: '2.00 GB',
      });
    });
  });
});
