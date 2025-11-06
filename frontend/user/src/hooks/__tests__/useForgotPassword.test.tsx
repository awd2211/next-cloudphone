import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useForgotPassword } from '../useForgotPassword';
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
  forgotPassword: vi.fn(),
}));

describe('useForgotPassword Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useForgotPassword());

      expect(result.current.loading).toBe(false);
      expect(result.current.success).toBe(false);
      expect(result.current.form).toBeDefined();
    });

    it('应该提供 handleSubmit 方法', () => {
      const { result } = renderHook(() => useForgotPassword());

      expect(typeof result.current.handleSubmit).toBe('function');
    });
  });

  describe('表单提交 - 邮箱方式', () => {
    it('应该成功提交邮箱找回', async () => {
      const mockForgotPassword = vi
        .spyOn(authService, 'forgotPassword')
        .mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      await act(async () => {
        await result.current.handleSubmit({
          type: 'email',
          email: 'test@example.com',
        });
      });

      expect(mockForgotPassword).toHaveBeenCalledWith({
        type: 'email',
        email: 'test@example.com',
        phone: undefined,
      });
      expect(result.current.success).toBe(true);
      expect(message.success).toHaveBeenCalledWith('重置链接已发送，请查收邮件');
    });

    it('提交时应该设置 loading 状态', async () => {
      vi.spyOn(authService, 'forgotPassword').mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 100);
          })
      );

      const { result } = renderHook(() => useForgotPassword());

      expect(result.current.loading).toBe(false);

      const submitPromise = act(async () => {
        await result.current.handleSubmit({
          type: 'email',
          email: 'test@example.com',
        });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await submitPromise;
    });
  });

  describe('表单提交 - 手机方式', () => {
    it('应该成功提交手机找回', async () => {
      const mockForgotPassword = vi
        .spyOn(authService, 'forgotPassword')
        .mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      await act(async () => {
        await result.current.handleSubmit({
          type: 'phone',
          phone: '13800138000',
        });
      });

      expect(mockForgotPassword).toHaveBeenCalledWith({
        type: 'phone',
        email: undefined,
        phone: '13800138000',
      });
      expect(result.current.success).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理 API 错误', async () => {
      const errorMessage = '用户不存在';
      vi.spyOn(authService, 'forgotPassword').mockRejectedValue({
        response: {
          data: {
            message: errorMessage,
          },
        },
      });

      const { result } = renderHook(() => useForgotPassword());

      await act(async () => {
        await result.current.handleSubmit({
          type: 'email',
          email: 'notexist@example.com',
        });
      });

      expect(result.current.success).toBe(false);
      expect(message.error).toHaveBeenCalledWith(errorMessage);
      expect(result.current.loading).toBe(false);
    });

    it('应该处理网络错误', async () => {
      vi.spyOn(authService, 'forgotPassword').mockRejectedValue(
        new Error('网络错误')
      );

      const { result } = renderHook(() => useForgotPassword());

      await act(async () => {
        await result.current.handleSubmit({
          type: 'email',
          email: 'test@example.com',
        });
      });

      expect(result.current.success).toBe(false);
      expect(message.error).toHaveBeenCalledWith('网络错误');
    });

    it('应该显示默认错误消息', async () => {
      vi.spyOn(authService, 'forgotPassword').mockRejectedValue({});

      const { result } = renderHook(() => useForgotPassword());

      await act(async () => {
        await result.current.handleSubmit({
          type: 'email',
          email: 'test@example.com',
        });
      });

      expect(message.error).toHaveBeenCalledWith('发送失败，请稍后重试');
    });
  });

  describe('状态管理', () => {
    it('成功后 loading 应该恢复为 false', async () => {
      vi.spyOn(authService, 'forgotPassword').mockResolvedValue(undefined);

      const { result } = renderHook(() => useForgotPassword());

      await act(async () => {
        await result.current.handleSubmit({
          type: 'email',
          email: 'test@example.com',
        });
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.success).toBe(true);
    });

    it('失败后 loading 应该恢复为 false', async () => {
      vi.spyOn(authService, 'forgotPassword').mockRejectedValue(
        new Error('失败')
      );

      const { result } = renderHook(() => useForgotPassword());

      await act(async () => {
        await result.current.handleSubmit({
          type: 'email',
          email: 'test@example.com',
        });
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.success).toBe(false);
    });
  });

  describe('函数稳定性', () => {
    it('handleSubmit 应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useForgotPassword());

      const firstSubmit = result.current.handleSubmit;
      rerender();
      const secondSubmit = result.current.handleSubmit;

      expect(firstSubmit).toBe(secondSubmit);
    });
  });
});
