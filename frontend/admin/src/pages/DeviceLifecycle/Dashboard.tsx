import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  message,
  Tag,
  Tabs,
  Descriptions,
  Alert,
  Popconfirm,
  Tooltip,
  Timeline,
  Progress,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ExperimentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getLifecycleRules,
  createLifecycleRule,
  updateLifecycleRule,
  deleteLifecycleRule,
  toggleLifecycleRule,
  executeLifecycleRule,
  testLifecycleRule,
  getLifecycleHistory,
  getLifecycleStats,
  getLifecycleRuleTemplates,
  createRuleFromTemplate,
} from '@/services/lifecycle';
import type {
  LifecycleRule,
  CreateLifecycleRuleDto,
  UpdateLifecycleRuleDto,
  LifecycleExecutionHistory,
  LifecycleStats,
  PaginationParams,
} from '@/types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const LifecycleDashboard = () => {
  const [rules, setRules] = useState<LifecycleRule[]>([]);
  const [history, setHistory] = useState<LifecycleExecutionHistory[]>([]);
  const [stats, setStats] = useState<LifecycleStats | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [historyDetailVisible, setHistoryDetailVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<LifecycleRule | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<LifecycleExecutionHistory | null>(null);
  const [activeTab, setActiveTab] = useState('rules');
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterEnabled, setFilterEnabled] = useState<boolean | undefined>(undefined);

  const [form] = Form.useForm();
  const [configForm] = Form.useForm();

  // 加载规则列表
  const loadRules = async () => {
    setLoading(true);
    try {
      const params: PaginationParams & { type?: string; enabled?: boolean } = {
        page,
        pageSize,
      };
      if (filterType) params.type = filterType;
      if (filterEnabled !== undefined) params.enabled = filterEnabled;

      const res = await getLifecycleRules(params);
      setRules(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载规则失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载执行历史
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await getLifecycleHistory({
        page: historyPage,
        pageSize: historyPageSize,
      });
      setHistory(res.data);
      setHistoryTotal(res.total);
    } catch (error) {
      message.error('加载历史失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const statsData = await getLifecycleStats();
      setStats(statsData);
    } catch (error) {
      message.error('加载统计失败');
    }
  };

  // 加载模板
  const loadTemplates = async () => {
    try {
      const templatesData = await getLifecycleRuleTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('加载模板失败', error);
    }
  };

  useEffect(() => {
    loadRules();
    loadStats();
    loadTemplates();
  }, [page, pageSize, filterType, filterEnabled]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, historyPage, historyPageSize]);

  // 打开创建/编辑模态框
  const openModal = (rule?: LifecycleRule) => {
    if (rule) {
      setEditingRule(rule);
      form.setFieldsValue({
        name: rule.name,
        description: rule.description,
        type: rule.type,
        enabled: rule.enabled,
        priority: rule.priority,
        schedule: rule.schedule,
      });
      // 配置需要单独处理
      configForm.setFieldsValue(rule.config);
    } else {
      setEditingRule(null);
      form.resetFields();
      configForm.resetFields();
    }
    setModalVisible(true);
  };

  // 打开配置编辑器
  const openConfigModal = () => {
    setConfigModalVisible(true);
  };

  // 处理创建/更新
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const config = configForm.getFieldsValue();

      const data: CreateLifecycleRuleDto | UpdateLifecycleRuleDto = {
        name: values.name,
        description: values.description,
        type: values.type,
        enabled: values.enabled,
        priority: values.priority,
        schedule: values.schedule,
        config,
      };

      if (editingRule) {
        await updateLifecycleRule(editingRule.id, data);
        message.success('规则更新成功');
      } else {
        await createLifecycleRule(data as CreateLifecycleRuleDto);
        message.success('规则创建成功');
      }

      setModalVisible(false);
      setConfigModalVisible(false);
      loadRules();
      loadStats();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '操作失败');
    }
  };

  // 删除规则
  const handleDelete = async (id: string) => {
    try {
      await deleteLifecycleRule(id);
      message.success('规则删除成功');
      loadRules();
      loadStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 切换启用状态
  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleLifecycleRule(id, enabled);
      message.success(`规则已${enabled ? '启用' : '禁用'}`);
      loadRules();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 手动执行规则
  const handleExecute = async (id: string, ruleName: string) => {
    try {
      const execution = await executeLifecycleRule(id);
      message.success(`规则 "${ruleName}" 已开始执行`);
      if (activeTab === 'history') {
        loadHistory();
      }
    } catch (error) {
      message.error('执行失败');
    }
  };

  // 测试规则
  const handleTest = async (id: string, ruleName: string) => {
    try {
      const result = await testLifecycleRule(id, true);
      Modal.info({
        title: `规则测试: ${ruleName}`,
        content: (
          <div>
            <p>测试结果 (模拟执行):</p>
            <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ),
        width: 600,
      });
    } catch (error) {
      message.error('测试失败');
    }
  };

  // 从模板创建
  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const rule = await createRuleFromTemplate(templateId);
      message.success('规则创建成功');
      openModal(rule);
    } catch (error) {
      message.error('创建失败');
    }
  };

  // 查看历史详情
  const viewHistoryDetail = (history: LifecycleExecutionHistory) => {
    setSelectedHistory(history);
    setHistoryDetailVisible(true);
  };

  // 获取类型标签
  const getTypeTag = (type: string) => {
    const typeMap: Record<string, { color: string; text: string; icon: JSX.Element }> = {
      cleanup: { color: 'orange', text: '自动清理', icon: <CloseCircleOutlined /> },
      autoscaling: { color: 'blue', text: '自动扩缩', icon: <ThunderboltOutlined /> },
      backup: { color: 'green', text: '自动备份', icon: <SyncOutlined /> },
      'expiration-warning': { color: 'gold', text: '到期提醒', icon: <ClockCircleOutlined /> },
    };
    const config = typeMap[type] || typeMap.cleanup;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      running: { color: 'processing', text: '执行中' },
      success: { color: 'success', text: '成功' },
      failed: { color: 'error', text: '失败' },
      partial: { color: 'warning', text: '部分成功' },
    };
    const config = statusMap[status] || statusMap.failed;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 渲染配置表单
  const renderConfigForm = (type: string) => {
    switch (type) {
      case 'cleanup':
        return (
          <>
            <Form.Item label="空闲时长 (小时)" name={['idleHours']} initialValue={24}>
              <InputNumber min={1} max={720} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="清理动作" name={['action']} initialValue="stop">
              <Select>
                <Option value="stop">停止设备</Option>
                <Option value="delete">删除设备</Option>
                <Option value="archive">归档设备</Option>
              </Select>
            </Form.Item>
            <Form.Item label="包含状态" name={['includeStatuses']}>
              <Select mode="multiple" placeholder="选择要清理的设备状态">
                <Option value="idle">空闲</Option>
                <Option value="error">错误</Option>
                <Option value="stopped">已停止</Option>
              </Select>
            </Form.Item>
            <Form.Item label="排除用户 ID" name={['excludeUsers']}>
              <Select mode="tags" placeholder="输入要排除的用户 ID" />
            </Form.Item>
          </>
        );
      case 'autoscaling':
        return (
          <>
            <Form.Item label="最小设备数" name={['minDevices']} initialValue={1}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="最大设备数" name={['maxDevices']} initialValue={10}>
              <InputNumber min={1} max={1000} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="扩容阈值 (%)" name={['scaleUpThreshold']} initialValue={80}>
              <InputNumber min={50} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="缩容阈值 (%)" name={['scaleDownThreshold']} initialValue={30}>
              <InputNumber min={0} max={50} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="冷却时间 (分钟)" name={['cooldownMinutes']} initialValue={5}>
              <InputNumber min={1} max={60} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="目标用户" name={['targetUserId']}>
              <Input placeholder="留空则应用于所有用户" />
            </Form.Item>
          </>
        );
      case 'backup':
        return (
          <>
            <Form.Item label="备份类型" name={['backupType']} initialValue="snapshot">
              <Select>
                <Option value="snapshot">快照</Option>
                <Option value="full">完整备份</Option>
                <Option value="incremental">增量备份</Option>
              </Select>
            </Form.Item>
            <Form.Item label="保留天数" name={['retentionDays']} initialValue={7}>
              <InputNumber min={1} max={365} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="最大备份数" name={['maxBackups']} initialValue={5}>
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="备份范围" name={['scope']} initialValue="all">
              <Select>
                <Option value="all">所有设备</Option>
                <Option value="active">活跃设备</Option>
                <Option value="critical">关键设备</Option>
              </Select>
            </Form.Item>
            <Form.Item label="压缩备份" name={['compress']} valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </>
        );
      case 'expiration-warning':
        return (
          <>
            <Form.Item label="提前天数" name={['daysBeforeExpiration']} initialValue={3}>
              <InputNumber min={1} max={30} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="通知渠道" name={['channels']} initialValue={['email']}>
              <Select mode="multiple">
                <Option value="email">邮件</Option>
                <Option value="sms">短信</Option>
                <Option value="websocket">站内通知</Option>
              </Select>
            </Form.Item>
            <Form.Item label="重复提醒" name={['repeat']} valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
            <Form.Item label="重复间隔 (天)" name={['repeatInterval']} initialValue={1}>
              <InputNumber min={1} max={7} style={{ width: '100%' }} />
            </Form.Item>
          </>
        );
      default:
        return (
          <Form.Item label="自定义配置 (JSON)" name={['custom']}>
            <TextArea rows={6} placeholder='{"key": "value"}' />
          </Form.Item>
        );
    }
  };

  const ruleColumns: ColumnsType<LifecycleRule> = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <strong>{name}</strong>
          {record.description && (
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.description}</span>
          )}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type) => getTypeTag(type),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled, record) => (
        <Switch
          checked={enabled}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={(checked) => handleToggle(record.id, checked)}
        />
      ),
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
      title: '调度计划',
      dataIndex: 'schedule',
      key: 'schedule',
      width: 150,
      render: (schedule) => schedule || <Tag>手动触发</Tag>,
    },
    {
      title: '执行统计',
      key: 'execution',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>已执行: {record.executionCount} 次</span>
          {record.lastExecutedAt && (
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
              上次: {dayjs(record.lastExecutedAt).format('MM-DD HH:mm')}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: '下次执行',
      dataIndex: 'nextExecutionAt',
      key: 'nextExecutionAt',
      width: 160,
      render: (time) =>
        time ? (
          <Tooltip title={dayjs(time).format('YYYY-MM-DD HH:mm:ss')}>
            {dayjs(time).fromNow()}
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleExecute(record.id, record.name)}
            disabled={!record.enabled}
          >
            执行
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ExperimentOutlined />}
            onClick={() => handleTest(record.id, record.name)}
          >
            测试
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除此规则？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const historyColumns: ColumnsType<LifecycleExecutionHistory> = [
    {
      title: '规则名称',
      dataIndex: 'ruleName',
      key: 'ruleName',
      width: 180,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160,
      render: (time) => dayjs(time).format('MM-DD HH:mm:ss'),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 160,
      render: (time) => (time ? dayjs(time).format('MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '耗时',
      key: 'duration',
      width: 100,
      render: (_, record) => {
        if (!record.endTime) return '-';
        const duration = dayjs(record.endTime).diff(dayjs(record.startTime), 'second');
        return `${duration}s`;
      },
    },
    {
      title: '影响设备',
      dataIndex: 'affectedDevices',
      key: 'affectedDevices',
      width: 100,
      align: 'center',
    },
    {
      title: '成功率',
      key: 'successRate',
      width: 120,
      render: (_, record) => {
        if (!record.details) return '-';
        const total = record.details.succeeded + record.details.failed;
        if (total === 0) return '-';
        const rate = (record.details.succeeded / total) * 100;
        return <Progress percent={Math.round(rate)} size="small" />;
      },
    },
    {
      title: '触发方式',
      dataIndex: 'executedBy',
      key: 'executedBy',
      width: 100,
      render: (type) => (type === 'manual' ? <Tag color="blue">手动</Tag> : <Tag>自动</Tag>),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => viewHistoryDetail(record)}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总规则数"
                value={stats?.totalRules || 0}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="活跃规则"
                value={stats?.activeRules || 0}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总执行次数"
                value={stats?.totalExecutions || 0}
                prefix={<HistoryOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="成功率"
                value={stats?.successRate || 0}
                precision={1}
                suffix="%"
                valueStyle={{ color: (stats?.successRate || 0) > 90 ? '#52c41a' : '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 快速模板 */}
        {templates.length > 0 && (
          <Card title="快速创建" size="small">
            <Space wrap>
              {templates.map((template: any) => (
                <Button
                  key={template.id}
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => handleCreateFromTemplate(template.id)}
                >
                  {template.name}
                </Button>
              ))}
            </Space>
          </Card>
        )}

        {/* 主内容 */}
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="规则管理" key="rules">
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <Space>
                  <Select
                    placeholder="筛选类型"
                    style={{ width: 140 }}
                    allowClear
                    value={filterType}
                    onChange={setFilterType}
                  >
                    <Option value="cleanup">自动清理</Option>
                    <Option value="autoscaling">自动扩缩</Option>
                    <Option value="backup">自动备份</Option>
                    <Option value="expiration-warning">到期提醒</Option>
                  </Select>
                  <Select
                    placeholder="筛选状态"
                    style={{ width: 120 }}
                    allowClear
                    value={filterEnabled}
                    onChange={setFilterEnabled}
                  >
                    <Option value={true}>已启用</Option>
                    <Option value={false}>已禁用</Option>
                  </Select>
                </Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                  新建规则
                </Button>
              </div>

              <Table
                columns={ruleColumns}
                dataSource={rules}
                rowKey="id"
                loading={loading}
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
                scroll={{ x: 1500 }}
              />
            </TabPane>

            <TabPane tab="执行历史" key="history">
              <Table
                columns={historyColumns}
                dataSource={history}
                rowKey="id"
                loading={historyLoading}
                pagination={{
                  current: historyPage,
                  pageSize: historyPageSize,
                  total: historyTotal,
                  onChange: (newPage, newPageSize) => {
                    setHistoryPage(newPage);
                    setHistoryPageSize(newPageSize || 10);
                  },
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 条`,
                }}
                scroll={{ x: 1200 }}
              />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      {/* 创建/编辑模态框 */}
      <Modal
        title={editingRule ? '编辑生命周期规则' : '创建生命周期规则'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={700}
        destroyOnClose
      >
        <Alert
          message="生命周期规则可以自动管理设备状态，减少人工干预"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Form form={form} layout="vertical">
          <Form.Item
            label="规则名称"
            name="name"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如: 空闲设备自动清理" />
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
                <Select
                  placeholder="选择类型"
                  onChange={(value) => {
                    configForm.resetFields();
                    form.setFieldsValue({ type: value });
                  }}
                >
                  <Option value="cleanup">自动清理</Option>
                  <Option value="autoscaling">自动扩缩容</Option>
                  <Option value="backup">自动备份</Option>
                  <Option value="expiration-warning">到期提醒</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="优先级" name="priority" initialValue={0}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="调度计划 (Cron)" name="schedule">
            <Input placeholder="例如: 0 2 * * * (每天凌晨2点)" />
          </Form.Item>

          <Form.Item label="启用规则" name="enabled" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          <Divider>规则配置</Divider>

          <Form form={configForm} layout="vertical">
            {form.getFieldValue('type') && renderConfigForm(form.getFieldValue('type'))}
          </Form>
        </Form>
      </Modal>

      {/* 历史详情模态框 */}
      <Modal
        title="执行详情"
        open={historyDetailVisible}
        onCancel={() => setHistoryDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setHistoryDetailVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedHistory && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="规则名称" span={2}>
                {selectedHistory.ruleName}
              </Descriptions.Item>
              <Descriptions.Item label="状态">{getStatusTag(selectedHistory.status)}</Descriptions.Item>
              <Descriptions.Item label="触发方式">
                {selectedHistory.executedBy === 'manual' ? '手动' : '自动'}
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">
                {dayjs(selectedHistory.startTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="结束时间">
                {selectedHistory.endTime
                  ? dayjs(selectedHistory.endTime).format('YYYY-MM-DD HH:mm:ss')
                  : '进行中'}
              </Descriptions.Item>
              <Descriptions.Item label="影响设备数" span={2}>
                {selectedHistory.affectedDevices}
              </Descriptions.Item>
            </Descriptions>

            {selectedHistory.details && (
              <>
                <Divider>执行结果</Divider>
                <Row gutter={16}>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title="成功"
                        value={selectedHistory.details.succeeded}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title="失败"
                        value={selectedHistory.details.failed}
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title="跳过"
                        value={selectedHistory.details.skipped}
                        valueStyle={{ color: '#8c8c8c' }}
                      />
                    </Card>
                  </Col>
                </Row>

                {selectedHistory.details.errors && selectedHistory.details.errors.length > 0 && (
                  <>
                    <Divider>错误信息</Divider>
                    <Timeline>
                      {selectedHistory.details.errors.map((error, index) => (
                        <Timeline.Item key={index} color="red">
                          {error}
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  </>
                )}
              </>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default LifecycleDashboard;
