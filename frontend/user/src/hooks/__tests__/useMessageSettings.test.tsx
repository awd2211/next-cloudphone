import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMessageSettings } from '../useMessageSettings';
import * as notificationService from '@/services/notification';
import { message } from 'antd';
import dayjs from 'dayjs';

// Mock antd
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  const mockForm = {
    setFieldsValue: vi.fn(),
    validateFields: vi.fn(),
  };
  return {
    ...actual,
    Form: {
      useForm: vi.fn(() => [mockForm]),
    },
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock notification service
vi.mock('@/services/notification', () => ({
  getNotificationSettings: vi.fn(),
  updateNotificationSettings: vi.fn(),
}));

// Mock dayjs
vi.mock('dayjs', async () => {
  const actual = await vi.importActual('dayjs');
  const mockDayjs = vi.fn((value?: any, format?: string) => {
    if (value && format) {
      return {
        format: vi.fn(() => value),
      };
    }
    return actual.default(value, format);
  });
  return {
    default: mockDayjs,
  };
});

describe('useMessageSettings Hook', () => {
  const mockSettings = {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    soundEnabled: true,
    systemNotifications: true,
    ticketNotifications: true,
    orderNotifications: true,
    deviceNotifications: true,
    billingNotifications: true,
    promotionNotifications: false,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(notificationService.getNotificationSettings).mockResolvedValue(
      mockSettings as any
    );
    vi.mocked(notificationService.updateNotificationSettings).mockResolvedValue(
      undefined as any
    );
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useMessageSettings());

      expect(result.current.form).toBeDefined();
      expect(typeof result.current.loading).toBe('boolean');
      expect(typeof result.current.saving).toBe('boolean');
      expect(result.current.settings).toBeNull();
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载设置', async () => {
      renderHook(() => useMessageSettings());

      await waitFor(() => {
        expect(notificationService.getNotificationSettings).toHaveBeenCalled();
      });
    });

    it('加载成功应该更新settings', async () => {
      const { result } = renderHook(() => useMessageSettings());

      await waitFor(() => {
        expect(result.current.settings).toEqual(mockSettings);
      });
    });

    it('加载成功应该设置表单值', async () => {
      const { result } = renderHook(() => useMessageSettings());

      await waitFor(() => {
        expect(result.current.form.setFieldsValue).toHaveBeenCalled();
      });

      const callArg = vi.mocked(result.current.form.setFieldsValue).mock.calls[0][0];
      expect(callArg.emailEnabled).toBe(true);
      expect(callArg.smsEnabled).toBe(false);
    });

    it('加载失败应该显示错误消息', async () => {
      vi.mocked(notificationService.getNotificationSettings).mockRejectedValue(
        new Error('网络错误')
      );

      renderHook(() => useMessageSettings());

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载设置失败');
      });
    });
  });

  describe('handleSave 保存设置', () => {
    it('保存成功应该调用API', async () => {
      const { result } = renderHook(() => useMessageSettings());

      const mockFormValues = {
        emailEnabled: false,
        smsEnabled: true,
      };

      vi.mocked(result.current.form.validateFields).mockResolvedValue(
        mockFormValues as any
      );

      await waitFor(() => {
        expect(result.current.settings).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(notificationService.updateNotificationSettings).toHaveBeenCalledWith(
        mockFormValues
      );
    });

    it('保存成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useMessageSettings());

      vi.mocked(result.current.form.validateFields).mockResolvedValue({
        emailEnabled: false,
      } as any);

      await waitFor(() => {
        expect(result.current.settings).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(message.success).toHaveBeenCalledWith('保存成功');
    });

    it('保存成功应该重新加载设置', async () => {
      const { result } = renderHook(() => useMessageSettings());

      vi.mocked(result.current.form.validateFields).mockResolvedValue({
        emailEnabled: false,
      } as any);

      await waitFor(() => {
        expect(result.current.settings).not.toBeNull();
      });

      vi.clearAllMocks();

      await act(async () => {
        await result.current.handleSave();
      });

      await waitFor(() => {
        expect(notificationService.getNotificationSettings).toHaveBeenCalled();
      });
    });

    it('保存失败应该显示错误消息', async () => {
      vi.mocked(notificationService.updateNotificationSettings).mockRejectedValue(
        new Error('保存失败')
      );

      const { result } = renderHook(() => useMessageSettings());

      vi.mocked(result.current.form.validateFields).mockResolvedValue({
        emailEnabled: false,
      } as any);

      await waitFor(() => {
        expect(result.current.settings).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleSave();
      });

      expect(message.error).toHaveBeenCalledWith('保存失败');
    });

    it('应该处理时间格式转换', async () => {
      const { result } = renderHook(() => useMessageSettings());

      const mockFormValues = {
        emailEnabled: true,
        quietHoursStart: {
          format: vi.fn(() => '22:00'),
        },
        quietHoursEnd: {
          format: vi.fn(() => '08:00'),
        },
      };

      vi.mocked(result.current.form.validateFields).mockResolvedValue(
        mockFormValues as any
      );

      await waitFor(() => {
        expect(result.current.settings).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleSave();
      });

      const callArg = vi.mocked(notificationService.updateNotificationSettings).mock
        .calls[0][0];
      expect(callArg.quietHoursStart).toBe('22:00');
      expect(callArg.quietHoursEnd).toBe('08:00');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useMessageSettings());

      const firstHandle = result.current.handleSave;
      rerender();
      const secondHandle = result.current.handleSave;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleReset 重置设置', () => {
    it('应该重置为默认值', async () => {
      const { result } = renderHook(() => useMessageSettings());

      await waitFor(() => {
        expect(result.current.settings).not.toBeNull();
      });

      act(() => {
        result.current.handleReset();
      });

      expect(result.current.form.setFieldsValue).toHaveBeenCalledWith({
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        soundEnabled: true,
        systemNotifications: true,
        ticketNotifications: true,
        orderNotifications: true,
        deviceNotifications: true,
        billingNotifications: true,
        promotionNotifications: true,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
      });
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useMessageSettings());

      const firstHandle = result.current.handleReset;
      rerender();
      const secondHandle = result.current.handleReset;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('loading 和 saving 状态', () => {
    it('加载时loading应该为true', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(notificationService.getNotificationSettings).mockReturnValue(
        promise as any
      );

      const { result } = renderHook(() => useMessageSettings());

      // 加载时 loading 应该为 true
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // 完成后 loading 应该为 false
      resolvePromise(mockSettings);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('保存时saving应该为true', async () => {
      const { result } = renderHook(() => useMessageSettings());

      vi.mocked(result.current.form.validateFields).mockResolvedValue({
        emailEnabled: false,
      } as any);

      await waitFor(() => {
        expect(result.current.settings).not.toBeNull();
      });

      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(notificationService.updateNotificationSettings).mockReturnValue(
        promise as any
      );

      act(() => {
        result.current.handleSave();
      });

      // 保存时 saving 应该为 true
      await waitFor(() => {
        expect(result.current.saving).toBe(true);
      });

      // 完成后 saving 应该为 false
      resolvePromise(undefined);

      await waitFor(() => {
        expect(result.current.saving).toBe(false);
      });
    });
  });
});
