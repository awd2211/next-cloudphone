import { useState, useMemo, useCallback, memo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import {
  useProxyProviders,
  useCreateProxyProvider,
  useUpdateProxyProvider,
  useDeleteProxyProvider,
  useToggleProxyProvider,
  useTestProxyProvider,
  type ProxyProvider,
} from '@/hooks/queries/useProxy';
import type { ColumnsType } from 'antd/es/table';

// ✅ 使用 memo 包装组件，避免不必要的重渲染
const ProviderConfig: React.FC = memo(() => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProxyProvider | null>(null);
  const [form] = Form.useForm();

  // 使用新的 React Query Hooks
  const { data: providers, isLoading, refetch } = useProxyProviders();
  const createMutation = useCreateProxyProvider();
  const updateMutation = useUpdateProxyProvider();
  const deleteMutation = useDeleteProxyProvider();
  const toggleMutation = useToggleProxyProvider();
  const testMutation = useTestProxyProvider();

  // ✅ 使用 useCallback 包装事件处理函数
  const handleAdd = useCallback(() => {
    setEditingProvider(null);
    form.resetFields();
    setIsModalOpen(true);
  }, [form]);

  const handleEdit = useCallback((provider: ProxyProvider) => {
    setEditingProvider(provider);
    form.setFieldsValue({
      name: provider.name,
      type: provider.type,
      enabled: provider.enabled,
      priority: provider.priority,
      costPerGB: provider.costPerGB,
      config: undefined, // 配置为空对象，需要手动填写
    });
    setIsModalOpen(true);
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      if (editingProvider) {
        updateMutation.mutate(
          { id: editingProvider.id, data: values },
          {
            onSuccess: () => {
              setIsModalOpen(false);
              setEditingProvider(null);
              form.resetFields();
            },
          }
        );
      } else {
        createMutation.mutate(values, {
          onSuccess: () => {
            setIsModalOpen(false);
            form.resetFields();
          },
        });
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  }, [form, editingProvider, updateMutation, createMutation]);

  // ✅ 使用 useMemo 缓存列定义，避免每次渲染都重新创建
  const columns: ColumnsType<ProxyProvider> = useMemo(() => [
    {
      title: '供应商',
      key: 'provider',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <Tag color="blue">{record.type.toUpperCase()}</Tag>
        </div>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      sorter: (a: ProxyProvider, b: ProxyProvider) => a.priority - b.priority,
    },
    {
      title: '成本',
      dataIndex: 'costPerGB',
      key: 'costPerGB',
      width: 120,
      sorter: (a: ProxyProvider, b: ProxyProvider) => a.costPerGB - b.costPerGB,
      render: (cost: number) => <span>${cost.toFixed(2)}/GB</span>,
    },
    {
      title: '请求统计',
      key: 'requests',
      width: 140,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>总计: {record.totalRequests}</div>
          <div style={{ color: '#52c41a' }}>成功: {record.successRequests}</div>
          <div style={{ color: '#ff4d4f' }}>失败: {record.failedRequests}</div>
        </div>
      ),
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 100,
      sorter: (a: ProxyProvider, b: ProxyProvider) => a.successRate - b.successRate,
      render: (rate: number) => (
        <span style={{
          color: rate >= 90 ? '#52c41a' : rate >= 70 ? '#faad14' : '#ff4d4f',
          fontWeight: 500,
        }}>
          {rate.toFixed(1)}%
        </span>
      ),
    },
    {
      title: '平均延迟',
      dataIndex: 'avgLatencyMs',
      key: 'avgLatencyMs',
      width: 100,
      sorter: (a: ProxyProvider, b: ProxyProvider) => a.avgLatencyMs - b.avgLatencyMs,
      render: (latency: number) => <span>{latency}ms</span>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'default'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="测试连接">
            <Button
              type="link"
              size="small"
              icon={<ExperimentOutlined />}
              onClick={() => testMutation.mutate(record.id)}
              loading={testMutation.isPending}
            />
          </Tooltip>
          <Tooltip title={record.enabled ? '禁用' : '启用'}>
            <Button
              type="link"
              size="small"
              icon={record.enabled ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              onClick={() => toggleMutation.mutate({ id: record.id, enabled: !record.enabled })}
              loading={toggleMutation.isPending}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除此供应商配置？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ], [handleEdit, testMutation, toggleMutation, deleteMutation]);

  // ✅ 使用 useMemo 缓存总览统计计算
  const { totalProviders, enabledProviders, avgSuccessRate, totalRequests } = useMemo(() => {
    const total = providers?.length || 0;
    const enabled = providers?.filter(p => p.enabled).length || 0;
    const avgRate = providers && providers.length > 0
      ? providers.reduce((sum, p) => sum + p.successRate, 0) / providers.length
      : 0;
    const requests = providers?.reduce((sum, p) => sum + p.totalRequests, 0) || 0;
    return { totalProviders: total, enabledProviders: enabled, avgSuccessRate: avgRate, totalRequests: requests };
  }, [providers]);

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总供应商数"
              value={totalProviders}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已启用"
              value={enabledProviders}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均成功率"
              value={avgSuccessRate.toFixed(1)}
              suffix="%"
              valueStyle={{
                color: avgSuccessRate >= 90 ? '#3f8600' : avgSuccessRate >= 70 ? '#faad14' : '#cf1322',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总请求数"
              value={totalRequests}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加供应商
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
          >
            刷新
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={providers || []}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1300 }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个供应商`,
        }}
      />

      <Modal
        title={editingProvider ? '编辑供应商配置' : '添加供应商配置'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingProvider(null);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            enabled: true,
            priority: 100,
            costPerGB: 10.00,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="供应商名称"
                rules={[{ required: true, message: '请输入供应商名称' }]}
              >
                <Input placeholder="如: Bright Data" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="供应商类型"
                rules={[{ required: true, message: '请选择供应商类型' }]}
              >
                <Select placeholder="选择类型" disabled={!!editingProvider}>
                  <Select.Option value="brightdata">Bright Data</Select.Option>
                  <Select.Option value="oxylabs">Oxylabs</Select.Option>
                  <Select.Option value="iproyal">IPRoyal</Select.Option>
                  <Select.Option value="smartproxy">SmartProxy</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="优先级"
                tooltip="值越大优先级越高"
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="costPerGB"
                label="每GB成本($)"
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="enabled"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item
            name="config"
            label="供应商配置"
            help="JSON格式的配置信息（包含API密钥等）"
            rules={[{ required: true, message: '请输入配置信息' }]}
          >
            <Input.TextArea
              rows={6}
              placeholder={`示例：
{
  "apiKey": "your-api-key",
  "username": "your-username",
  "password": "your-password",
  "apiUrl": "https://api.provider.com",
  "zone": "residential"
}`}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
});

ProviderConfig.displayName = 'Proxy.ProviderConfig';

export default ProviderConfig;
