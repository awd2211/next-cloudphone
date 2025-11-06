import { useState, useEffect, useCallback } from 'react';
import { message, Form } from 'antd';
import type { Quota, CreateQuotaDto, UpdateQuotaDto } from '@/types';
import * as quotaService from '@/services/quota';
import { useSafeApi } from './useSafeApi';
import { QuotaAlertsResponseSchema } from '@/schemas/api.schemas';

interface UseQuotaListReturn {
  // 数据状态
  quotas: Quota[];
  loading: boolean;
  alerts: ReturnType<typeof useSafeApi>['data'];

  // Modal 状态
  createModalVisible: boolean;
  editModalVisible: boolean;
  selectedQuota: Quota | null;

  // Form 实例
  form: ReturnType<typeof Form.useForm>[0];
  editForm: ReturnType<typeof Form.useForm>[0];

  // 操作方法
  loadQuotas: () => Promise<void>;
  handleCreateQuota: (values: CreateQuotaDto) => Promise<void>;
  handleUpdateQuota: (values: UpdateQuotaDto) => Promise<void>;
  handleEdit: (record: Quota) => void;
  setCreateModalVisible: (visible: boolean) => void;
  setEditModalVisible: (visible: boolean) => void;
}

/**
 * 配额列表管理 Hook
 * 封装配额的 CRUD 操作和状态管理
 */
export const useQuotaList = (): UseQuotaListReturn => {
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedQuota, setSelectedQuota] = useState<Quota | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // ✅ 使用 useSafeApi 加载配额告警
  const {
    data: alertsResponse,
    execute: executeLoadAlerts,
  } = useSafeApi(
    () => quotaService.getQuotaAlerts(80),
    QuotaAlertsResponseSchema,
    {
      errorMessage: '加载配额告警失败',
      fallbackValue: { success: false, data: [] },
      showError: false,
    }
  );

  const alerts = alertsResponse?.success && alertsResponse.data ? alertsResponse.data : [];

  // 加载配额列表
  const loadQuotas = useCallback(async () => {
    setLoading(true);
    try {
      // 这里需要一个获取所有配额的API,暂时使用模拟数据
      // 实际应该有一个 GET /quotas 接口
      const mockQuotas: Quota[] = [];
      setQuotas(mockQuotas);
    } catch (error) {
      message.error('加载配额列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载配额告警的包装函数
  const loadAlerts = useCallback(async () => {
    await executeLoadAlerts();
  }, [executeLoadAlerts]);

  // 初始化加载
  useEffect(() => {
    loadQuotas();
    loadAlerts();
    // 每30秒刷新一次告警
    const alertInterval = setInterval(loadAlerts, 30000);
    return () => clearInterval(alertInterval);
  }, [loadQuotas, loadAlerts]);

  // 创建配额
  const handleCreateQuota = useCallback(
    async (values: CreateQuotaDto) => {
      try {
        const result = await quotaService.createQuota(values);
        if (result.success) {
          message.success('创建配额成功');
          setCreateModalVisible(false);
          form.resetFields();
          loadQuotas();
        } else {
          message.error(result.message || '创建配额失败');
        }
      } catch (error) {
        message.error('创建配额失败');
        console.error(error);
      }
    },
    [form, loadQuotas]
  );

  // 更新配额
  const handleUpdateQuota = useCallback(
    async (values: UpdateQuotaDto) => {
      if (!selectedQuota) return;
      try {
        const result = await quotaService.updateQuota(selectedQuota.id, values);
        if (result.success) {
          message.success('更新配额成功');
          setEditModalVisible(false);
          editForm.resetFields();
          loadQuotas();
        } else {
          message.error(result.message || '更新配额失败');
        }
      } catch (error) {
        message.error('更新配额失败');
        console.error(error);
      }
    },
    [selectedQuota, editForm, loadQuotas]
  );

  // 编辑配额
  const handleEdit = useCallback(
    (record: Quota) => {
      setSelectedQuota(record);
      editForm.setFieldsValue({
        limits: record.limits,
        autoRenew: record.autoRenew,
      });
      setEditModalVisible(true);
    },
    [editForm]
  );

  return {
    // 数据状态
    quotas,
    loading,
    alerts,

    // Modal 状态
    createModalVisible,
    editModalVisible,
    selectedQuota,

    // Form 实例
    form,
    editForm,

    // 操作方法
    loadQuotas,
    handleCreateQuota,
    handleUpdateQuota,
    handleEdit,
    setCreateModalVisible,
    setEditModalVisible,
  };
};
