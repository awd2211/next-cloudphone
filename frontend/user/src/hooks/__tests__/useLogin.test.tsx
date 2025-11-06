import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLogin } from '../useLogin';
import * as authService from '@/services/auth';
import * as twoFactorService from '@/services/twoFactor';
import { message } from 'antd';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock antd
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
  };
});

// Mock auth service
vi.mock('@/services/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getCaptcha: vi.fn(),
}));

// Mock two factor service
vi.mock('@/services/twoFactor', () => ({
  verify2FA: vi.fn(),
}));

describe('useLogin Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // 默认 mock getCaptcha
    vi.spyOn(authService, 'getCaptcha').mockResolvedValue({
      id: 'captcha-123',
      svg: '<svg>test-captcha</svg>',
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('初始化', () => {
    it('应该有正确的初始状态', async () => {
      const { result } = renderHook(() => useLogin());

      await waitFor(() => {
        expect(result.current.captchaSvg).toBe('<svg>test-captcha</svg>');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.captchaLoading).toBe(false);
      expect(result.current.twoFactorModalVisible).toBe(false);
      expect(result.current.twoFactorToken).toBe('');
      expect(result.current.loginForm).toBeDefined();
      expect(result.current.registerForm).toBeDefined();
    });

    it('初始化时应该自动获取验证码', async () => {
      const mockGetCaptcha = vi.spyOn(authService, 'getCaptcha');

      renderHook(() => useLogin());

      await waitFor(() => {
        expect(mockGetCaptcha).toHaveBeenCalled();
      });
    });

    it('应该提供所有必需的方法', () => {
      const { result } = renderHook(() => useLogin());

      expect(typeof result.current.handleLogin).toBe('function');
      expect(typeof result.current.handleRegister).toBe('function');
      expect(typeof result.current.fetchCaptcha).toBe('function');
      expect(typeof result.current.handle2FAVerify).toBe('function');
      expect(typeof result.current.handle2FACancel).toBe('function');
      expect(typeof result.current.setTwoFactorToken).toBe('function');
    });
  });

  describe('验证码功能', () => {
    it('应该成功获取验证码', async () => {
      const { result } = renderHook(() => useLogin());

      await waitFor(() => {
        expect(result.current.captchaSvg).toBe('<svg>test-captcha</svg>');
      });
    });

    it('获取验证码失败时应该显示错误', async () => {
      vi.spyOn(authService, 'getCaptcha')
        .mockRejectedValueOnce(new Error('网络错误'))
        .mockResolvedValue({
          id: 'captcha-456',
          svg: '<svg>retry-captcha</svg>',
        });

      const { result } = renderHook(() => useLogin());

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('获取验证码失败');
      });

      // 手动刷新验证码
      await act(async () => {
        await result.current.fetchCaptcha();
      });

      await waitFor(() => {
        expect(result.current.captchaSvg).toBe('<svg>retry-captcha</svg>');
      });
    });

    it('应该能手动刷新验证码', async () => {
      const mockGetCaptcha = vi
        .spyOn(authService, 'getCaptcha')
        .mockResolvedValueOnce({
          id: 'captcha-1',
          svg: '<svg>captcha-1</svg>',
        })
        .mockResolvedValueOnce({
          id: 'captcha-2',
          svg: '<svg>captcha-2</svg>',
        });

      const { result } = renderHook(() => useLogin());

      await waitFor(() => {
        expect(result.current.captchaSvg).toBe('<svg>captcha-1</svg>');
      });

      await act(async () => {
        await result.current.fetchCaptcha();
      });

      await waitFor(() => {
        expect(result.current.captchaSvg).toBe('<svg>captcha-2</svg>');
        expect(mockGetCaptcha).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('登录功能', () => {
    it('应该成功登录并导航到 dashboard', async () => {
      const mockLogin = vi.spyOn(authService, 'login').mockResolvedValue({
        token: 'test-token-123',
        user: { id: 1, username: 'testuser', email: 'test@example.com' },
      });

      const { result } = renderHook(() => useLogin());

      await waitFor(() => {
        expect(result.current.captchaSvg).toBeTruthy();
      });

      await act(async () => {
        await result.current.handleLogin({
          username: 'testuser',
          password: 'password123',
          captcha: '1234',
        });
      });

      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
        captcha: '1234',
        captchaId: 'captcha-123',
      });
      expect(localStorage.getItem('token')).toBe('test-token-123');
      expect(message.success).toHaveBeenCalledWith('登录成功');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('登录失败时应该刷新验证码', async () => {
      vi.spyOn(authService, 'login').mockRejectedValue({
        response: {
          data: {
            message: '用户名或密码错误',
          },
        },
      });

      const mockGetCaptcha = vi.spyOn(authService, 'getCaptcha');

      const { result } = renderHook(() => useLogin());

      await waitFor(() => {
        expect(result.current.captchaSvg).toBeTruthy();
      });

      const initialCallCount = mockGetCaptcha.mock.calls.length;

      await act(async () => {
        await result.current.handleLogin({
          username: 'wronguser',
          password: 'wrongpass',
          captcha: '1234',
        });
      });

      expect(message.error).toHaveBeenCalledWith('用户名或密码错误');
      expect(mockGetCaptcha.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('需要2FA时应该显示2FA弹窗', async () => {
      vi.spyOn(authService, 'login').mockResolvedValue({
        requiresTwoFactor: true,
        message: '请输入双因素认证代码',
      });

      const { result } = renderHook(() => useLogin());

      await waitFor(() => {
        expect(result.current.captchaSvg).toBeTruthy();
      });

      await act(async () => {
        await result.current.handleLogin({
          username: 'testuser',
          password: 'password123',
          captcha: '1234',
        });
      });

      expect(result.current.twoFactorModalVisible).toBe(true);
      expect(message.info).toHaveBeenCalledWith('请输入双因素认证代码');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('2FA 验证', () => {
    it('应该成功验证2FA并登录', async () => {
      // 先模拟需要2FA的登录
      vi.spyOn(authService, 'login').mockResolvedValue({
        requiresTwoFactor: true,
      });

      const { result } = renderHook(() => useLogin());

      await waitFor(() => {
        expect(result.current.captchaSvg).toBeTruthy();
      });

      await act(async () => {
        await result.current.handleLogin({
          username: 'testuser',
          password: 'password123',
          captcha: '1234',
        });
      });

      // 设置2FA token
      act(() => {
        result.current.setTwoFactorToken('123456');
      });

      // Mock 2FA验证成功
      vi.spyOn(twoFactorService, 'verify2FA').mockResolvedValue({
        token: 'verified-token',
        user: { id: 1, username: 'testuser' },
      });

      await act(async () => {
        await result.current.handle2FAVerify();
      });

      expect(localStorage.getItem('token')).toBe('verified-token');
      expect(result.current.twoFactorModalVisible).toBe(false);
      expect(result.current.twoFactorToken).toBe('');
      expect(message.success).toHaveBeenCalledWith('登录成功');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('2FA验证码不足6位时应该提示错误', async () => {
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.setTwoFactorToken('123');
      });

      await act(async () => {
        await result.current.handle2FAVerify();
      });

      expect(message.error).toHaveBeenCalledWith('请输入6位验证码');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('2FA验证失败时应该显示错误', async () => {
      const { result } = renderHook(() => useLogin());

      // 先触发2FA流程
      vi.spyOn(authService, 'login').mockResolvedValue({
        requiresTwoFactor: true,
      });

      await waitFor(() => {
        expect(result.current.captchaSvg).toBeTruthy();
      });

      await act(async () => {
        await result.current.handleLogin({
          username: 'testuser',
          password: 'password123',
          captcha: '1234',
        });
      });

      act(() => {
        result.current.setTwoFactorToken('000000');
      });

      vi.spyOn(twoFactorService, 'verify2FA').mockRejectedValue({
        response: {
          data: {
            message: '验证码错误',
          },
        },
      });

      await act(async () => {
        await result.current.handle2FAVerify();
      });

      expect(message.error).toHaveBeenCalledWith('验证码错误');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('应该能取消2FA验证', async () => {
      const { result } = renderHook(() => useLogin());

      // 设置2FA modal为可见
      vi.spyOn(authService, 'login').mockResolvedValue({
        requiresTwoFactor: true,
      });

      await waitFor(() => {
        expect(result.current.captchaSvg).toBeTruthy();
      });

      await act(async () => {
        await result.current.handleLogin({
          username: 'testuser',
          password: 'password123',
          captcha: '1234',
        });
      });

      act(() => {
        result.current.setTwoFactorToken('123456');
      });

      // 取消2FA
      act(() => {
        result.current.handle2FACancel();
      });

      expect(result.current.twoFactorModalVisible).toBe(false);
      expect(result.current.twoFactorToken).toBe('');
    });
  });

  describe('注册功能', () => {
    it('应该成功注册', async () => {
      const mockRegister = vi.spyOn(authService, 'register').mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.handleRegister({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
        });
      });

      expect(mockRegister).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      });
      expect(message.success).toHaveBeenCalledWith('注册成功，请登录');
    });

    it('注册失败时应该显示错误', async () => {
      vi.spyOn(authService, 'register').mockRejectedValue(new Error('注册失败'));

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.handleRegister({
          username: 'existuser',
          email: 'exist@example.com',
          password: 'password123',
        });
      });

      expect(message.error).toHaveBeenCalledWith('注册失败');
    });
  });

  describe('状态管理', () => {
    it('登录成功后应该存储token和用户信息', async () => {
      const userData = { id: 1, username: 'testuser', email: 'test@example.com' };
      vi.spyOn(authService, 'login').mockResolvedValue({
        token: 'jwt-token-123',
        user: userData,
      });

      const { result } = renderHook(() => useLogin());

      await waitFor(() => {
        expect(result.current.captchaSvg).toBeTruthy();
      });

      await act(async () => {
        await result.current.handleLogin({
          username: 'testuser',
          password: 'password123',
          captcha: '1234',
        });
      });

      expect(localStorage.getItem('token')).toBe('jwt-token-123');
      expect(JSON.parse(localStorage.getItem('user') || '{}')).toEqual(userData);
    });

    it('loading状态应该正确管理', async () => {
      vi.spyOn(authService, 'login').mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ token: 'token', user: {} }), 100);
          })
      );

      const { result } = renderHook(() => useLogin());

      await waitFor(() => {
        expect(result.current.captchaSvg).toBeTruthy();
      });

      expect(result.current.loading).toBe(false);

      await act(async () => {
        await result.current.handleLogin({
          username: 'testuser',
          password: 'password123',
          captcha: '1234',
        });
      });

      expect(result.current.loading).toBe(false);
    });
  });
});
