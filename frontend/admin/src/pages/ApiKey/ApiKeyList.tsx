import { useState, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Popconfirm,
} from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  useToggleApiKeyStatus,
} from '@/hooks/useApiKeys';
import type { ApiKey } from '@/services/apikey';

const { Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * API 密钥管理页面
 */
const ApiKeyList: React.FC = () => {
  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<string>('');

  // 其他状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [form] = Form.useForm();

  // 查询数据
  const { data, isLoading, refetch } = useApiKeys({
    page,
    pageSize,
    status: statusFilter || undefined,
  });

  const apiKeys = data?.apiKeys || [];
  const total = data?.total || 0;

  // Mutations
  const createMutation = useCreateApiKey();
  const deleteMutation = useDeleteApiKey();
  const toggleStatusMutation = useToggleApiKeyStatus();

  /**
   * 分页变化处理
   */
  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  /**
   * 复制密钥
   */
  const handleCopyKey = useCallback((key: string) => {
    navigator.clipboard.writeText(key);
    message.success('密钥已复制到剪贴板');
  }, []);

  /**
   * 切换密钥可见性
   */
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

  /**
   * 创建API密钥
   */
  const handleCreateApiKey = useCallback(
    async (values: any) => {
      try {
        const result = await createMutation.mutateAsync({
          ...values,
          expiresAt: values.expiresAt ? values.expiresAt.format('YYYY-MM-DD') : undefined,
        });

        setCreateModalVisible(false);
        form.resetFields();

        // 显示新创建的密钥（仅一次）
        if (result?.secret) {
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
                    <Paragraph copyable={{ text: result.key }}>
                      <code>{result.key}</code>
                    </Paragraph>
                  </div>
                  <div>
                    <Text strong>Secret Key:</Text>
                    <Paragraph copyable={{ text: result.secret }}>
                      <code>{result.secret}</code>
                    </Paragraph>
                  </div>
                </Space>
              </div>
            ),
          });
        }
      } catch (error) {
        // 错误已在mutation中处理
      }
    },
    [createMutation, form]
  );

  /**
   * 删除API密钥
   */
  const handleDeleteApiKey = useCallback(
    (record: ApiKey) => {
      deleteMutation.mutate(record.id);
    },
    [deleteMutation]
  );

  /**
   * 切换状态
   */
  const handleToggleStatus = useCallback(
    (record: ApiKey) => {
      const newStatus = record.status === 'active' ? 'inactive' : 'active';
      toggleStatusMutation.mutate({ id: record.id, status: newStatus });
    },
    [toggleStatusMutation]
  );

  /**
   * 状态标签渲染
   */
  const renderStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      active: { color: 'success', text: '激活' },
      inactive: { color: 'default', text: '禁用' },
      expired: { color: 'error', text: '已过期' },
    };

    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  /**
   * 表格列定义
   */
  const columns: ColumnsType<ApiKey> = useMemo(
    () => [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        width: 150,
        fixed: 'left',
      },
      {
        title: 'Access Key',
        dataIndex: 'key',
        key: 'key',
        width: 200,
        render: (key: string) => (
          <Space>
            <code>{key}</code>
            <Tooltip title="复制">
              <Button
                type="text"
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
        render: (secret: string, record) => {
          const isVisible = visibleSecrets.has(record.id);
          const displaySecret = isVisible ? secret : '••••••••••••••••••••';

          return (
            <Space>
              <code>{displaySecret}</code>
              <Button
                type="text"
                size="small"
                icon={isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => toggleSecretVisibility(record.id)}
              />
            </Space>
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
            {scopes.slice(0, 2).map((scope) => (
              <Tag key={scope}>{scope}</Tag>
            ))}
            {scopes.length > 2 && <Tag>+{scopes.length - 2}</Tag>}
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 90,
        render: renderStatusTag,
      },
      {
        title: '使用次数',
        dataIndex: 'usageCount',
        key: 'usageCount',
        width: 100,
        render: (count: number) => count.toLocaleString(),
      },
      {
        title: '最后使用',
        dataIndex: 'lastUsedAt',
        key: 'lastUsedAt',
        width: 160,
        render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
      },
      {
        title: '过期时间',
        dataIndex: 'expiresAt',
        key: 'expiresAt',
        width: 120,
        render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '永不过期'),
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 150,
        render: (_, record) => (
          <Space>
            <Button
              type="link"
              size="small"
              onClick={() => handleToggleStatus(record)}
              disabled={record.status === 'expired'}
            >
              {record.status === 'active' ? '禁用' : '激活'}
            </Button>
            <Popconfirm
              title="确认删除"
              description={`确定要删除密钥 "${record.name}" 吗？此操作不可恢复。`}
              onConfirm={() => handleDeleteApiKey(record)}
              okText="确认删除"
              okType="danger"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [
      visibleSecrets,
      handleCopyKey,
      toggleSecretVisibility,
      handleToggleStatus,
      handleDeleteApiKey,
    ]
  );

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <h2>API 密钥管理</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>
          管理系统API密钥，用于程序化访问平台资源
        </p>

        {/* 筛选栏 */}
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            placeholder="状态筛选"
            value={statusFilter || undefined}
            onChange={(value) => {
              setStatusFilter(value || '');
              setPage(1);
            }}
            style={{ width: 140 }}
            allowClear
          >
            <Option value="active">激活</Option>
            <Option value="inactive">禁用</Option>
            <Option value="expired">已过期</Option>
          </Select>

          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建密钥
          </Button>
        </Space>

        {/* 数据表格 */}
        <AccessibleTable<ApiKey>
          ariaLabel="API密钥列表"
          loadingText="正在加载API密钥列表"
          emptyText="暂无API密钥数据，点击右上角创建密钥"
          columns={columns}
          dataSource={apiKeys}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          scroll={{ x: 1500, y: 600 }}
          virtual
        />
      </Card>

      {/* 创建密钥模态框 */}
      <Modal
        title="创建 API 密钥"
        open={createModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateApiKey}>
          <Form.Item
            label="密钥名称"
            name="name"
            rules={[{ required: true, message: '请输入密钥名称' }]}
          >
            <Input placeholder="例如：生产环境密钥" />
          </Form.Item>

          <Form.Item
            label="环境"
            name="environment"
            rules={[{ required: true, message: '请选择环境' }]}
          >
            <Select placeholder="选择环境">
              <Option value="prod">生产环境</Option>
              <Option value="test">测试环境</Option>
              <Option value="dev">开发环境</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="权限范围"
            name="scopes"
            rules={[{ required: true, message: '请选择权限范围' }]}
          >
            <Select mode="multiple" placeholder="选择权限">
              <Option value="devices:read">设备读取</Option>
              <Option value="devices:write">设备写入</Option>
              <Option value="users:read">用户读取</Option>
              <Option value="users:write">用户写入</Option>
              <Option value="billing:read">账单读取</Option>
            </Select>
          </Form.Item>

          <Form.Item label="过期时间" name="expiresAt">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="密钥用途说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ApiKeyList;
