import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Modal, message } from 'antd';
import type { PaymentMethod } from '@/utils/paymentConfig';

/**
 * 支付方式管理 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useCallback 优化所有处理函数
 * 3. ✅ 统一错误处理和消息提示
 * 4. ✅ 集中管理所有状态
 * 5. ✅ Modal 确认逻辑封装
 */
export function usePaymentMethods() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // ===== 状态管理 =====
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // ===== 数据加载 =====
  /**
   * 加载支付方式列表
   */
  const loadPaymentMethods = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: 实际应该调用 API - 目前使用模拟数据
      const mockData: PaymentMethod[] = [
        {
          id: '1',
          type: 'alipay',
          account: '138****1234',
          isDefault: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          type: 'wechat',
          isDefault: false,
          createdAt: '2024-01-02T00:00:00Z',
        },
        {
          id: '3',
          type: 'bank_card',
          cardNumber: '6222021234567890',
          cardHolder: '张三',
          bankName: 'ICBC',
          isDefault: false,
          createdAt: '2024-01-03T00:00:00Z',
        },
      ];

      // 模拟 API 延迟
      await new Promise((resolve) => setTimeout(resolve, 300));
      setPaymentMethods(mockData);
    } catch (error: any) {
      message.error(error.message || '加载支付方式列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== 添加支付方式 =====
  /**
   * 添加支付方式
   */
  const handleAddPaymentMethod = useCallback(
    async (values: any) => {
      try {
        // TODO: 实际应该调用 API
        console.log('添加支付方式:', values);

        message.success('支付方式添加成功');
        setAddModalVisible(false);
        form.resetFields();
        await loadPaymentMethods();
      } catch (error: any) {
        message.error(error.message || '添加支付方式失败');
      }
    },
    [form, loadPaymentMethods]
  );

  // ===== 设置默认支付方式 =====
  /**
   * 设置默认支付方式（带确认 Modal）
   */
  const handleSetDefault = useCallback(
    async (id: string) => {
      const payment = paymentMethods.find((p) => p.id === id);
      if (!payment) return;

      Modal.confirm({
        title: '确认设置默认支付方式',
        content: `确定要将此支付方式设为默认吗？`,
        onOk: async () => {
          try {
            // TODO: 实际应该调用 API
            console.log('设置默认支付方式:', id);

            message.success('已设置为默认支付方式');
            await loadPaymentMethods();
          } catch (error: any) {
            message.error(error.message || '设置失败');
          }
        },
      });
    },
    [paymentMethods, loadPaymentMethods]
  );

  // ===== 删除支付方式 =====
  /**
   * 删除支付方式（带确认 Modal）
   */
  const handleDelete = useCallback(
    async (id: string) => {
      const payment = paymentMethods.find((p) => p.id === id);
      if (!payment) return;

      // 不允许删除默认支付方式
      if (payment.isDefault) {
        message.warning('默认支付方式不能删除，请先设置其他支付方式为默认');
        return;
      }

      Modal.confirm({
        title: '确认删除支付方式',
        content: '确定要删除此支付方式吗？删除后无法恢复。',
        okText: '确定删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          try {
            // TODO: 实际应该调用 API
            console.log('删除支付方式:', id);

            message.success('支付方式已删除');
            await loadPaymentMethods();
          } catch (error: any) {
            message.error(error.message || '删除失败');
          }
        },
      });
    },
    [paymentMethods, loadPaymentMethods]
  );

  // ===== Modal 控制 =====
  /**
   * 显示添加支付方式弹窗
   */
  const showAddModal = useCallback(() => {
    setAddModalVisible(true);
  }, []);

  /**
   * 隐藏添加支付方式弹窗
   */
  const hideAddModal = useCallback(() => {
    setAddModalVisible(false);
    form.resetFields();
  }, [form]);

  // ===== 导航 =====
  /**
   * 返回个人中心
   */
  const goBack = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  // ===== 副作用 =====
  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  // ===== 返回所有状态和方法 =====
  return {
    // 状态
    paymentMethods,
    loading,
    addModalVisible,

    // Form 实例
    form,

    // 操作
    handleAddPaymentMethod,
    handleSetDefault,
    handleDelete,

    // Modal 控制
    showAddModal,
    hideAddModal,

    // 导航
    goBack,

    // 刷新
    refetch: loadPaymentMethods,
  };
}
