import { useState } from 'react';
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
  message,
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import type { ColumnsType } from 'antd/es/table';

interface ProxyProviderConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: number;
  costPerGB: number;
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  successRate: number;
  avgLatencyMs: number;
  createdAt: string;
  updatedAt: string;
  hasConfig: boolean;
}

const ProviderConfig: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProxyProviderConfig | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery<ProxyProviderConfig[]>({
    queryKey: ['proxy-providers'],
    queryFn: async () => {
      const response = await request.get('/proxy/providers');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      return await request.post('/proxy/providers', values);
    },
    onSuccess: () => {
      message.success('供应商创建成功');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['proxy-providers'] });
    },
    onError: (error: any) => {
      message.error(`创建失败: ${error.response?.data?.message || error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
      return await request.put(`/proxy/providers/${id}`, values);
    },
    onSuccess: () => {
      message.success('供应商更新成功');
      setIsModalOpen(false);
      setEditingProvider(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['proxy-providers'] });
    },
    onError: (error: any) => {
      message.error(`更新失败: ${error.response?.data?.message || error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await request.delete(`/proxy/providers/${id}`);
    },
    onSuccess: () => {
      message.success('供应商删除成功');
      queryClient.invalidateQueries({ queryKey: ['proxy-providers'] });
    },
    onError: (error: any) => {
      message.error(`删除失败: ${error.response?.data?.message || error.message}`);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await request.put(`/proxy/providers/${id}/toggle`);
    },
    onSuccess: () => {
      message.success('状态切换成功');
      queryClient.invalidateQueries({ queryKey: ['proxy-providers'] });
    },
    onError: (error: any) => {
      message.error(`操作失败: ${error.response?.data?.message || error.message}`);
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      return await request.post(`/proxy/providers/${id}/test`, {});
    },
    onSuccess: (data) => {
      const result = data.data;
      if (result.success) {
        message.success(`连接成功！延迟: ${result.latency}ms, 代理数: ${result.proxyCount || 'N/A'}`);
      } else {
        message.error('连接失败');
      }
    },
    onError: (error: any) => {
      message.error(`测试失败: ${error.response?.data?.message || error.message}`);
    },
  });

  const handleAdd = () => {
    setEditingProvider(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (provider: ProxyProviderConfig) => {
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
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingProvider) {
        updateMutation.mutate({ id: editingProvider.id, values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const columns: ColumnsType<ProxyProviderConfig> = [
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
      sorter: (a, b) => a.priority - b.priority,
    },
    {
      title: '成本',
      dataIndex: 'costPerGB',
      key: 'costPerGB',
      width: 120,
      sorter: (a, b) => a.costPerGB - b.costPerGB,
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
      sorter: (a, b) => a.successRate - b.successRate,
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
      sorter: (a, b) => a.avgLatencyMs - b.avgLatencyMs,
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
              onClick={() => toggleMutation.mutate(record.id)}
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
  ];

  const totalProviders = providers?.length || 0;
  const enabledProviders = providers?.filter(p => p.enabled).length || 0;
  const avgSuccessRate = providers && providers.length > 0
    ? providers.reduce((sum, p) => sum + p.successRate, 0) / providers.length
    : 0;
  const totalRequests = providers?.reduce((sum, p) => sum + p.totalRequests, 0) || 0;

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
            onClick={() => queryClient.invalidateQueries({ queryKey: ['proxy-providers'] })}
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
};

export default ProviderConfig;
