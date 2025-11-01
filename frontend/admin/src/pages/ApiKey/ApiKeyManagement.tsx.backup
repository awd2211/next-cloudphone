import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Popconfirm,
  Alert,
  Badge,
  Tooltip,
  Tag,
  Form,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  StopOutlined,
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
import {
  ApiKeyStatsCards,
  ApiKeyToolbar,
  CreateEditApiKeyModal,
  NewKeyDisplayModal,
  ApiKeyDetailModal,
  getStatusColor,
  getStatusLabel,
  getStatusIcon,
  getMaskedKey,
} from '@/components/ApiKey';

const ApiKeyManagement: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [statistics, setStatistics] = useState<ApiKeyStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isKeyModalVisible, setIsKeyModalVisible] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newKeyData, setNewKeyData] = useState<{ name: string; key: string; prefix: string } | null>(null);
  const [form] = Form.useForm();
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState(false);

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
      <ApiKeyStatsCards statistics={statistics} />

      <Card
        title="API 密钥管理"
        extra={
          <ApiKeyToolbar
            filterUserId={filterUserId}
            onFilterUserIdChange={setFilterUserId}
            onRefresh={loadKeys}
            onCreate={handleCreate}
          />
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

      <CreateEditApiKeyModal
        visible={isModalVisible}
        editingKey={editingKey}
        form={form}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={confirmLoading}
      />

      <NewKeyDisplayModal
        visible={isKeyModalVisible}
        newKeyData={newKeyData}
        onClose={() => setIsKeyModalVisible(false)}
      />

      <ApiKeyDetailModal
        visible={isDetailModalVisible}
        apiKey={selectedKey}
        onClose={() => setIsDetailModalVisible(false)}
      />
    </div>
  );
};

export default ApiKeyManagement;
