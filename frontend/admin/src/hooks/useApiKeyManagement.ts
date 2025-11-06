import { useState, useCallback, useEffect } from 'react';
import { Form, message } from 'antd';
import { z } from 'zod';
import dayjs from 'dayjs';
import type { ApiKey, CreateApiKeyDto } from '@/types';
import {
  getUserApiKeys,
  getApiKeyById,
  createApiKey,
  updateApiKey,
  revokeApiKey,
  deleteApiKey,
  getApiKeyStatistics,
} from '@/services/apiKey';
import { useSafeApi } from './useSafeApi';
import { ApiKeySchema, ApiKeyStatisticsResponseSchema } from '@/schemas/api.schemas';

// API Keys 响应 Schema
const ApiKeysResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ApiKeySchema),
});

export const useApiKeyManagement = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isKeyModalVisible, setIsKeyModalVisible] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newKeyData, setNewKeyData] = useState<{ name: string; key: string; prefix: string } | null>(
    null
  );
  const [form] = Form.useForm();
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ✅ 使用 useSafeApi 加载 API Keys
  const {
    data: keysResponse,
    loading,
    execute: executeLoadKeys,
  } = useSafeApi(
    () => (filterUserId ? getUserApiKeys(filterUserId) : Promise.resolve({ success: false, data: [] })),
    ApiKeysResponseSchema,
    {
      errorMessage: '加载API密钥列表失败',
      fallbackValue: { success: false, data: [] },
    }
  );

  // ✅ 使用 useSafeApi 加载统计数据
  const {
    data: statisticsResponse,
    execute: executeLoadStatistics,
  } = useSafeApi(
    () => {
      if (!filterUserId) throw new Error('No user ID');
      return getApiKeyStatistics(filterUserId);
    },
    ApiKeyStatisticsResponseSchema,
    {
      errorMessage: '加载统计数据失败',
      fallbackValue: null,
      manual: true,
      showError: false,
    }
  );

  const statistics = statisticsResponse?.success ? statisticsResponse.data : null;

  const loadKeys = useCallback(async () => {
    if (!filterUserId) return;
    await executeLoadKeys();
  }, [filterUserId, executeLoadKeys]);

  const loadStatistics = useCallback(async () => {
    if (!filterUserId) return;
    await executeLoadStatistics();
  }, [filterUserId, executeLoadStatistics]);

  useEffect(() => {
    if (filterUserId) {
      loadKeys();
      loadStatistics();
    }
  }, [filterUserId, loadKeys, loadStatistics]);

  const handleCreate = useCallback(() => {
    setEditingKey(null);
    form.resetFields();
    setIsModalVisible(true);
  }, [form]);

  const handleEdit = useCallback(
    (record: ApiKey) => {
      setEditingKey(record);
      form.setFieldsValue({
        name: record.name,
        scopes: record.scopes,
        description: record.description,
        expiresAt: record.expiresAt ? dayjs(record.expiresAt) : null,
      });
      setIsModalVisible(true);
    },
    [form]
  );

  const handleRevoke = useCallback(
    async (record: ApiKey) => {
      try {
        const res = await revokeApiKey(record.id);
        if (res.success) {
          message.success(res.message);
          loadKeys();
          loadStatistics();
        }
      } catch (error) {
        message.error('撤销API密钥失败');
      }
    },
    [loadKeys, loadStatistics]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await deleteApiKey(id);
        if (res.success) {
          message.success(res.message);
          loadKeys();
          loadStatistics();
        }
      } catch (error) {
        message.error('删除API密钥失败');
      }
    },
    [loadKeys, loadStatistics]
  );

  const handleViewDetail = useCallback(async (record: ApiKey) => {
    try {
      const res = await getApiKeyById(record.id);
      if (res.success) {
        setSelectedKey(res.data);
        setIsDetailModalVisible(true);
      }
    } catch (error) {
      message.error('获取详情失败');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      setConfirmLoading(true);
      const values = await form.validateFields();

      const data: CreateApiKeyDto | any = {
        userId: filterUserId,
        name: values.name,
        scopes: values.scopes || [],
        description: values.description,
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined,
      };

      if (editingKey) {
        const res = await updateApiKey(editingKey.id, data);
        if (res.success) {
          message.success(res.message);
          setIsModalVisible(false);
          loadKeys();
          loadStatistics();
        }
      } else {
        const res = await createApiKey(data);
        if (res.success) {
          message.success('API密钥创建成功!请妥善保存,仅显示一次');
          setNewKeyData({
            name: values.name,
            key: res.data.plainKey,
            prefix: res.data.prefix,
          });
          setIsModalVisible(false);
          setIsKeyModalVisible(true);
          loadKeys();
          loadStatistics();
        }
      }
    } catch (error) {
      message.error(editingKey ? '更新API密钥失败' : '创建API密钥失败');
    } finally {
      setConfirmLoading(false);
    }
  }, [form, filterUserId, editingKey, loadKeys, loadStatistics]);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleDetailModalClose = useCallback(() => {
    setIsDetailModalVisible(false);
  }, []);

  const handleKeyModalClose = useCallback(() => {
    setIsKeyModalVisible(false);
  }, []);

  return {
    // State
    keys: keysResponse?.data || [], // ✅ 确保永远返回数组
    statistics,
    loading,
    isModalVisible,
    isDetailModalVisible,
    isKeyModalVisible,
    editingKey,
    selectedKey,
    newKeyData,
    form,
    filterUserId,
    confirmLoading,
    // Setters
    setFilterUserId,
    // Handlers
    loadKeys,
    handleCreate,
    handleEdit,
    handleRevoke,
    handleDelete,
    handleViewDetail,
    handleSubmit,
    handleCancel,
    handleDetailModalClose,
    handleKeyModalClose,
  };
};
