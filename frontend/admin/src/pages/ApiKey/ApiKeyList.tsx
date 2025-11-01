import { useState, useCallback } from 'react';
import { Card, Modal, Form, message, Typography, Space, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import { ApiKeyTable, CreateApiKeyModal } from '@/components/ApiKey';
import type { ApiKey } from '@/components/ApiKey';

const { Text, Paragraph } = Typography;

/**
 * API 密钥管理页面（优化版）
 *
 * 优化点：
 * 1. ✅ 组件拆分 - 提取 ApiKeyTable, CreateApiKeyModal
 * 2. ✅ 工具函数提取 - utils.tsx
 * 3. ✅ 常量提取 - constants.ts
 * 4. ✅ 使用 useCallback 优化事件处理
 */
const ApiKeyList: React.FC = () => {
  // ===== 状态管理 =====
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: 'key-001',
      name: '生产环境密钥',
      key: 'ak_prod_1a2b3c4d5e6f7g8h',
      secret: 'sk_prod_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      scopes: ['devices:read', 'devices:write', 'users:read'],
      status: 'active',
      usageCount: 15234,
      lastUsedAt: '2025-10-20 14:30:25',
      expiresAt: '2026-10-20',
      createdAt: '2025-01-15 10:20:30',
      createdBy: '李管理员',
      description: '用于生产环境的 API 调用',
    },
    {
      id: 'key-002',
      name: '测试环境密钥',
      key: 'ak_test_9z8y7x6w5v4u3t2s',
      secret: 'sk_test_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
      scopes: ['devices:read', 'devices:write', 'users:read', 'billing:read'],
      status: 'active',
      usageCount: 3421,
      lastUsedAt: '2025-10-20 11:15:42',
      expiresAt: '2025-12-31',
      createdAt: '2025-06-10 14:45:20',
      createdBy: '赵管理员',
      description: '测试环境专用密钥',
    },
    {
      id: 'key-003',
      name: '只读密钥',
      key: 'ak_ro_p1o2i3u4y5t6r7e8',
      secret: 'sk_ro_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
      scopes: ['devices:read', 'users:read', 'billing:read'],
      status: 'active',
      usageCount: 8956,
      lastUsedAt: '2025-10-19 16:20:10',
      createdAt: '2025-03-20 09:30:15',
      createdBy: '王管理员',
      description: '仅供查询使用的只读密钥',
    },
    {
      id: 'key-004',
      name: '已过期密钥',
      key: 'ak_old_a1s2d3f4g5h6j7k8',
      secret: 'sk_old_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      scopes: ['devices:read'],
      status: 'expired',
      usageCount: 25678,
      lastUsedAt: '2025-09-30 23:59:59',
      expiresAt: '2025-09-30',
      createdAt: '2024-09-30 10:00:00',
      createdBy: '李管理员',
      description: '已过期的旧密钥',
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [form] = Form.useForm();

  // ===== 事件处理 =====
  const handleCopyKey = useCallback((key: string) => {
    navigator.clipboard.writeText(key);
    message.success('密钥已复制到剪贴板');
  }, []);

  const toggleSecretVisibility = useCallback((id: string) => {
    setVisibleSecrets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleCreateApiKey = useCallback(async (values: any) => {
    setLoading(true);
    try {
      const response = await request.post('/api-keys', {
        name: values.name,
        scopes: values.scopes,
        expiresAt: values.expiresAt,
        description: values.description,
      });

      const newKey: ApiKey = {
        id: response.data.id,
        name: response.data.name,
        key: response.data.key,
        secret: response.data.secret,
        scopes: response.data.scopes,
        status: response.data.status || 'active',
        usageCount: response.data.usageCount || 0,
        expiresAt: response.data.expiresAt,
        createdAt: response.data.createdAt,
        createdBy: response.data.createdBy,
        description: response.data.description,
      };

      setApiKeys([newKey, ...apiKeys]);
      setCreateModalVisible(false);
      form.resetFields();

      Modal.success({
        title: 'API 密钥创建成功',
        width: 600,
        content: (
          <div>
            <p style={{ color: '#ff4d4f', fontWeight: 600, marginTop: 16 }}>
              ⚠️ 请立即保存以下密钥，关闭后将无法再次查看完整 Secret！
            </p>
            <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
              <div>
                <Text strong>Access Key:</Text>
                <Paragraph copyable={{ text: newKey.key }}>
                  <code>{newKey.key}</code>
                </Paragraph>
              </div>
              <div>
                <Text strong>Secret Key:</Text>
                <Paragraph copyable={{ text: newKey.secret }}>
                  <code>{newKey.secret}</code>
                </Paragraph>
              </div>
            </Space>
          </div>
        ),
      });

      message.success('API 密钥创建成功');
    } catch (error) {
      message.error('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [apiKeys, form]);

  const handleDeleteApiKey = useCallback((record: ApiKey) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除密钥 "${record.name}" 吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setApiKeys(apiKeys.filter((k) => k.id !== record.id));
        message.success('密钥已删除');
      },
    });
  }, [apiKeys]);

  const handleToggleStatus = useCallback((record: ApiKey) => {
    const newStatus = record.status === 'active' ? 'inactive' : 'active';
    setApiKeys(apiKeys.map((k) => (k.id === record.id ? { ...k, status: newStatus } : k)));
    message.success(`密钥已${'active' === newStatus ? '激活' : '禁用'}`);
  }, [apiKeys]);

  const handleModalCancel = useCallback(() => {
    setCreateModalVisible(false);
    form.resetFields();
  }, [form]);

  const handleModalSubmit = useCallback(() => {
    form.submit();
  }, [form]);

  // ===== 渲染 =====
  return (
    <>
      <Card
        title="API 密钥管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建密钥
          </Button>
        }
      >
        <ApiKeyTable
          apiKeys={apiKeys}
          loading={loading}
          visibleSecrets={visibleSecrets}
          onCopyKey={handleCopyKey}
          onToggleSecretVisibility={toggleSecretVisibility}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteApiKey}
        />
      </Card>

      <CreateApiKeyModal
        visible={createModalVisible}
        loading={loading}
        form={form}
        onCancel={handleModalCancel}
        onSubmit={handleModalSubmit}
      />

      <Form form={form} onFinish={handleCreateApiKey} style={{ display: 'none' }} />
    </>
  );
};

export default ApiKeyList;
