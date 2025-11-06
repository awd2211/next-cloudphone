import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePaymentMethods } from '../usePaymentMethods';
import { Modal, message } from 'antd';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock antd - create mocks inline
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  const mockForm = {
    resetFields: vi.fn(),
    validateFields: vi.fn(),
    setFieldsValue: vi.fn(),
    getFieldsValue: vi.fn(),
  };
  return {
    ...actual,
    Form: {
      useForm: vi.fn(() => [mockForm]),
    },
    Modal: {
      confirm: vi.fn(),
    },
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  };
});

describe('usePaymentMethods Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => usePaymentMethods());

      expect(result.current.paymentMethods).toEqual([]);
      expect(typeof result.current.loading).toBe('boolean');
      expect(result.current.addModalVisible).toBe(false);
      expect(result.current.form).toBeDefined();
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载支付方式列表', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      expect(result.current.paymentMethods).toHaveLength(3);
    });

    it('加载成功应该包含模拟数据', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBe(3);
      });

      const alipay = result.current.paymentMethods.find(p => p.type === 'alipay');
      expect(alipay).toBeDefined();
      expect(alipay?.isDefault).toBe(true);
    });
  });

  describe('handleAddPaymentMethod 添加支付方式', () => {
    it('添加成功应该显示成功消息', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      const values = {
        type: 'alipay',
        account: '138****5678',
      };

      await act(async () => {
        await result.current.handleAddPaymentMethod(values);
      });

      expect(message.success).toHaveBeenCalledWith('支付方式添加成功');
    });

    it('添加成功应该关闭弹窗', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.showAddModal();
      });

      expect(result.current.addModalVisible).toBe(true);

      const values = { type: 'wechat' };

      await act(async () => {
        await result.current.handleAddPaymentMethod(values);
      });

      expect(result.current.addModalVisible).toBe(false);
    });

    it('添加成功应该重置表单', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      const values = { type: 'wechat' };

      await act(async () => {
        await result.current.handleAddPaymentMethod(values);
      });

      expect(result.current.form.resetFields).toHaveBeenCalled();
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => usePaymentMethods());

      const firstHandle = result.current.handleAddPaymentMethod;
      rerender();
      const secondHandle = result.current.handleAddPaymentMethod;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleSetDefault 设置默认支付方式', () => {
    it('找不到支付方式时不应该执行', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSetDefault('non-existent-id');
      });

      expect(Modal.confirm).not.toHaveBeenCalled();
    });

    it('应该显示确认弹窗', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSetDefault('2');
      });

      expect(Modal.confirm).toHaveBeenCalled();
      const confirmConfig = vi.mocked(Modal.confirm).mock.calls[0][0];
      expect(confirmConfig.title).toBe('确认设置默认支付方式');
    });

    it('确认后应该显示成功消息', async () => {
      vi.mocked(Modal.confirm).mockImplementation((config: any) => {
        config.onOk();
        return { destroy: vi.fn() } as any;
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSetDefault('2');
      });

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('已设置为默认支付方式');
      });
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => usePaymentMethods());

      const firstHandle = result.current.handleSetDefault;
      rerender();
      const secondHandle = result.current.handleSetDefault;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleDelete 删除支付方式', () => {
    it('找不到支付方式时不应该执行', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleDelete('non-existent-id');
      });

      expect(Modal.confirm).not.toHaveBeenCalled();
    });

    it('删除默认支付方式时应该提示警告', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleDelete('1'); // id=1 是默认支付方式
      });

      expect(message.warning).toHaveBeenCalledWith(
        '默认支付方式不能删除，请先设置其他支付方式为默认'
      );
      expect(Modal.confirm).not.toHaveBeenCalled();
    });

    it('删除非默认支付方式应该显示确认弹窗', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleDelete('2'); // id=2 不是默认支付方式
      });

      expect(Modal.confirm).toHaveBeenCalled();
      const confirmConfig = vi.mocked(Modal.confirm).mock.calls[0][0];
      expect(confirmConfig.title).toBe('确认删除支付方式');
      expect(confirmConfig.okType).toBe('danger');
    });

    it('确认删除后应该显示成功消息', async () => {
      vi.mocked(Modal.confirm).mockImplementation((config: any) => {
        config.onOk();
        return { destroy: vi.fn() } as any;
      });

      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleDelete('2');
      });

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('支付方式已删除');
      });
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => usePaymentMethods());

      const firstHandle = result.current.handleDelete;
      rerender();
      const secondHandle = result.current.handleDelete;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('Modal 控制', () => {
    it('showAddModal应该打开弹窗', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.showAddModal();
      });

      expect(result.current.addModalVisible).toBe(true);
    });

    it('hideAddModal应该关闭弹窗', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.showAddModal();
        result.current.hideAddModal();
      });

      expect(result.current.addModalVisible).toBe(false);
    });

    it('hideAddModal应该重置表单', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.hideAddModal();
      });

      expect(result.current.form.resetFields).toHaveBeenCalled();
    });

    it('modal控制函数应该是稳定的引用', () => {
      const { result, rerender } = renderHook(() => usePaymentMethods());

      const firstShow = result.current.showAddModal;
      const firstHide = result.current.hideAddModal;

      rerender();

      expect(result.current.showAddModal).toBe(firstShow);
      expect(result.current.hideAddModal).toBe(firstHide);
    });
  });

  describe('goBack 导航', () => {
    it('应该导航到个人中心页', async () => {
      const { result } = renderHook(() => usePaymentMethods());

      await waitFor(() => {
        expect(result.current.paymentMethods.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.goBack();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => usePaymentMethods());

      const firstHandle = result.current.goBack;
      rerender();
      const secondHandle = result.current.goBack;

      expect(firstHandle).toBe(secondHandle);
    });
  });
});
