import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from '@/utils/request';

// Mock request
vi.mock('@/utils/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import services after mocking
import * as authService from '../auth';
import * as appService from '../app';
import * as deviceService from '../device';

describe('Services API调用测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth Service', () => {
    describe('基础认证 API', () => {
      it('getCaptcha应该调用正确的端点', async () => {
        vi.mocked(request.get).mockResolvedValue({ captcha: 'image-data' });

        await authService.getCaptcha();

        expect(request.get).toHaveBeenCalledWith('/auth/captcha');
        expect(request.get).toHaveBeenCalledTimes(1);
      });

      it('register应该使用POST请求', async () => {
        const registerData = {
          username: 'testuser',
          password: 'Password123!',
          email: 'test@example.com',
          captcha: '1234',
        };

        vi.mocked(request.post).mockResolvedValue({ id: 1, username: 'testuser' });

        await authService.register(registerData);

        expect(request.post).toHaveBeenCalledWith('/auth/register', registerData);
        expect(request.post).toHaveBeenCalledTimes(1);
      });

      it('login应该使用POST请求并返回token和用户信息', async () => {
        const loginData = {
          username: 'testuser',
          password: 'Password123!',
          captcha: '1234',
        };

        const mockResponse = {
          token: 'jwt-token-123',
          user: { id: 1, username: 'testuser' },
        };

        vi.mocked(request.post).mockResolvedValue(mockResponse);

        const result = await authService.login(loginData);

        expect(request.post).toHaveBeenCalledWith('/auth/login', loginData);
        expect(result).toEqual(mockResponse);
      });

      it('getCurrentUser应该调用/auth/me端点', async () => {
        vi.mocked(request.get).mockResolvedValue({ id: 1, username: 'testuser' });

        await authService.getCurrentUser();

        expect(request.get).toHaveBeenCalledWith('/auth/me');
      });

      it('logout应该使用POST请求', async () => {
        vi.mocked(request.post).mockResolvedValue({});

        await authService.logout();

        expect(request.post).toHaveBeenCalledWith('/auth/logout');
      });
    });

    describe('忘记密码/重置密码 API', () => {
      it('forgotPassword应该支持邮箱重置', async () => {
        const data = {
          type: 'email' as const,
          email: 'test@example.com',
        };

        vi.mocked(request.post).mockResolvedValue({});

        await authService.forgotPassword(data);

        expect(request.post).toHaveBeenCalledWith('/auth/forgot-password', data);
      });

      it('forgotPassword应该支持手机号重置', async () => {
        const data = {
          type: 'phone' as const,
          phone: '13800138000',
        };

        vi.mocked(request.post).mockResolvedValue({});

        await authService.forgotPassword(data);

        expect(request.post).toHaveBeenCalledWith('/auth/forgot-password', data);
      });

      it('verifyResetToken应该验证token', async () => {
        const token = 'reset-token-123';

        vi.mocked(request.get).mockResolvedValue({ valid: true });

        await authService.verifyResetToken(token);

        expect(request.get).toHaveBeenCalledWith(`/auth/verify-reset-token/${token}`);
      });

      it('resetPassword应该提交新密码', async () => {
        const data = {
          token: 'reset-token-123',
          password: 'NewPassword123!',
        };

        vi.mocked(request.post).mockResolvedValue({});

        await authService.resetPassword(data);

        expect(request.post).toHaveBeenCalledWith('/auth/reset-password', data);
      });
    });

    describe('安全中心 API', () => {
      it('changePassword应该修改密码', async () => {
        const data = {
          oldPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        };

        vi.mocked(request.post).mockResolvedValue({});

        await authService.changePassword(data);

        expect(request.post).toHaveBeenCalledWith('/auth/change-password', data);
      });

      it('get2FAStatus应该获取双因素认证状态', async () => {
        vi.mocked(request.get).mockResolvedValue({ enabled: false });

        await authService.get2FAStatus();

        expect(request.get).toHaveBeenCalledWith('/auth/2fa/status');
      });

      it('enable2FA应该启用双因素认证', async () => {
        vi.mocked(request.post).mockResolvedValue({
          qrCode: 'qr-code-image',
          secret: 'secret-key',
        });

        await authService.enable2FA();

        expect(request.post).toHaveBeenCalledWith('/auth/2fa/enable');
      });

      it('verify2FACode应该验证双因素认证代码', async () => {
        const data = { code: '123456' };

        vi.mocked(request.post).mockResolvedValue({ success: true });

        await authService.verify2FACode(data);

        expect(request.post).toHaveBeenCalledWith('/auth/2fa/verify', data);
      });

      it('disable2FA应该禁用双因素认证', async () => {
        const data = { password: 'Password123!' };

        vi.mocked(request.post).mockResolvedValue({});

        await authService.disable2FA(data);

        expect(request.post).toHaveBeenCalledWith('/auth/2fa/disable', data);
      });

      it('getLoginHistory应该获取登录历史', async () => {
        const params = {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          success: true,
        };

        vi.mocked(request.get).mockResolvedValue([]);

        await authService.getLoginHistory(params);

        expect(request.get).toHaveBeenCalledWith('/auth/login-history', { params });
      });

      it('getLoginHistory无参数时应该也能调用', async () => {
        vi.mocked(request.get).mockResolvedValue([]);

        await authService.getLoginHistory();

        expect(request.get).toHaveBeenCalledWith('/auth/login-history', { params: undefined });
      });

      it('getActiveSessions应该获取活跃会话', async () => {
        vi.mocked(request.get).mockResolvedValue([]);

        await authService.getActiveSessions();

        expect(request.get).toHaveBeenCalledWith('/auth/sessions');
      });

      it('terminateSession应该终止单个会话', async () => {
        const sessionId = 'session-123';

        vi.mocked(request.delete).mockResolvedValue({});

        await authService.terminateSession(sessionId);

        expect(request.delete).toHaveBeenCalledWith(`/auth/sessions/${sessionId}`);
      });

      it('terminateAllSessions应该终止所有其他会话', async () => {
        vi.mocked(request.delete).mockResolvedValue({});

        await authService.terminateAllSessions();

        expect(request.delete).toHaveBeenCalledWith('/auth/sessions/all');
      });
    });
  });

  describe('App Service', () => {
    describe('应用列表 API', () => {
      it('getApps应该获取应用列表', async () => {
        const params = {
          page: 1,
          pageSize: 10,
          category: 'game',
          search: 'test',
        };

        vi.mocked(request.get).mockResolvedValue({
          items: [],
          total: 0,
        });

        await appService.getApps(params);

        expect(request.get).toHaveBeenCalledWith('/apps', { params });
      });

      it('getApp应该获取应用详情', async () => {
        const appId = 'app-123';

        vi.mocked(request.get).mockResolvedValue({
          id: appId,
          name: 'Test App',
        });

        await appService.getApp(appId);

        expect(request.get).toHaveBeenCalledWith(`/apps/${appId}`);
      });

      it('installAppToDevice应该安装应用到设备', async () => {
        const deviceId = 'device-123';
        const appId = 'app-456';

        vi.mocked(request.post).mockResolvedValue({});

        await appService.installAppToDevice(deviceId, appId);

        expect(request.post).toHaveBeenCalledWith('/apps/install', { deviceId, appId });
      });

      it('getAppList应该支持状态筛选', async () => {
        const params = {
          status: 'approved',
          page: 1,
          pageSize: 20,
        };

        vi.mocked(request.get).mockResolvedValue({
          items: [],
          total: 0,
        });

        await appService.getAppList(params);

        expect(request.get).toHaveBeenCalledWith('/apps', { params });
      });
    });

    describe('已安装应用管理 API', () => {
      it('getInstalledApps应该获取设备已安装应用', async () => {
        const deviceId = 'device-123';

        vi.mocked(request.get).mockResolvedValue([]);

        await appService.getInstalledApps(deviceId);

        expect(request.get).toHaveBeenCalledWith(`/devices/${deviceId}/installed-apps`);
      });

      it('uninstallApp应该卸载应用', async () => {
        const deviceId = 'device-123';
        const packageName = 'com.example.app';

        vi.mocked(request.delete).mockResolvedValue({});

        await appService.uninstallApp(deviceId, packageName);

        expect(request.delete).toHaveBeenCalledWith(`/devices/${deviceId}/apps/${packageName}`);
      });

      it('batchUninstallApps应该批量卸载应用', async () => {
        const deviceId = 'device-123';
        const data = {
          packageNames: ['com.example.app1', 'com.example.app2'],
        };

        vi.mocked(request.post).mockResolvedValue({
          results: [
            { packageName: 'com.example.app1', success: true },
            { packageName: 'com.example.app2', success: true },
          ],
        });

        await appService.batchUninstallApps(deviceId, data);

        expect(request.post).toHaveBeenCalledWith(
          `/devices/${deviceId}/apps/batch-uninstall`,
          data
        );
      });

      it('updateApp应该更新应用', async () => {
        const deviceId = 'device-123';
        const packageName = 'com.example.app';

        vi.mocked(request.post).mockResolvedValue({});

        await appService.updateApp(deviceId, packageName);

        expect(request.post).toHaveBeenCalledWith(
          `/devices/${deviceId}/apps/${packageName}/update`
        );
      });
    });
  });

  describe('Device Service', () => {
    describe('设备基础 API', () => {
      it('getMyDevices应该获取我的设备列表', async () => {
        const params = { page: 1, pageSize: 10 };

        vi.mocked(request.get).mockResolvedValue({
          items: [],
          total: 0,
        });

        await deviceService.getMyDevices(params);

        expect(request.get).toHaveBeenCalledWith('/devices/my', { params });
      });

      it('getDevice应该获取设备详情', async () => {
        const deviceId = 'device-123';

        vi.mocked(request.get).mockResolvedValue({
          id: deviceId,
          name: 'Test Device',
        });

        await deviceService.getDevice(deviceId);

        expect(request.get).toHaveBeenCalledWith(`/devices/${deviceId}`);
      });

      it('startDevice应该启动设备', async () => {
        const deviceId = 'device-123';

        vi.mocked(request.post).mockResolvedValue({});

        await deviceService.startDevice(deviceId);

        expect(request.post).toHaveBeenCalledWith(`/devices/${deviceId}/start`);
      });

      it('stopDevice应该停止设备', async () => {
        const deviceId = 'device-123';

        vi.mocked(request.post).mockResolvedValue({});

        await deviceService.stopDevice(deviceId);

        expect(request.post).toHaveBeenCalledWith(`/devices/${deviceId}/stop`);
      });

      it('rebootDevice应该重启设备', async () => {
        const deviceId = 'device-123';

        vi.mocked(request.post).mockResolvedValue({});

        await deviceService.rebootDevice(deviceId);

        expect(request.post).toHaveBeenCalledWith(`/devices/${deviceId}/reboot`);
      });

      it('getMyDeviceStats应该获取设备统计', async () => {
        vi.mocked(request.get).mockResolvedValue({
          total: 10,
          running: 5,
        });

        await deviceService.getMyDeviceStats();

        expect(request.get).toHaveBeenCalledWith('/devices/my/stats');
      });

      it('getDeviceStats应该获取单个设备统计', async () => {
        const deviceId = 'device-123';

        vi.mocked(request.get).mockResolvedValue({
          cpu: 50,
          memory: 70,
        });

        await deviceService.getDeviceStats(deviceId);

        expect(request.get).toHaveBeenCalledWith(`/devices/${deviceId}/stats`);
      });

      it('createDevice应该创建设备', async () => {
        const data: deviceService.CreateDeviceDto = {
          name: 'New Device',
          type: 'phone',
          cpuCores: 4,
          memoryMB: 4096,
        };

        vi.mocked(request.post).mockResolvedValue({
          success: true,
          data: {
            sagaId: 'saga-123',
            device: {},
          },
          message: 'Device creation started',
        });

        await deviceService.createDevice(data);

        expect(request.post).toHaveBeenCalledWith('/devices', data);
      });

      it('getDeviceCreationStatus应该查询创建进度', async () => {
        const sagaId = 'saga-123';

        vi.mocked(request.get).mockResolvedValue({
          sagaId,
          status: 'pending',
          currentStep: 'provisioning',
        });

        await deviceService.getDeviceCreationStatus(sagaId);

        expect(request.get).toHaveBeenCalledWith(`/devices/saga/${sagaId}`);
      });
    });

    describe('批量操作 API', () => {
      const deviceIds = ['device-1', 'device-2', 'device-3'];
      const batchData = { deviceIds };

      it('batchStartDevices应该批量启动设备', async () => {
        vi.mocked(request.post).mockResolvedValue({
          results: deviceIds.map((id) => ({ deviceId: id, success: true })),
        });

        await deviceService.batchStartDevices(batchData);

        expect(request.post).toHaveBeenCalledWith('/devices/batch/start', batchData);
      });

      it('batchStopDevices应该批量停止设备', async () => {
        vi.mocked(request.post).mockResolvedValue({
          results: deviceIds.map((id) => ({ deviceId: id, success: true })),
        });

        await deviceService.batchStopDevices(batchData);

        expect(request.post).toHaveBeenCalledWith('/devices/batch/stop', batchData);
      });

      it('batchRestartDevices应该批量重启设备', async () => {
        vi.mocked(request.post).mockResolvedValue({
          results: deviceIds.map((id) => ({ deviceId: id, success: true })),
        });

        await deviceService.batchRestartDevices(batchData);

        expect(request.post).toHaveBeenCalledWith('/devices/batch/restart', batchData);
      });

      it('batchDeleteDevices应该批量删除设备', async () => {
        vi.mocked(request.delete).mockResolvedValue({
          results: deviceIds.map((id) => ({ deviceId: id, success: true })),
        });

        await deviceService.batchDeleteDevices(batchData);

        expect(request.delete).toHaveBeenCalledWith('/devices/batch', { data: batchData });
      });

      it('batchInstallApp应该批量安装应用', async () => {
        const data: deviceService.BatchInstallAppDto = {
          appId: 'app-123',
          deviceIds,
        };

        vi.mocked(request.post).mockResolvedValue({
          results: deviceIds.map((id) => ({ deviceId: id, success: true })),
        });

        await deviceService.batchInstallApp(data);

        expect(request.post).toHaveBeenCalledWith('/devices/batch/install-app', data);
      });
    });
  });

  describe('API调用错误处理', () => {
    it('应该正确传递错误', async () => {
      const error = new Error('Network error');
      vi.mocked(request.get).mockRejectedValue(error);

      await expect(authService.getCaptcha()).rejects.toThrow('Network error');
    });

    it('应该正确传递HTTP错误', async () => {
      const error = { response: { status: 404, data: { message: 'Not found' } } };
      vi.mocked(request.get).mockRejectedValue(error);

      await expect(deviceService.getDevice('nonexistent')).rejects.toEqual(error);
    });
  });
});
