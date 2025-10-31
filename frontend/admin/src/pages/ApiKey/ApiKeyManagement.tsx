import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  message,
  Popconfirm,
  Descriptions,
  Row,
  Col,
  Statistic,
  DatePicker,
  Alert,
  Typography,
  Divider,
  Badge,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  CopyOutlined,
  StopOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ApiKey, ApiKeyStatus, CreateApiKeyDto, ApiKeyStatistics } from '@/types';
import {
  getUserApiKeys,
  getApiKeyById,
  createApiKey,
  updateApiKey,
  revokeApiKey,
  deleteApiKey,
  getApiKeyStatistics,
} from '@/services/apiKey';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

const ApiKeyManagement: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [statistics, setStatistics] = useState<ApiKeyStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isKeyModalVisible, setIsKeyModalVisible] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newKeyData, setNewKeyData] = useState<{ key: string; prefix: string } | null>(null);
  const [form] = Form.useForm();
  const [filterUserId, setFilterUserId] = useState<string>('');

  // 常用的权限范围
  const commonScopes = [
    { value: '*', label: '所有权限' },
    { value: 'devices:read', label: '设备-读取' },
    { value: 'devices:write', label: '设备-写入' },
    { value: 'devices:*', label: '设备-所有' },
    { value: 'users:read', label: '用户-读取' },
    { value: 'users:write', label: '用户-写入' },
    { value: 'quotas:read', label: '配额-读取' },
    { value: 'quotas:write', label: '配额-写入' },
    { value: 'apps:read', label: '应用-读取' },
    { value: 'apps:write', label: '应用-写入' },
  ];

  useEffect(() => {
    if (filterUserId) {
      loadKeys();
      loadStatistics();
    }
  }, [filterUserId]);

  const loadKeys = async () => {
    if (!filterUserId) return;

    setLoading(true);
    try {
      const res = await getUserApiKeys(filterUserId);
      if (res.success) {
        setKeys(res.data);
      }
    } catch (error) {
      message.error('加载API密钥列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    if (!filterUserId) return;

    try {
      const res = await getApiKeyStatistics(filterUserId);
      if (res.success) {
        setStatistics(res.data);
      }
    } catch (error) {
      console.error('加载统计数据失败', error);
    }
  };

  const handleCreate = () => {
    setEditingKey(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: ApiKey) => {
    setEditingKey(record);
    form.setFieldsValue({
      name: record.name,
      scopes: record.scopes,
      description: record.description,
      expiresAt: record.expiresAt ? dayjs(record.expiresAt) : null,
    });
    setIsModalVisible(true);
  };

  const handleRevoke = async (record: ApiKey) => {
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
  };

  const handleDelete = async (id: string) => {
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
  };

  const handleViewDetail = async (record: ApiKey) => {
    try {
      const res = await getApiKeyById(record.id);
      if (res.success) {
        setSelectedKey(res.data);
        setIsDetailModalVisible(true);
      }
    } catch (error) {
      message.error('获取详情失败');
    }
  };

  const handleSubmit = async () => {
    try {
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
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    message.success('已复制到剪贴板');
  };

  const getStatusColor = (status: ApiKeyStatus) => {
    const colors: Record<ApiKeyStatus, string> = {
      active: 'success',
      revoked: 'error',
      expired: 'warning',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: ApiKeyStatus) => {
    const labels: Record<ApiKeyStatus, string> = {
      active: '激活',
      revoked: '已撤销',
      expired: '已过期',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: ApiKeyStatus) => {
    const icons: Record<ApiKeyStatus, React.ReactNode> = {
      active: <CheckCircleOutlined />,
      revoked: <CloseCircleOutlined />,
      expired: <ExclamationCircleOutlined />,
    };
    return icons[status];
  };

  const getMaskedKey = (apiKey: ApiKey) => {
    return `${apiKey.prefix}***${apiKey.key.slice(-4)}`;
  };

  const isKeyExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      ellipsis: true,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '密钥',
      dataIndex: 'key',
      key: 'key',
      width: 200,
      render: (_: any, record: ApiKey) => (
        <Space>
          <Text code>{getMaskedKey(record)}</Text>
          <Tooltip title="复制完整密钥">
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              disabled={record.status !== 'active'}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ApiKeyStatus, record: ApiKey) => {
        const expired = isKeyExpired(record.expiresAt);
        const displayStatus = expired ? 'expired' : status;
        return (
          <Tag icon={getStatusIcon(displayStatus)} color={getStatusColor(displayStatus)}>
            {getStatusLabel(displayStatus)}
          </Tag>
        );
      },
    },
    {
      title: '权限范围',
      dataIndex: 'scopes',
      key: 'scopes',
      width: 200,
      render: (scopes: string[]) => (
        <Space wrap>
          {scopes.slice(0, 3).map((scope) => (
            <Tag key={scope} color="blue">
              {scope}
            </Tag>
          ))}
          {scopes.length > 3 && <Tag>+{scopes.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 100,
      render: (count: number) => <Badge count={count} showZero />,
      sorter: (a: ApiKey, b: ApiKey) => a.usageCount - b.usageCount,
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      width: 170,
      render: (date?: string) =>
        date ? (
          new Date(date).toLocaleString('zh-CN')
        ) : (
          <span style={{ color: '#999' }}>从未使用</span>
        ),
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      width: 170,
      render: (date?: string) => {
        if (!date) return <span style={{ color: '#999' }}>永不过期</span>;
        const expired = new Date(date) < new Date();
        return (
          <Text type={expired ? 'danger' : undefined}>
            {new Date(date).toLocaleString('zh-CN')}
          </Text>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right' as const,
      render: (_: any, record: ApiKey) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={record.status === 'revoked'}
          >
            编辑
          </Button>
          {record.status === 'active' && (
            <Popconfirm
              title="确定撤销此密钥吗?"
              onConfirm={() => handleRevoke(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<StopOutlined />}>
                撤销
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="确定删除此密钥吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {statistics && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总密钥数"
                value={statistics.total}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="激活中"
                value={statistics.active}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总使用次数"
                value={statistics.totalUsage}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日使用"
                value={statistics.recentUsage.day}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card
        title="API 密钥管理"
        extra={
          <Space>
            <Input
              placeholder="用户ID"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              style={{ width: 200 }}
              prefix={<KeyOutlined />}
            />
            <Button icon={<ReloadOutlined />} onClick={loadKeys} disabled={!filterUserId}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              disabled={!filterUserId}
            >
              新建密钥
            </Button>
          </Space>
        }
      >
        <Alert
          message="安全提示"
          description="API密钥具有完整的账户权限,请妥善保管。创建后仅显示一次完整密钥,请立即复制保存。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={keys}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1800 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingKey ? '编辑API密钥' : '新建API密钥'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={700}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="密钥名称"
            rules={[{ required: true, message: '请输入密钥名称' }]}
          >
            <Input placeholder="如: 生产环境API密钥" />
          </Form.Item>

          <Form.Item
            name="scopes"
            label="权限范围"
            rules={[{ required: true, message: '请选择权限范围' }]}
          >
            <Select mode="multiple" placeholder="请选择权限范围" options={commonScopes} />
          </Form.Item>

          <Form.Item name="expiresAt" label="过期时间">
            <DatePicker showTime style={{ width: '100%' }} placeholder="不设置则永不过期" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入密钥用途描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="API密钥创建成功"
        open={isKeyModalVisible}
        onOk={() => setIsKeyModalVisible(false)}
        onCancel={() => setIsKeyModalVisible(false)}
        width={600}
        okText="我已保存"
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        {newKeyData && (
          <>
            <Alert
              message="重要提示"
              description="此密钥仅显示一次,关闭后将无法再次查看完整密钥,请立即复制保存!"
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Divider>完整密钥</Divider>

            <Paragraph
              copyable={{
                text: newKeyData.key,
                onCopy: () => message.success('已复制到剪贴板'),
              }}
            >
              <Text code style={{ fontSize: 16 }}>
                {newKeyData.key}
              </Text>
            </Paragraph>

            <Divider>使用示例</Divider>

            <Paragraph>
              <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
                {`# 在请求头中添加 API 密钥
curl -H "X-API-Key: ${newKeyData.key}" \\
  https://api.example.com/devices`}
              </pre>
            </Paragraph>
          </>
        )}
      </Modal>

      <Modal
        title="API密钥详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedKey && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="ID" span={2}>
              {selectedKey.id}
            </Descriptions.Item>
            <Descriptions.Item label="名称">{selectedKey.name}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag
                icon={getStatusIcon(selectedKey.status)}
                color={getStatusColor(selectedKey.status)}
              >
                {getStatusLabel(selectedKey.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="密钥前缀" span={2}>
              <Text code>{getMaskedKey(selectedKey)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="用户ID">{selectedKey.userId}</Descriptions.Item>
            <Descriptions.Item label="使用次数">
              <Badge count={selectedKey.usageCount} showZero />
            </Descriptions.Item>
            <Descriptions.Item label="权限范围" span={2}>
              <Space wrap>
                {selectedKey.scopes.map((scope) => (
                  <Tag key={scope} color="blue">
                    {scope}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="最后使用时间">
              {selectedKey.lastUsedAt
                ? new Date(selectedKey.lastUsedAt).toLocaleString('zh-CN')
                : '从未使用'}
            </Descriptions.Item>
            <Descriptions.Item label="最后使用IP">
              {selectedKey.lastUsedIp || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="过期时间" span={2}>
              {selectedKey.expiresAt ? (
                <Text type={isKeyExpired(selectedKey.expiresAt) ? 'danger' : undefined}>
                  {new Date(selectedKey.expiresAt).toLocaleString('zh-CN')}
                </Text>
              ) : (
                '永不过期'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>
              {selectedKey.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedKey.createdAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {new Date(selectedKey.updatedAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ApiKeyManagement;
