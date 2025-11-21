import { useState, useCallback } from 'react';
import { Form, message, Modal } from 'antd';
import type { NetworkPolicy, PolicyFormValues, TestFormValues, TestResult } from '@/components/NetworkPolicy';
import { DEFAULT_FORM_VALUES } from '@/components/NetworkPolicy';
import request from '@/utils/request';
import { useValidatedQuery } from '@/hooks/utils';
import { NetworkPoliciesResponseSchema } from '@/schemas/api.schemas';

/**
 * 网络策略管理 Hook
 */
export const useNetworkPolicies = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<NetworkPolicy | null>(null);

  const [form] = Form.useForm<PolicyFormValues>();
  const [testForm] = Form.useForm<TestFormValues>();

  // ✅ 使用 useValidatedQuery 加载策略列表
  const {
    data: policies,
    isLoading: loading,
    refetch: loadPolicies,
  } = useValidatedQuery({
    queryKey: ['network-policies'],
    queryFn: () => request.get('/devices/network-policies'),
    schema: NetworkPoliciesResponseSchema,
    apiErrorMessage: '加载策略失败',
    fallbackValue: [],
    staleTime: 30 * 1000, // 30秒缓存
  });

  /**
   * 打开模态框
   */
  const openModal = useCallback(
    (policy?: NetworkPolicy) => {
      if (policy) {
        setEditingPolicy(policy);
        form.setFieldsValue({
          name: policy.name,
          description: policy.description,
          direction: policy.direction,
          protocol: policy.protocol,
          sourceIp: policy.sourceIp,
          destIp: policy.destIp,
          destPort: policy.destPort,
          action: policy.action,
          priority: policy.priority,
          isEnabled: policy.isEnabled,
          bandwidthLimit: policy.bandwidthLimit,
        });
      } else {
        setEditingPolicy(null);
        form.resetFields();
        form.setFieldsValue(DEFAULT_FORM_VALUES);
      }
      setModalVisible(true);
    },
    [form]
  );

  /**
   * 关闭模态框
   */
  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  /**
   * 提交表单
   */
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingPolicy) {
        await request.put(`/devices/network-policies/${editingPolicy.id}`, values);
        message.success('策略更新成功');
      } else {
        await request.post('/devices/network-policies', values);
        message.success('策略创建成功');
      }
      closeModal();
      loadPolicies();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('操作失败');
    }
  }, [editingPolicy, form, closeModal, loadPolicies]);

  /**
   * 删除策略
   */
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await request.delete(`/devices/network-policies/${id}`);
        message.success('策略删除成功');
        loadPolicies();
      } catch (error) {
        message.error('删除失败');
      }
    },
    [loadPolicies]
  );

  /**
   * 切换策略启用状态
   */
  const handleToggle = useCallback(
    async (id: string, isEnabled: boolean) => {
      try {
        await request.patch(`/devices/network-policies/${id}/toggle`, { isEnabled });
        message.success(`策略已${isEnabled ? '启用' : '停用'}`);
        loadPolicies();
      } catch (error) {
        message.error('操作失败');
      }
    },
    [loadPolicies]
  );

  /**
   * 打开测试模态框
   */
  const openTestModal = useCallback(() => {
    setTestModalVisible(true);
  }, []);

  /**
   * 关闭测试模态框
   */
  const closeTestModal = useCallback(() => {
    setTestModalVisible(false);
  }, []);

  /**
   * 执行连通性测试
   */
  const handleTest = useCallback(async () => {
    try {
      const values = await testForm.validateFields();
      const result: TestResult = await request.post('/devices/network-policies/test', values);
      Modal.success({
        title: '测试结果',
        content: `连通性: ${result.connected ? '成功' : '失败'}\n延迟: ${result.latency}ms\n带宽: ${result.bandwidth} Mbps`,
      });
      closeTestModal();
    } catch (error) {
      message.error('测试失败');
    }
  }, [testForm, closeTestModal]);

  return {
    // 状态
    policies,
    loading,
    modalVisible,
    testModalVisible,
    editingPolicy,

    // 表单
    form,
    testForm,

    // 方法
    openModal,
    closeModal,
    handleSubmit,
    handleDelete,
    handleToggle,
    openTestModal,
    closeTestModal,
    handleTest,
  };
};
