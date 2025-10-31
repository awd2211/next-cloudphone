import { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Descriptions,
  DatePicker,
  InputNumber,
  Popconfirm,
  Alert,
  Divider,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useBillingRules,
  useBillingRuleTemplates,
  useCreateBillingRule,
  useUpdateBillingRule,
  useDeleteBillingRule,
  useToggleBillingRule,
  useTestBillingRule,
} from '@/hooks/useBillingRules';
import type {
  BillingRule,
  CreateBillingRuleDto,
  UpdateBillingRuleDto,
  BillingRuleTestResult,
} from '@/types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const BillingRuleList = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<BillingRule | null>(null);
  const [selectedRule, setSelectedRule] = useState<BillingRule | null>(null);
  const [testResult, setTestResult] = useState<BillingRuleTestResult | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  const [form] = Form.useForm();
  const [testForm] = Form.useForm();

  // React Query hooks
  const params = useMemo(
    () => ({
      page,
      pageSize,
      ...(filterActive !== undefined && { isActive: filterActive }),
    }),
    [page, pageSize, filterActive]
  );

  const { data, isLoading } = useBillingRules(params);
  const { data: templates } = useBillingRuleTemplates();
  const createMutation = useCreateBillingRule();
  const updateMutation = useUpdateBillingRule();
  const deleteMutation = useDeleteBillingRule();
  const toggleMutation = useToggleBillingRule();
  const testMutation = useTestBillingRule();

  const rules = data?.data || [];
  const total = data?.total || 0;

  // Event handlers
  const openModal = useCallback(
    (rule?: BillingRule) => {
      if (rule) {
        setEditingRule(rule);
        form.setFieldsValue({
          name: rule.name,
          description: rule.description,
          type: rule.type,
          formula: rule.formula,
          parameters: JSON.stringify(rule.parameters, null, 2),
          priority: rule.priority,
          validRange:
            rule.validFrom && rule.validUntil
              ? [dayjs(rule.validFrom), dayjs(rule.validUntil)]
              : undefined,
        });
      } else {
        setEditingRule(null);
        form.resetFields();
      }
      setModalVisible(true);
    },
    [form]
  );

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const parameters = values.parameters ? JSON.parse(values.parameters) : {};

      const data: CreateBillingRuleDto | UpdateBillingRuleDto = {
        name: values.name,
        description: values.description,
        type: values.type,
        formula: values.formula,
        parameters,
        priority: values.priority,
        validFrom: values.validRange?.[0]?.toISOString(),
        validUntil: values.validRange?.[1]?.toISOString(),
      };

      if (editingRule) {
        await updateMutation.mutateAsync({ id: editingRule.id, data });
      } else {
        await createMutation.mutateAsync(data as CreateBillingRuleDto);
      }

      setModalVisible(false);
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
    }
  }, [form, editingRule, createMutation, updateMutation]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const handleToggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      await toggleMutation.mutateAsync({ id, isActive });
    },
    [toggleMutation]
  );

  const openTestModal = useCallback(
    (rule: BillingRule) => {
      setSelectedRule(rule);
      setTestResult(null);
      testForm.resetFields();
      setTestModalVisible(true);
    },
    [testForm]
  );

  const handleTest = useCallback(async () => {
    try {
      const values = await testForm.validateFields();
      const result = await testMutation.mutateAsync({
        id: selectedRule!.id,
        data: values,
      });
      setTestResult(result as BillingRuleTestResult);
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
    }
  }, [testForm, selectedRule, testMutation]);

  const openDetailModal = useCallback((rule: BillingRule) => {
    setSelectedRule(rule);
    setDetailModalVisible(true);
  }, []);

  const applyTemplate = useCallback(
    (template: any) => {
      form.setFieldsValue({
        name: template.name,
        description: template.description,
        type: template.type,
        formula: template.formula,
        parameters: JSON.stringify(template.parameters, null, 2),
        priority: template.priority || 0,
      });
    },
    [form]
  );

  // Optimized type map
  const typeMap = useMemo(
    () => ({
      'time-based': { color: 'blue' as const, text: '按时长' },
      'usage-based': { color: 'green' as const, text: '按用量' },
      tiered: { color: 'orange' as const, text: '阶梯式' },
      custom: { color: 'purple' as const, text: '自定义' },
    }),
    []
  );

  const columns: ColumnsType<BillingRule> = useMemo(
    () => [
      {
        title: '规则名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        render: (name, record) => <a onClick={() => openDetailModal(record)}>{name}</a>,
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (type) => {
          const config = typeMap[type as keyof typeof typeMap];
          return <Tag color={config?.color}>{config?.text}</Tag>;
        },
      },
      {
        title: '公式',
        dataIndex: 'formula',
        key: 'formula',
        width: 200,
        ellipsis: true,
        render: (formula) => <code style={{ fontSize: '12px', color: '#595959' }}>{formula}</code>,
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        key: 'priority',
        width: 80,
        align: 'center',
        sorter: (a, b) => a.priority - b.priority,
      },
      {
        title: '状态',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 100,
        render: (isActive, record) => (
          <Switch
            checked={isActive}
            checkedChildren={<CheckCircleOutlined />}
            unCheckedChildren={<CloseCircleOutlined />}
            onChange={(checked) => handleToggleActive(record.id, checked)}
          />
        ),
      },
      {
        title: '有效期',
        key: 'validity',
        width: 200,
        render: (_, record) => {
          if (!record.validFrom && !record.validUntil) {
            return <Tag color="green">永久有效</Tag>;
          }
          return (
            <div>
              {record.validFrom && <div>从: {dayjs(record.validFrom).format('YYYY-MM-DD')}</div>}
              {record.validUntil && <div>至: {dayjs(record.validUntil).format('YYYY-MM-DD')}</div>}
            </div>
          );
        },
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 200,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<ExperimentOutlined />}
              onClick={() => openTestModal(record)}
            >
              测试
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除此规则吗？"
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
    ],
    [typeMap, openDetailModal, openTestModal, openModal, handleDelete, handleToggleActive]
  );

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic title="总规则数" value={total} prefix={<CodeOutlined />} />
            </Col>
            <Col span={8}>
              <Statistic
                title="激活中"
                value={rules.filter((r) => r.isActive).length}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="已停用"
                value={rules.filter((r) => !r.isActive).length}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Select
                placeholder="筛选状态"
                style={{ width: 120 }}
                allowClear
                value={filterActive}
                onChange={setFilterActive}
              >
                <Option value={true}>激活</Option>
                <Option value={false}>停用</Option>
              </Select>
            </Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              新建规则
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={rules}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize || 10);
              },
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            scroll={{ x: 1400 }}
          />
        </Space>
      </Card>

      {/* 创建/编辑模态框 */}
      <Modal
        title={editingRule ? '编辑计费规则' : '创建计费规则'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={800}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="规则名称"
            name="name"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如: 标准时长计费" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <TextArea rows={2} placeholder="规则说明" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="规则类型"
                name="type"
                rules={[{ required: true, message: '请选择规则类型' }]}
              >
                <Select placeholder="选择类型">
                  <Option value="time-based">按时长计费</Option>
                  <Option value="usage-based">按用量计费</Option>
                  <Option value="tiered">阶梯式计费</Option>
                  <Option value="custom">自定义公式</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="优先级" name="priority" initialValue={0}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={
              <span>
                计费公式{' '}
                <a onClick={() => message.info('支持变量: hours, cpuCores, memoryMB, storageMB')}>
                  查看帮助
                </a>
              </span>
            }
            name="formula"
            rules={[{ required: true, message: '请输入计费公式' }]}
          >
            <Input placeholder="例如: hours * cpuCores * 0.5 + memoryMB * 0.001" />
          </Form.Item>

          <Form.Item
            label="参数 (JSON格式)"
            name="parameters"
            rules={[
              {
                validator: async (_, value) => {
                  if (value) {
                    try {
                      JSON.parse(value);
                    } catch {
                      throw new Error('JSON格式不正确');
                    }
                  }
                },
              },
            ]}
          >
            <TextArea rows={4} placeholder='{"basePrice": 0.5, "cpuPricePerCore": 0.3}' />
          </Form.Item>

          <Form.Item label="有效期" name="validRange">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          {templates.length > 0 && (
            <>
              <Divider>快速应用模板</Divider>
              <Space wrap>
                {templates.map((template: any) => (
                  <Button key={template.id} size="small" onClick={() => applyTemplate(template)}>
                    {template.name}
                  </Button>
                ))}
              </Space>
            </>
          )}
        </Form>
      </Modal>

      {/* 测试模态框 */}
      <Modal
        title={`测试规则: ${selectedRule?.name}`}
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        onOk={handleTest}
        width={700}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="输入测试数据以验证计费规则"
            description={`公式: ${selectedRule?.formula}`}
            type="info"
            showIcon
          />

          <Form form={testForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="运行时长 (小时)"
                  name="hours"
                  rules={[{ required: true, message: '请输入时长' }]}
                >
                  <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="CPU核心数"
                  name="cpuCores"
                  rules={[{ required: true, message: '请输入CPU核心数' }]}
                >
                  <InputNumber min={1} max={32} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="内存 (MB)"
                  name="memoryMB"
                  rules={[{ required: true, message: '请输入内存' }]}
                >
                  <InputNumber min={512} step={512} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="存储 (MB)"
                  name="storageMB"
                  rules={[{ required: true, message: '请输入存储' }]}
                >
                  <InputNumber min={1024} step={1024} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          {testResult && (
            <>
              <Divider>测试结果</Divider>
              <Alert message={`计算费用: ¥${testResult.cost.toFixed(2)}`} type="success" showIcon />
              <Descriptions bordered size="small" column={1}>
                {testResult.breakdown.map((item, index) => (
                  <Descriptions.Item key={index} label={item.component}>
                    {item.value} {item.unit}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </>
          )}
        </Space>
      </Modal>

      {/* 详情模态框 */}
      <Modal
        title="规则详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedRule && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="规则名称">{selectedRule.name}</Descriptions.Item>
            <Descriptions.Item label="描述">{selectedRule.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="类型">
              <Tag
                color={
                  selectedRule.type === 'time-based'
                    ? 'blue'
                    : selectedRule.type === 'usage-based'
                      ? 'green'
                      : selectedRule.type === 'tiered'
                        ? 'orange'
                        : 'purple'
                }
              >
                {selectedRule.type}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="计费公式">
              <code>{selectedRule.formula}</code>
            </Descriptions.Item>
            <Descriptions.Item label="参数">
              <pre style={{ margin: 0, fontSize: '12px' }}>
                {JSON.stringify(selectedRule.parameters, null, 2)}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="优先级">{selectedRule.priority}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {selectedRule.isActive ? (
                <Tag color="success">激活</Tag>
              ) : (
                <Tag color="error">停用</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="有效期">
              {selectedRule.validFrom && selectedRule.validUntil
                ? `${dayjs(selectedRule.validFrom).format('YYYY-MM-DD')} 至 ${dayjs(selectedRule.validUntil).format('YYYY-MM-DD')}`
                : '永久有效'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(selectedRule.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default BillingRuleList;
