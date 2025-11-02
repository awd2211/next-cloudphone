import { useState, useMemo, useCallback } from 'react';
import { Form, message, Modal, Input, Button, Space, Typography, Alert } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

/**
 * API Key 类型
 */
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  description?: string;
  scope: string[];
  status: 'active' | 'revoked';
  requestCount: number;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

/**
 * API Key 权限范围
 */
export const API_SCOPES = [
  { label: '设备管理', value: 'devices', description: '创建、查询、控制设备' },
  { label: '应用管理', value: 'apps', description: '安装、卸载应用' },
  { label: '快照管理', value: 'snapshots', description: '创建、恢复快照' },
  { label: '使用记录', value: 'usage', description: '查询使用记录' },
  { label: '账单信息', value: 'billing', description: '查询账单和余额' },
];

/**
 * 自定义 Hook - API Keys 管理业务逻辑
 */
export const useApiKeys = () => {
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [form] = Form.useForm();

  // 模拟 API Key 数据
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: '生产环境密钥',
      key: 'cpk_live_xxxxxxxxxxxxxxxxxxxx',
      description: '用于生产环境的API调用',
      scope: ['devices', 'apps', 'snapshots'],
      status: 'active',
      requestCount: 12450,
      lastUsedAt: '2024-03-15T10:30:00Z',
      expiresAt: '2025-03-15T00:00:00Z',
      createdAt: '2024-01-15T08:00:00Z',
    },
    {
      id: '2',
      name: '测试环境密钥',
      key: 'cpk_test_xxxxxxxxxxxxxxxxxxxx',
      description: '用于开发和测试',
      scope: ['devices', 'apps'],
      status: 'active',
      requestCount: 5680,
      lastUsedAt: '2024-03-14T15:20:00Z',
      createdAt: '2024-02-01T10:00:00Z',
    },
    {
      id: '3',
      name: '自动化脚本密钥',
      key: 'cpk_live_yyyyyyyyyyyyyyyyyyyy',
      description: '用于自动化批量操作',
      scope: ['devices', 'apps', 'snapshots', 'usage'],
      status: 'active',
      requestCount: 34120,
      lastUsedAt: '2024-03-15T09:45:00Z',
      createdAt: '2024-01-20T12:30:00Z',
    },
    {
      id: '4',
      name: '旧版密钥',
      key: 'sk_live_old_51H9WqKL9f8yH6tU0x9fB6kU',
      description: '已废弃的旧版本密钥',
      scope: ['devices'],
      status: 'revoked',
      requestCount: 2340,
      lastUsedAt: '2024-02-28T18:00:00Z',
      createdAt: '2023-12-01T14:00:00Z',
    },
  ]);

  // 统计数据
  const stats = useMemo(
    () => ({
      total: apiKeys.length,
      active: apiKeys.filter((k) => k.status === 'active').length,
      revoked: apiKeys.filter((k) => k.status === 'revoked').length,
      totalRequests: apiKeys.reduce((sum, k) => sum + k.requestCount, 0),
    }),
    [apiKeys]
  );

  // 脱敏显示密钥
  const maskKey = useCallback((key: string) => {
    if (key.length <= 12) return key;
    return `${key.substring(0, 8)}${'*'.repeat(20)}${key.substring(key.length - 4)}`;
  }, []);

  // 切换密钥可见性
  const toggleKeyVisibility = useCallback((id: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // 复制密钥
  const handleCopyKey = useCallback((key: string) => {
    navigator.clipboard.writeText(key);
    message.success('API Key 已复制到剪贴板');
  }, []);

  // 查看统计
  const handleViewStats = useCallback((apiKey: ApiKey) => {
    setSelectedApiKey(apiKey);
    setStatsModalVisible(true);
  }, []);

  // 创建 API Key
  const handleCreate = useCallback(() => {
    form.resetFields();
    setCreateModalVisible(true);
  }, [form]);

  // 提交创建
  const handleSubmitCreate = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 模拟API调用
      setTimeout(() => {
        // 生成新的 API Key
        const newKey: ApiKey = {
          id: Date.now().toString(),
          name: values.name,
          key: `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
          description: values.description,
          scope: values.scope,
          status: 'active',
          requestCount: 0,
          expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined,
          createdAt: new Date().toISOString(),
        };

        setApiKeys((prev) => [newKey, ...prev]);
        setCreateModalVisible(false);
        setLoading(false);

        // 显示新创建的密钥
        Modal.success({
          title: 'API Key 创建成功',
          width: 600,
          content: (
            <div style={{ marginTop: 16 }}>
              <Alert
                message="重要提示"
                description="这是您唯一一次可以看到完整 API Key 的机会，请立即复制保存。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>API Key:</Text>
                <Input.TextArea
                  value={newKey.key}
                  readOnly
                  autoSize={{ minRows: 2, maxRows: 2 }}
                  style={{ fontFamily: 'monospace' }}
                />
                <Button
                  type="primary"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopyKey(newKey.key)}
                  block
                >
                  复制到剪贴板
                </Button>
              </Space>
            </div>
          ),
        });
      }, 1000);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }, [form, handleCopyKey]);

  // 撤销 API Key
  const handleRevoke = useCallback((id: string) => {
    setLoading(true);
    setTimeout(() => {
      setApiKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, status: 'revoked' as const } : k))
      );
      message.success('API Key 已撤销');
      setLoading(false);
    }, 500);
  }, []);

  // 删除 API Key
  const handleDelete = useCallback((id: string) => {
    setLoading(true);
    setTimeout(() => {
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      message.success('API Key 已删除');
      setLoading(false);
    }, 500);
  }, []);

  const handleCloseStatsModal = useCallback(() => {
    setStatsModalVisible(false);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setCreateModalVisible(false);
  }, []);

  return {
    loading,
    apiKeys,
    stats,
    visibleKeys,
    createModalVisible,
    statsModalVisible,
    selectedApiKey,
    form,
    maskKey,
    toggleKeyVisibility,
    handleCopyKey,
    handleViewStats,
    handleCreate,
    handleSubmitCreate,
    handleRevoke,
    handleDelete,
    handleCloseStatsModal,
    handleCloseCreateModal,
  };
};
