/**
 * Auth Service Tests
 * 测试认证相关的 API 服务
 *
 * 注意：由于 axios 响应拦截器返回 response.data，
 * 所以所有service函数返回的都是 { success: true, data: {...} } 格式
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { axiosMock } from '@/test/mocks/axios-mock';
import {
  getCaptcha,
  login,
  logout,
  getCurrentUser,
  refreshToken,
  type LoginParams,
} from '../auth';

describe('Auth Service', () => {
  beforeEach(() => {
    // 清除所有 mock 调用历史
    vi.clearAllMocks();
  });

  describe('getCaptcha', () => {
    it('should fetch captcha successfully', async () => {
      const result = await getCaptcha();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('svg');
      expect(result.data.id).toBe('captcha-123');
    });

    it('should handle server error', async () => {
      // 直接覆盖此端点的 handler 配置错误响应
      axiosMock.onGet('/auth/captcha').networkError();

      await expect(getCaptcha()).rejects.toThrow();
    });
  });

  describe('login', () => {
    beforeEach(() => {
      // 确保每个测试都有干净的 localStorage
      localStorage.clear();
    });

    it('should login successfully with valid credentials', async () => {
      const params: LoginParams = {
        username: 'admin',
        password: 'password',
        captcha: 'correct',
        captchaId: 'captcha-123',
      };

      const result = await login(params);

      // 验证返回的是 { success: true, data: {...} } 格式
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('token');
      expect(result.data).toHaveProperty('user');
      expect(result.data.token).toBe('mock-jwt-token');
      expect(result.data.user.username).toBe('admin');
      expect(result.data.user.email).toBe('admin@example.com');
    });

    it('should return error for invalid credentials', async () => {
      const params: LoginParams = {
        username: 'invalid',
        password: 'wrong',
        captcha: 'correct',
        captchaId: 'captcha-123',
      };

      // axios-mock 已经在 axios-mock.ts 中配置了动态响应
      // username='invalid' 会返回 401 错误
      await expect(login(params)).rejects.toThrow();
    });

    it('should return error for incorrect captcha', async () => {
      const params: LoginParams = {
        username: 'admin',
        password: 'password',
        captcha: 'wrong',
        captchaId: 'captcha-123',
      };

      // axios-mock 已经在 axios-mock.ts 中配置了动态响应
      // captcha='wrong' 会返回 400 错误
      await expect(login(params)).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const result = await logout();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toBe('登出成功');
    });

    it('should handle logout error', async () => {
      // 直接覆盖此端点的 handler 配置错误响应
      axiosMock.onPost('/auth/logout').networkError();

      await expect(logout()).rejects.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const result = await getCurrentUser();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('username');
      expect(result.data.username).toBe('admin');
      expect(result.data.email).toBe('admin@example.com');
    });

    it('should return 401 if not authenticated', async () => {
      // 直接覆盖此端点的 handler 配置 401 响应
      axiosMock.onGet('/auth/me').reply(401, {
        success: false,
        message: '未登录',
      });

      // 由于响应拦截器会尝试刷新 token，这会触发额外的请求
      // 所以我们需要 mock refresh 请求也返回错误
      axiosMock.onPost('/auth/refresh').reply(401, {
        success: false,
        message: 'Token 已过期',
      });

      await expect(getCurrentUser()).rejects.toThrow();

      // 恢复默认的成功响应，避免影响后续测试
      axiosMock.onPost('/auth/refresh').reply(200, {
        success: true,
        data: {
          token: 'new-mock-jwt-token',
          refreshToken: 'new-refresh-token',
          expiresIn: '7d',
        },
      });
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      // 设置一个初始 token
      localStorage.setItem('token', 'old-token');
    });

    it('should refresh token successfully', async () => {
      const result = await refreshToken();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('token');
      expect(result.data.token).toBe('new-mock-jwt-token');
      expect(result.data.expiresIn).toBe('7d');
    });

    it('should handle refresh error', async () => {
      // 直接覆盖此端点的 handler 配置错误响应
      axiosMock.onPost('/auth/refresh').reply(401, {
        success: false,
        message: 'Token 已过期',
      });

      await expect(refreshToken()).rejects.toThrow();
    });
  });
});
