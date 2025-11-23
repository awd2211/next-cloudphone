import { useState, useCallback, useMemo, useEffect } from 'react';
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
  Row,
  Col,
  Statistic,
} from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import {
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  useToggleApiKeyStatus,
} from '@/hooks/queries';
import type { ApiKey } from '@/services/apikey';

const { Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * API 密钥管理页面
 */
const ApiKeyListContent: React.FC = () => {
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
  const { data, isLoading, error, refetch } = useApiKeys({
    page,
    pageSize,
    status: statusFilter || undefined,
  });

  const apiKeys = data?.apiKeys || [];
  const total = data?.total || 0;

  // 统计数据
  const stats = useMemo(() => {
    const totalCount = apiKeys.length;
    const activeCount = apiKeys.filter((k) => k.status === 'active').length;
    const inactiveCount = totalCount - activeCount;
    return { total: totalCount, activeCount, inactiveCount };
  }, [apiKeys]);

  // Mutations
  const createMutation = useCreateApiKey();
  const deleteMutation = useDeleteApiKey();
  const toggleStatusMutation = useToggleApiKeyStatus();

  /**
   * 打开创建弹窗
   */
  const handleCreate = useCallback(() => {
    setCreateModalVisible(true);
  }, []);

  /**
   * 快捷键支持
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N 或 Cmd+N 新建
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleCreate();
      }
      // Ctrl+R 或 Cmd+R 刷新
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch, handleCreate]);

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
                  请立即保存以下密钥，关闭后将无法再次查看完整 Secret！
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
        sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      },
      {
        title: 'Access Key',
        dataIndex: 'key',
        key: 'key',
        width: 200,
        sorter: (a, b) => (a.key || '').localeCompare(b.key || ''),
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
        sorter: (a, b) => (a.scopes?.length || 0) - (b.scopes?.length || 0),
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
        sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
        filters: [
          { text: '激活', value: 'active' },
          { text: '禁用', value: 'inactive' },
          { text: '已过期', value: 'expired' },
        ],
        onFilter: (value, record) => record.status === value,
        render: renderStatusTag,
      },
      {
        title: '使用次数',
        dataIndex: 'usageCount',
        key: 'usageCount',
        width: 100,
        sorter: (a, b) => (a.usageCount || 0) - (b.usageCount || 0),
        render: (count: number) => count.toLocaleString(),
      },
      {
        title: '最后使用',
        dataIndex: 'lastUsedAt',
        key: 'lastUsedAt',
        width: 160,
        sorter: (a, b) => {
          const timeA = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
          const timeB = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
          return timeA - timeB;
        },
        render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
      },
      {
        title: '过期时间',
        dataIndex: 'expiresAt',
        key: 'expiresAt',
        width: 120,
        sorter: (a, b) => {
          const timeA = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
          const timeB = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
          return timeA - timeB;
        },
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
        {/* 页面标题 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ marginBottom: 0 }}>
            <KeyOutlined style={{ marginRight: 8 }} />
            API Key 管理
            <Tag
              icon={<ReloadOutlined spin={isLoading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={() => refetch()}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
          <span style={{ fontSize: 12, color: '#999' }}>Ctrl+N 新建</span>
        </div>
        <p style={{ color: '#666', marginBottom: 24 }}>
          管理系统API密钥，用于程序化访问平台资源
        </p>

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic title="API Key 总数" value={stats.total} prefix={<KeyOutlined />} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="已启用"
                value={stats.activeCount}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="已停用"
                value={stats.inactiveCount}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<StopOutlined />}
              />
            </Card>
          </Col>
        </Row>

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

          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            创建密钥
          </Button>
        </Space>

        {/* 数据表格 - 使用 LoadingState 包裹 */}
        <LoadingState
          loading={isLoading}
          error={error}
          empty={!isLoading && !error && apiKeys.length === 0}
          onRetry={refetch}
          loadingType="skeleton"
          skeletonRows={5}
          emptyDescription="暂无 API Key 数据"
        >
          <AccessibleTable<ApiKey>
            ariaLabel="API密钥列表"
            loadingText="正在加载API密钥列表"
            emptyText="暂无API密钥数据，点击右上角创建密钥"
            columns={columns}
            dataSource={apiKeys}
            rowKey="id"
            loading={false}
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
        </LoadingState>
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

/**
 * API 密钥管理页面 - 包装 ErrorBoundary
 */
const ApiKeyList: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="ApiKeyList">
      <ApiKeyListContent />
    </ErrorBoundary>
  );
};

export default ApiKeyList;
