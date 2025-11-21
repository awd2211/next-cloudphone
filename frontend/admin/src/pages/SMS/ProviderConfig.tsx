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
  // message, // Removed: not used in this component
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
  SyncOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import {
  useSMSProviders as useProviderList,
  useCreateSMSProvider as useCreateProvider,
  useUpdateSMSProvider as useUpdateProvider,
  useDeleteSMSProvider as useDeleteProvider,
  useTestSMSProvider as useTestProvider,
  useToggleSMSProvider as useToggleProvider,
  useRefreshProviderBalance,
  type SMSProvider,
} from '@/hooks/queries/useSMS';
import type { ColumnsType } from 'antd/es/table';

// 使用 SMSProvider 类型（兼容本地接口名称）
type SMSProviderConfig = SMSProvider;

/**
 * SMS供应商配置管理页面
 */
const ProviderConfig: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<SMSProviderConfig | null>(null);
  const [form] = Form.useForm();

  // 使用新的 React Query Hooks
  const { data: providers, isLoading, refetch } = useProviderList();
  const createMutation = useCreateProvider();
  const updateMutation = useUpdateProvider();
  const deleteMutation = useDeleteProvider();
  const toggleMutation = useToggleProvider();
  const testMutation = useTestProvider();
  const refreshBalanceMutation = useRefreshProviderBalance();

  const handleAdd = () => {
    setEditingProvider(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (provider: SMSProviderConfig) => {
    setEditingProvider(provider);
    form.setFieldsValue({
      ...provider,
      // 不设置apiKey，保持为空
      apiKey: undefined,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 如果是编辑且未填写API密钥，则不发送该字段
      if (editingProvider && !values.apiKey) {
        delete values.apiKey;
      }

      if (editingProvider) {
        updateMutation.mutate(
          { providerId: editingProvider.id, data: values },
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
  };

  const getHealthStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      healthy: { color: 'success', text: '健康' },
      degraded: { color: 'warning', text: '降级' },
      down: { color: 'error', text: '故障' },
    };
    return configs[status] || { color: 'default', text: status };
  };

  const columns: ColumnsType<SMSProviderConfig> = [
    {
      title: '供应商',
      key: 'provider',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.displayName}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.provider}</div>
        </div>
      ),
    },
    {
      title: '健康状态',
      dataIndex: 'healthStatus',
      key: 'healthStatus',
      width: 100,
      render: (status: string) => {
        const config = getHealthStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '余额',
      key: 'balance',
      width: 150,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            ${record.balance?.toFixed(2) || 'N/A'}
          </div>
          <div style={{ fontSize: 12, color: record.balance && record.balanceThreshold && record.balance < record.balanceThreshold ? '#ff4d4f' : '#999' }}>
            阈值: ${record.balanceThreshold || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a, b) => a.priority - b.priority,
    },
    {
      title: '请求统计',
      key: 'requests',
      width: 140,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>总计: {record.totalRequests}</div>
          <div style={{ color: '#52c41a' }}>成功: {record.totalSuccess}</div>
          <div style={{ color: '#ff4d4f' }}>失败: {record.totalFailures}</div>
        </div>
      ),
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 100,
      sorter: (a, b) => (a.successRate || 0) - (b.successRate || 0),
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
      width: 260,
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
          <Tooltip title="刷新余额">
            <Button
              type="link"
              size="small"
              icon={<SyncOutlined />}
              onClick={() => refreshBalanceMutation.mutate(record.id)}
              loading={refreshBalanceMutation.isPending}
            />
          </Tooltip>
          <Tooltip title={record.enabled ? '禁用' : '启用'}>
            <Button
              type="link"
              size="small"
              icon={record.enabled ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              onClick={() => toggleMutation.mutate({ providerId: record.id, enabled: !record.enabled })}
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

  // 计算总览统计
  const totalProviders = providers?.length || 0;
  const enabledProviders = providers?.filter(p => p.enabled).length || 0;
  const avgSuccessRate = providers && providers.length > 0
    ? providers.reduce((sum, p) => sum + (p.successRate || 0), 0) / providers.length
    : 0;
  const totalRequests = providers?.reduce((sum, p) => sum + (p.totalRequests || 0), 0) || 0;

  return (
    <div>
      {/* 统计卡片 */}
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

      {/* 操作按钮 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
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

      {/* 供应商列表 */}
      <Table
        columns={columns}
        dataSource={providers || []}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1400 }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个供应商`,
        }}
      />

      {/* 添加/编辑Modal */}
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
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            enabled: true,
            priority: 1,
            rateLimitPerMinute: 60,
            rateLimitPerSecond: 10,
            concurrentRequestsLimit: 50,
            balanceThreshold: 10,
            costWeight: 0.4,
            speedWeight: 0.3,
            successRateWeight: 0.3,
            alertEnabled: true,
            webhookEnabled: false,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="provider"
                label="供应商标识"
                rules={[{ required: true, message: '请选择供应商' }]}
              >
                <Select
                  placeholder="选择供应商"
                  disabled={!!editingProvider}
                >
                  <Select.Option value="sms-activate">SMS-Activate</Select.Option>
                  <Select.Option value="5sim">5sim</Select.Option>
                  <Select.Option value="smspool">SMSPool</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="displayName"
                label="显示名称"
                rules={[{ required: true, message: '请输入显示名称' }]}
              >
                <Input placeholder="如: SMS-Activate" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="apiEndpoint"
                label="API端点"
                rules={[{ required: true, message: '请输入API端点' }]}
              >
                <Input placeholder="https://api.example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="apiKey"
                label="API密钥"
                rules={editingProvider ? [] : [{ required: true, message: '请输入API密钥' }]}
              >
                <Input.Password
                  placeholder={editingProvider ? "留空则不修改" : "输入API密钥"}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="priority"
                label="优先级"
                tooltip="1=最高优先级"
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="balanceThreshold"
                label="余额告警阈值($)"
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="enabled"
                label="启用状态"
                valuePropName="checked"
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="rateLimitPerMinute"
                label="每分钟请求限制"
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="rateLimitPerSecond"
                label="每秒请求限制"
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="concurrentRequestsLimit"
                label="并发请求限制"
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="costWeight"
                label="成本权重"
                tooltip="智能路由权重（0-1）"
              >
                <InputNumber min={0} max={1} step={0.1} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="speedWeight"
                label="速度权重"
              >
                <InputNumber min={0} max={1} step={0.1} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="successRateWeight"
                label="成功率权重"
              >
                <InputNumber min={0} max={1} step={0.1} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="alertEnabled"
                label="启用告警"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="webhookEnabled"
                label="启用Webhook"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.webhookEnabled !== currentValues.webhookEnabled}
          >
            {({ getFieldValue }) =>
              getFieldValue('webhookEnabled') ? (
                <Row gutter={16}>
                  <Col span={16}>
                    <Form.Item
                      name="webhookUrl"
                      label="Webhook URL"
                      rules={[{ required: true, message: '请输入Webhook URL' }]}
                    >
                      <Input placeholder="https://webhook.example.com" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="webhookSecret"
                      label="Webhook密钥"
                    >
                      <Input.Password placeholder="可选" />
                    </Form.Item>
                  </Col>
                </Row>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProviderConfig;
