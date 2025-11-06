import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResetPassword } from '../useResetPassword';
import * as authService from '@/services/auth';
import { message } from 'antd';

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock auth service
vi.mock('@/services/auth', () => ({
  verifyResetToken: vi.fn(),
  resetPassword: vi.fn(),
}));

describe('useResetPassword Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useResetPassword());

      expect(result.current.loading).toBe(false);
      expect(result.current.verifying).toBe(false);
      expect(result.current.tokenValid).toBe(false);
      expect(result.current.tokenError).toBe('');
      expect(result.current.success).toBe(false);
      expect(result.current.form).toBeDefined();
    });

    it('应该提供必需的方法', () => {
      const { result } = renderHook(() => useResetPassword());

      expect(typeof result.current.handleSubmit).toBe('function');
      expect(typeof result.current.verifyToken).toBe('function');
    });
  });

  describe('Token 验证', () => {
    it('应该成功验证有效的 token', async () => {
      vi.spyOn(authService, 'verifyResetToken').mockResolvedValue(undefined);

      const { result } = renderHook(() => useResetPassword());

      await act(async () => {
        await result.current.verifyToken('valid-token-123');
      });

      expect(result.current.tokenValid).toBe(true);
      expect(result.current.tokenError).toBe('');
      expect(result.current.verifying).toBe(false);
    });

    it('验证时应该设置 verifying 状态', async () => {
      vi.spyOn(authService, 'verifyResetToken').mockResolvedValue(undefined);

      const { result } = renderHook(() => useResetPassword());

      const verifyPromise = act(async () => {
        await result.current.verifyToken('valid-token');
      });

      await verifyPromise;
      expect(result.current.verifying).toBe(false);
    });

    it('应该处理无效的 token', async () => {
      const errorMessage = '重置链接已过期';
      vi.spyOn(authService, 'verifyResetToken').mockRejectedValue({
        response: {
          data: {
            message: errorMessage,
          },
        },
      });

      const { result } = renderHook(() => useResetPassword());

      await act(async () => {
        await result.current.verifyToken('invalid-token');
      });

      expect(result.current.tokenValid).toBe(false);
      expect(result.current.tokenError).toBe(errorMessage);
      expect(result.current.verifying).toBe(false);
    });

    it('应该处理网络错误', async () => {
      vi.spyOn(authService, 'verifyResetToken').mockRejectedValue(
        new Error('网络错误')
      );

      const { result } = renderHook(() => useResetPassword());

      await act(async () => {
        await result.current.verifyToken('some-token');
      });

      expect(result.current.tokenValid).toBe(false);
      expect(result.current.tokenError).toBe('网络错误');
    });

    it('应该显示默认错误消息', async () => {
      vi.spyOn(authService, 'verifyResetToken').mockRejectedValue({});

      const { result } = renderHook(() => useResetPassword());

      await act(async () => {
        await result.current.verifyToken('some-token');
      });

      expect(result.current.tokenError).toBe('重置链接无效或已过期');
    });

    it('验证前应该清空之前的错误', async () => {
      // 第一次验证失败
      vi.spyOn(authService, 'verifyResetToken').mockRejectedValueOnce(
        new Error('错误1')
      );

      const { result } = renderHook(() => useResetPassword());

      await act(async () => {
        await result.current.verifyToken('token1');
      });

      expect(result.current.tokenError).toBe('错误1');

      // 第二次验证前应该清空错误
      vi.spyOn(authService, 'verifyResetToken').mockResolvedValue(undefined);

      await act(async () => {
        await result.current.verifyToken('token2');
      });

      expect(result.current.tokenError).toBe('');
      expect(result.current.tokenValid).toBe(true);
    });
  });

  describe('密码重置', () => {
    it('应该成功重置密码', async () => {
      const mockResetPassword = vi
        .spyOn(authService, 'resetPassword')
        .mockResolvedValue(undefined);

      const { result } = renderHook(() => useResetPassword());

      await act(async () => {
        await result.current.handleSubmit('valid-token', {
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });
      });

      expect(mockResetPassword).toHaveBeenCalledWith({
        token: 'valid-token',
        password: 'NewPassword123!',
      });
      expect(result.current.success).toBe(true);
      expect(message.success).toHaveBeenCalledWith(
        '密码重置成功，请使用新密码登录'
      );
    });

    it('提交时应该设置 loading 状态', async () => {
      vi.spyOn(authService, 'resetPassword').mockResolvedValue(undefined);

      const { result } = renderHook(() => useResetPassword());

      expect(result.current.loading).toBe(false);

      await act(async () => {
        await result.current.handleSubmit('token', {
          password: 'NewPass123!',
          confirmPassword: 'NewPass123!',
        });
      });

      expect(result.current.loading).toBe(false);
    });

    it('应该处理 API 错误', async () => {
      const errorMessage = 'Token 已过期';
      vi.spyOn(authService, 'resetPassword').mockRejectedValue({
        response: {
          data: {
            message: errorMessage,
          },
        },
      });

      const { result } = renderHook(() => useResetPassword());

      await act(async () => {
        await result.current.handleSubmit('expired-token', {
          password: 'NewPass123!',
          confirmPassword: 'NewPass123!',
        });
      });

      expect(result.current.success).toBe(false);
      expect(message.error).toHaveBeenCalledWith(errorMessage);
      expect(result.current.loading).toBe(false);
    });

    it('应该处理网络错误', async () => {
      vi.spyOn(authService, 'resetPassword').mockRejectedValue(
        new Error('网络连接失败')
      );

      const { result } = renderHook(() => useResetPassword());

      await act(async () => {
        await result.current.handleSubmit('token', {
          password: 'NewPass123!',
          confirmPassword: 'NewPass123!',
        });
      });

      expect(result.current.success).toBe(false);
      expect(message.error).toHaveBeenCalledWith('网络连接失败');
    });

    it('应该显示默认错误消息', async () => {
      vi.spyOn(authService, 'resetPassword').mockRejectedValue({});

      const { result } = renderHook(() => useResetPassword());

      await act(async () => {
        await result.current.handleSubmit('token', {
          password: 'NewPass123!',
          confirmPassword: 'NewPass123!',
        });
      });

      expect(message.error).toHaveBeenCalledWith('重置失败，请稍后重试');
    });
  });

  describe('状态管理', () => {
    it('成功后 loading 应该恢复为 false', async () => {
      vi.spyOn(authService, 'resetPassword').mockResolvedValue(undefined);

      const { result } = renderHook(() => useResetPassword());

      await act(async () => {
        await result.current.handleSubmit('token', {
          password: 'NewPass123!',
          confirmPassword: 'NewPass123!',
        });
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.success).toBe(true);
    });

    it('失败后 loading 应该恢复为 false', async () => {
      vi.spyOn(authService, 'resetPassword').mockRejectedValue(
        new Error('失败')
      );

      const { result } = renderHook(() => useResetPassword());

      await act(async () => {
        await result.current.handleSubmit('token', {
          password: 'NewPass123!',
          confirmPassword: 'NewPass123!',
        });
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.success).toBe(false);
    });
  });

  describe('函数稳定性', () => {
    it('verifyToken 应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useResetPassword());

      const firstVerify = result.current.verifyToken;
      rerender();
      const secondVerify = result.current.verifyToken;

      expect(firstVerify).toBe(secondVerify);
    });

    it('handleSubmit 应该保持稳定', () => {
      const { result, rerender } = renderHook(() => useResetPassword());

      const firstSubmit = result.current.handleSubmit;
      rerender();
      const secondSubmit = result.current.handleSubmit;

      expect(firstSubmit).toBe(secondSubmit);
    });
  });

  describe('综合场景', () => {
    it('应该正确处理完整的重置流程', async () => {
      // 1. 验证 token
      vi.spyOn(authService, 'verifyResetToken').mockResolvedValue(undefined);

      const { result } = renderHook(() => useResetPassword());

      await act(async () => {
        await result.current.verifyToken('valid-token');
      });

      expect(result.current.tokenValid).toBe(true);

      // 2. 重置密码
      vi.spyOn(authService, 'resetPassword').mockResolvedValue(undefined);

      await act(async () => {
        await result.current.handleSubmit('valid-token', {
          password: 'NewPass123!',
          confirmPassword: 'NewPass123!',
        });
      });

      expect(result.current.success).toBe(true);
    });

    it('token 无效时不应继续重置', async () => {
      vi.spyOn(authService, 'verifyResetToken').mockRejectedValue(
        new Error('无效')
      );

      const { result } = renderHook(() => useResetPassword());

      await act(async () => {
        await result.current.verifyToken('invalid-token');
      });

      expect(result.current.tokenValid).toBe(false);
      expect(result.current.tokenError).toBeTruthy();
    });
  });
});
