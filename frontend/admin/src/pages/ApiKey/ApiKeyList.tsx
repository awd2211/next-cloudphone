import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Modal, Form, Input, Select, message, Switch, Tooltip, Typography } from 'antd';
import { PlusOutlined, CopyOutlined, DeleteOutlined, EyeOutlined, EyeInvisibleOutlined, KeyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface ApiKey {
  id: string;
  name: string;
  key: string;
  secret: string;
  scopes: string[];
  status: 'active' | 'inactive' | 'expired';
  usageCount: number;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
  description?: string;
}

const ApiKeyList: React.FC = () => {
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

  const availableScopes = [
    { value: 'devices:read', label: '设备-读取' },
    { value: 'devices:write', label: '设备-写入' },
    { value: 'users:read', label: '用户-读取' },
    { value: 'users:write', label: '用户-写入' },
    { value: 'billing:read', label: '账单-读取' },
    { value: 'billing:write', label: '账单-写入' },
    { value: 'quotas:read', label: '配额-读取' },
    { value: 'quotas:write', label: '配额-写入' },
    { value: 'admin:all', label: '管理员-全部权限' },
  ];

  const getStatusTag = (status: ApiKey['status']) => {
    const statusConfig = {
      active: { color: 'success', text: '活跃' },
      inactive: { color: 'default', text: '未激活' },
      expired: { color: 'error', text: '已过期' },
    };
    const config = statusConfig[status];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    message.success('密钥已复制到剪贴板');
  };

  const toggleSecretVisibility = (id: string) => {
    setVisibleSecrets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCreateApiKey = async (values: any) => {
    setLoading(true);
    try {
      // TODO: 调用 API 创建密钥
      const newKey: ApiKey = {
        id: `key-${Date.now()}`,
        name: values.name,
        key: `ak_${values.environment}_${Math.random().toString(36).substr(2, 16)}`,
        secret: `sk_${values.environment}_${Math.random().toString(36).substr(2, 32)}`,
        scopes: values.scopes,
        status: 'active',
        usageCount: 0,
        expiresAt: values.expiresAt,
        createdAt: new Date().toLocaleString('zh-CN'),
        createdBy: '当前管理员',
        description: values.description,
      };

      setApiKeys([newKey, ...apiKeys]);
      setCreateModalVisible(false);
      form.resetFields();

      // 显示新创建的密钥
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
  };

  const handleDeleteApiKey = (record: ApiKey) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除密钥 "${record.name}" 吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setApiKeys(apiKeys.filter(k => k.id !== record.id));
        message.success('密钥已删除');
      },
    });
  };

  const handleToggleStatus = (record: ApiKey) => {
    const newStatus = record.status === 'active' ? 'inactive' : 'active';
    setApiKeys(apiKeys.map(k =>
      k.id === record.id ? { ...k, status: newStatus } : k
    ));
    message.success(`密钥已${newStatus === 'active' ? '激活' : '禁用'}`);
  };

  const columns: ColumnsType<ApiKey> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'Access Key',
      dataIndex: 'key',
      key: 'key',
      width: 220,
      render: (key: string) => (
        <Space>
          <code style={{ fontSize: 12 }}>{key}</code>
          <Tooltip title="复制">
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyKey(key)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Secret Key',
      dataIndex: 'secret',
      key: 'secret',
      width: 180,
      render: (secret: string, record: ApiKey) => {
        const isVisible = visibleSecrets.has(record.id);
        return (
          <Space>
            <code style={{ fontSize: 12 }}>
              {isVisible ? secret : secret.substring(0, 12) + '*********************'}
            </code>
            <Tooltip title={isVisible ? '隐藏' : '显示'}>
              <Button
                type="link"
                size="small"
                icon={isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => toggleSecretVisibility(record.id)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: '权限范围',
      dataIndex: 'scopes',
      key: 'scopes',
      width: 250,
      render: (scopes: string[]) => (
        <>
          {scopes.slice(0, 2).map(scope => (
            <Tag key={scope} style={{ marginBottom: 4 }}>
              {scope}
            </Tag>
          ))}
          {scopes.length > 2 && (
            <Tooltip title={scopes.slice(2).join(', ')}>
              <Tag>+{scopes.length - 2}</Tag>
            </Tooltip>
          )}
        </>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ApiKey['status']) => getStatusTag(status),
      filters: [
        { text: '活跃', value: 'active' },
        { text: '未激活', value: 'inactive' },
        { text: '已过期', value: 'expired' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 100,
      align: 'right',
      sorter: (a, b) => a.usageCount - b.usageCount,
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      width: 160,
      render: (time?: string) => time || '-',
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      width: 120,
      render: (time?: string) => time || '永不过期',
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Switch
            size="small"
            checked={record.status === 'active'}
            disabled={record.status === 'expired'}
            onChange={() => handleToggleStatus(record)}
          />
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteApiKey(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

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
        <Table
          columns={columns}
          dataSource={apiKeys}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 个密钥`,
          }}
          scroll={{ x: 1500 }}
        />
      </Card>

      <Modal
        title={<><KeyOutlined /> 创建 API 密钥</>}
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateApiKey}
          initialValues={{
            environment: 'prod',
            scopes: ['devices:read'],
          }}
        >
          <Form.Item
            name="name"
            label="密钥名称"
            rules={[{ required: true, message: '请输入密钥名称' }]}
          >
            <Input placeholder="例如: 生产环境密钥" />
          </Form.Item>

          <Form.Item
            name="environment"
            label="环境"
            rules={[{ required: true, message: '请选择环境' }]}
          >
            <Select>
              <Option value="prod">生产环境</Option>
              <Option value="test">测试环境</Option>
              <Option value="dev">开发环境</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="scopes"
            label="权限范围"
            rules={[{ required: true, message: '请选择至少一个权限' }]}
          >
            <Select
              mode="multiple"
              placeholder="选择权限范围"
              options={availableScopes}
            />
          </Form.Item>

          <Form.Item
            name="expiresAt"
            label="过期时间（可选）"
          >
            <Input placeholder="例如: 2026-12-31" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述（可选）"
          >
            <TextArea rows={3} placeholder="密钥用途说明" />
          </Form.Item>

          <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4, padding: 12 }}>
            <Text type="warning">
              ⚠️ 注意事项：
            </Text>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>Secret Key 创建后仅显示一次，请妥善保管</li>
              <li>不要在公开场合或代码仓库中暴露密钥</li>
              <li>建议定期轮换密钥以提高安全性</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default ApiKeyList;
