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
  Divider,
  Alert,
  message,
} from 'antd';
import { SEMANTIC, PRIMARY, NEUTRAL_LIGHT } from '@/theme';
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
  SettingOutlined,
  CodeOutlined,
  FormOutlined,
  SearchOutlined,
  ImportOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import DynamicConfigForm from './ProviderConfig/DynamicConfigForm';
import { getProviderFields } from './ProviderConfig/fieldConfigs';
import type { ProviderType } from './ProviderConfig/types';
import TestResultModal, { type TestResult } from './ProviderConfig/TestResultModal';
import ImportExportModal from './ProviderConfig/ImportExportModal';
import {
  useProxyProviders,
  useCreateProxyProvider,
  useUpdateProxyProvider,
  useDeleteProxyProvider,
  useToggleProxyProvider,
  useTestProxyProvider,
  type ProxyProvider,
} from '@/hooks/queries/useProxy';
import { getProxyProviderConfig } from '@/services/proxy';
import type { ColumnsType } from 'antd/es/table';

// ✅ 使用 memo 包装组件，避免不必要的重渲染
const ProviderConfig: React.FC = memo(() => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProxyProvider | null>(null);
  const [useAdvancedMode, setUseAdvancedMode] = useState(false); // 是否使用高级模式（JSON）
  const [selectedProviderType, setSelectedProviderType] = useState<ProviderType | null>(null);
  const [form] = Form.useForm();

  // 筛选状态
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterEnabled, setFilterEnabled] = useState<boolean | null>(null);
  const [filterSuccessRateMin, setFilterSuccessRateMin] = useState<number | null>(null);

  // 测试结果状态
  const [testResultModalVisible, setTestResultModalVisible] = useState(false);
  const [currentTestingProvider, setCurrentTestingProvider] = useState<ProxyProvider | null>(null);
  const [currentTestResult, setCurrentTestResult] = useState<TestResult | null>(null);

  // 批量操作状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 导入导出状态
  const [importExportModalVisible, setImportExportModalVisible] = useState(false);

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
    setSelectedProviderType(null);
    setUseAdvancedMode(false);
    form.resetFields();
    setIsModalOpen(true);
  }, [form]);

  const handleEdit = useCallback(async (provider: ProxyProvider) => {
    setEditingProvider(provider);
    setSelectedProviderType(provider.type as ProviderType);
    setUseAdvancedMode(false); // 默认使用表单模式

    // 先设置基本字段并打开模态框
    const baseFormValues = {
      name: provider.name,
      type: provider.type,
      enabled: provider.enabled,
      priority: provider.priority,
      costPerGB: provider.costPerGB,
    };
    form.setFieldsValue(baseFormValues);
    setIsModalOpen(true);

    // 异步获取解密后的配置
    if (provider.hasConfig) {
      try {
        const config = await getProxyProviderConfig(provider.id);
        // 将配置字段填充到表单
        form.setFieldsValue({
          ...baseFormValues,
          ...config,
        });
      } catch (error) {
        console.error('获取供应商配置失败:', error);
        message.warning('获取配置详情失败，请重新填写配置信息');
      }
    }
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      // 根据模式处理数据
      let submitData;
      if (useAdvancedMode) {
        // 高级模式：config 是 JSON 字符串，需要解析
        submitData = {
          name: values.name,
          type: values.type,
          enabled: values.enabled,
          priority: values.priority,
          costPerGB: values.costPerGB,
          config: typeof values.config === 'string' ? JSON.parse(values.config) : values.config,
        };
      } else {
        // 表单模式：从各个字段收集到 config 对象
        const { name, type, enabled, priority, costPerGB, ...configFields } = values;
        submitData = {
          name,
          type,
          enabled,
          priority,
          costPerGB,
          config: configFields, // 其他字段都是配置项
        };
      }

      if (editingProvider) {
        // 更新时不发送 type 字段（后端 UpdateProxyProviderDto 不允许修改 type）
        const { type: _type, ...updateData } = submitData;
        updateMutation.mutate(
          { id: editingProvider.id, data: updateData },
          {
            onSuccess: () => {
              setIsModalOpen(false);
              setEditingProvider(null);
              setSelectedProviderType(null);
              form.resetFields();
            },
          }
        );
      } else {
        createMutation.mutate(submitData, {
          onSuccess: () => {
            setIsModalOpen(false);
            setSelectedProviderType(null);
            form.resetFields();
          },
        });
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  }, [form, editingProvider, updateMutation, createMutation, useAdvancedMode]);

  // ✅ 处理测试连接 (必须在 columns 之前定义，否则会触发 TDZ 错误)
  const handleTestConnection = useCallback((provider: ProxyProvider) => {
    setCurrentTestingProvider(provider);
    setCurrentTestResult(null);
    setTestResultModalVisible(true);

    // 执行测试
    const startTime = Date.now();
    testMutation.mutate(provider.id, {
      onSuccess: (data) => {
        const duration = Date.now() - startTime;
        const result: TestResult = {
          success: data.success !== false, // 默认true，除非明确返回false
          message: data.message || (data.success ? '连接成功' : '连接失败'),
          proxyCount: data.proxyCount,
          timestamp: new Date().toISOString(),
          duration,
          proxyIp: data.proxyIp || (data.message?.match(/IP:\s*([\d.]+)/) ? data.message.match(/IP:\s*([\d.]+)/)[1] : undefined),
          responseTime: data.responseTime,
        };
        setCurrentTestResult(result);
      },
      onError: (error: any) => {
        const duration = Date.now() - startTime;
        const result: TestResult = {
          success: false,
          message: '测试失败',
          error: error.message || error.toString(),
          timestamp: new Date().toISOString(),
          duration,
        };
        setCurrentTestResult(result);
      },
    });
  }, [testMutation]);

  // ✅ 使用 useMemo 缓存列定义，避免每次渲染都重新创建
  const columns: ColumnsType<ProxyProvider> = useMemo(() => [
    {
      title: '供应商',
      key: 'provider',
      width: 200,
      render: (_, record) => {
        const typeColors: Record<string, string> = {
          ipidea: 'blue',
          kookeey: 'cyan',
          brightdata: 'green',
          oxylabs: 'orange',
          iproyal: 'purple',
          smartproxy: 'magenta',
        };
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <Tag color={typeColors[record.type] || 'default'}>{record.type.toUpperCase()}</Tag>
          </div>
        );
      },
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
          <div style={{ color: SEMANTIC.success.main }}>成功: {record.successRequests}</div>
          <div style={{ color: SEMANTIC.error.main }}>失败: {record.failedRequests}</div>
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
          color: rate >= 90 ? SEMANTIC.success.main : rate >= 70 ? SEMANTIC.warning.main : SEMANTIC.error.main,
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
              onClick={() => handleTestConnection(record)}
              loading={testMutation.isPending && currentTestingProvider?.id === record.id}
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
          {(record.type === 'ipidea' || record.type === 'kookeey') && (
            <Tooltip title={`${record.type.toUpperCase()} 管理`}>
              <Button
                type="link"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => window.open(`/#/proxy/${record.type}/${record.id}`, '_blank')}
              />
            </Tooltip>
          )}
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
  ], [handleEdit, handleTestConnection, testMutation, toggleMutation, deleteMutation, currentTestingProvider]);

  // ✅ 使用 useMemo 缓存筛选后的数据
  const filteredProviders = useMemo(() => {
    if (!providers) return [];

    return providers.filter(provider => {
      // 名称/网关搜索
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const nameMatch = provider.name.toLowerCase().includes(searchLower);
        const gatewayMatch = provider.config?.gateway?.toLowerCase().includes(searchLower);
        if (!nameMatch && !gatewayMatch) return false;
      }

      // 类型筛选
      if (filterType && provider.type !== filterType) {
        return false;
      }

      // 状态筛选
      if (filterEnabled !== null && provider.enabled !== filterEnabled) {
        return false;
      }

      // 成功率筛选
      if (filterSuccessRateMin !== null && provider.successRate < filterSuccessRateMin) {
        return false;
      }

      return true;
    });
  }, [providers, searchText, filterType, filterEnabled, filterSuccessRateMin]);

  // ✅ 使用 useMemo 缓存总览统计计算（基于原始数据）
  const { totalProviders, enabledProviders, avgSuccessRate, totalRequests } = useMemo(() => {
    const total = providers?.length || 0;
    const enabled = providers?.filter(p => p.enabled).length || 0;
    const avgRate = providers && providers.length > 0
      ? providers.reduce((sum, p) => sum + p.successRate, 0) / providers.length
      : 0;
    const requests = providers?.reduce((sum, p) => sum + p.totalRequests, 0) || 0;
    return { totalProviders: total, enabledProviders: enabled, avgSuccessRate: avgRate, totalRequests: requests };
  }, [providers]);

  // ✅ 计算筛选器是否激活
  const hasActiveFilters = useMemo(() => {
    return !!(searchText || filterType || filterEnabled !== null || filterSuccessRateMin !== null);
  }, [searchText, filterType, filterEnabled, filterSuccessRateMin]);

  // ✅ 清空所有筛选
  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setFilterType(null);
    setFilterEnabled(null);
    setFilterSuccessRateMin(null);
  }, []);

  // ✅ 批量启用/禁用
  const handleBatchToggle = useCallback(async (enabled: boolean) => {
    const selectedProviders = providers?.filter(p => selectedRowKeys.includes(p.id)) || [];

    try {
      // 依次执行启用/禁用操作
      for (const provider of selectedProviders) {
        await toggleMutation.mutateAsync({ id: provider.id, enabled });
      }

      message.success(`已${enabled ? '启用' : '禁用'} ${selectedProviders.length} 个供应商`);
      setSelectedRowKeys([]);
      refetch();
    } catch (error) {
      message.error(`批量${enabled ? '启用' : '禁用'}失败`);
    }
  }, [selectedRowKeys, providers, toggleMutation, refetch]);

  // ✅ 批量删除
  const handleBatchDelete = useCallback(() => {
    const selectedProviders = providers?.filter(p => selectedRowKeys.includes(p.id)) || [];

    Modal.confirm({
      title: '确认批量删除',
      content: (
        <div>
          <p>确定要删除以下 {selectedProviders.length} 个供应商吗？此操作不可恢复。</p>
          <ul style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}>
            {selectedProviders.map(p => (
              <li key={p.id}>{p.name} ({p.type})</li>
            ))}
          </ul>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 依次删除
          for (const provider of selectedProviders) {
            await deleteMutation.mutateAsync(provider.id);
          }

          message.success(`已成功删除 ${selectedProviders.length} 个供应商`);
          setSelectedRowKeys([]);
          refetch();
        } catch (error) {
          message.error('批量删除失败');
        }
      },
    });
  }, [selectedRowKeys, providers, deleteMutation, refetch]);

  // ✅ 批量测试连接
  const handleBatchTest = useCallback(async () => {
    const selectedProviders = providers?.filter(p => selectedRowKeys.includes(p.id)) || [];

    message.info(`开始批量测试 ${selectedProviders.length} 个供应商...`);

    let successCount = 0;
    let failCount = 0;

    for (const provider of selectedProviders) {
      try {
        await testMutation.mutateAsync(provider.id);
        successCount++;
      } catch {
        failCount++;
      }
    }

    message.success(`批量测试完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    setSelectedRowKeys([]);
  }, [selectedRowKeys, providers, testMutation]);

  // ✅ 处理导入
  const handleImport = useCallback(async (importedProviders: Partial<ProxyProvider>[]) => {
    let successCount = 0;
    let failCount = 0;

    for (const provider of importedProviders) {
      try {
        await createMutation.mutateAsync({
          name: provider.name!,
          type: provider.type!,
          enabled: provider.enabled ?? true,
          config: provider.config!,
        });
        successCount++;
      } catch (error) {
        console.error('Import failed for provider:', provider.name, error);
        failCount++;
      }
    }

    if (failCount > 0) {
      message.warning(`导入完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    } else {
      message.success(`成功导入 ${successCount} 个供应商配置`);
    }

    refetch();
  }, [createMutation, refetch]);

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
              valueStyle={{ color: SEMANTIC.success.main }}
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
                color: avgSuccessRate >= 90 ? SEMANTIC.success.main : avgSuccessRate >= 70 ? SEMANTIC.warning.main : SEMANTIC.error.main,
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

      {/* 筛选区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="搜索供应商名称或网关地址"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="供应商类型"
              value={filterType}
              onChange={setFilterType}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value="ipidea">IPIDEA</Select.Option>
              <Select.Option value="kookeey">Kookeey</Select.Option>
              <Select.Option value="brightdata">Bright Data</Select.Option>
              <Select.Option value="oxylabs">Oxylabs</Select.Option>
              <Select.Option value="iproyal">IPRoyal</Select.Option>
              <Select.Option value="smartproxy">SmartProxy</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="启用状态"
              value={filterEnabled}
              onChange={setFilterEnabled}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value={true}>已启用</Select.Option>
              <Select.Option value={false}>已禁用</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="成功率"
              value={filterSuccessRateMin}
              onChange={setFilterSuccessRateMin}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value={90}>≥ 90%</Select.Option>
              <Select.Option value={80}>≥ 80%</Select.Option>
              <Select.Option value={70}>≥ 70%</Select.Option>
              <Select.Option value={50}>≥ 50%</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Space>
              {hasActiveFilters && (
                <Button
                  icon={<CloseCircleOutlined />}
                  onClick={handleClearFilters}
                >
                  清空筛选
                </Button>
              )}
              {hasActiveFilters && (
                <Tag color="blue">
                  找到 {filteredProviders.length} / {totalProviders} 个
                </Tag>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 操作按钮 */}
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
          <Button
            icon={<ImportOutlined />}
            onClick={() => setImportExportModalVisible(true)}
          >
            导入/导出
          </Button>

          {/* 批量操作按钮（有选中时显示） */}
          {selectedRowKeys.length > 0 && (
            <>
              <Divider type="vertical" />
              <span style={{ marginLeft: 8, color: NEUTRAL_LIGHT.text.tertiary }}>
                已选择 {selectedRowKeys.length} 项
              </span>
              <Button
                icon={<CheckCircleOutlined />}
                onClick={() => handleBatchToggle(true)}
              >
                批量启用
              </Button>
              <Button
                icon={<CloseCircleOutlined />}
                onClick={() => handleBatchToggle(false)}
              >
                批量禁用
              </Button>
              <Button
                icon={<ExperimentOutlined />}
                onClick={handleBatchTest}
              >
                批量测试
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
              >
                批量删除
              </Button>
            </>
          )}
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredProviders}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1300 }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          selections: [
            Table.SELECTION_ALL,
            Table.SELECTION_INVERT,
            Table.SELECTION_NONE,
          ],
        }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个供应商${hasActiveFilters ? ` (已筛选，总共 ${totalProviders} 个)` : ''}`,
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
                <Select
                  placeholder="选择类型"
                  disabled={!!editingProvider}
                  onChange={(value) => setSelectedProviderType(value as ProviderType)}
                >
                  <Select.Option value="ipidea">IPIDEA (推荐)</Select.Option>
                  <Select.Option value="kookeey">Kookeey (家宽代理)</Select.Option>
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

          <Divider />

          {/* 配置模式切换 */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>供应商配置</div>
            <Space>
              <Button
                size="small"
                type={!useAdvancedMode ? 'primary' : 'default'}
                icon={<FormOutlined />}
                onClick={() => {
                  if (useAdvancedMode) {
                    // 从 JSON 模式切换到表单模式，尝试解析 JSON
                    try {
                      const configValue = form.getFieldValue('config');
                      if (configValue) {
                        const configObj = typeof configValue === 'string' ? JSON.parse(configValue) : configValue;
                        form.setFieldsValue(configObj);
                      }
                    } catch (error) {
                      console.error('JSON 解析失败:', error);
                    }
                  }
                  setUseAdvancedMode(false);
                }}
              >
                表单模式
              </Button>
              <Button
                size="small"
                type={useAdvancedMode ? 'primary' : 'default'}
                icon={<CodeOutlined />}
                onClick={() => {
                  if (!useAdvancedMode && selectedProviderType) {
                    // 从表单模式切换到 JSON 模式，收集所有配置字段
                    const fields = getProviderFields(selectedProviderType);
                    const configObj: Record<string, any> = {};
                    fields.forEach(field => {
                      const value = form.getFieldValue(field.name);
                      if (value !== undefined && value !== null && value !== '') {
                        configObj[field.name] = value;
                      }
                    });
                    form.setFieldsValue({ config: JSON.stringify(configObj, null, 2) });
                  }
                  setUseAdvancedMode(true);
                }}
              >
                JSON 模式
              </Button>
            </Space>
          </div>

          {/* 配置提示信息 */}
          {!selectedProviderType && !useAdvancedMode && (
            <Alert
              message="请先选择供应商类型"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* 动态表单模式 */}
          {!useAdvancedMode && selectedProviderType && (
            <DynamicConfigForm
              form={form}
              providerType={selectedProviderType}
              isEditing={!!editingProvider}
            />
          )}

          {/* JSON 高级模式 */}
          {useAdvancedMode && (
            <Form.Item
              name="config"
              help="JSON格式的配置信息（包含API密钥等）"
              rules={[
                { required: true, message: '请输入配置信息' },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    try {
                      JSON.parse(value);
                      return Promise.resolve();
                    } catch {
                      return Promise.reject(new Error('JSON 格式不正确'));
                    }
                  },
                },
              ]}
            >
              <Input.TextArea
                rows={10}
                placeholder={`通用示例：
{
  "apiKey": "your-api-key",
  "username": "your-username",
  "password": "your-password",
  "apiUrl": "https://api.provider.com",
  "zone": "residential"
}

IPIDEA 示例：
{
  "apiKey": "your-appkey",
  "username": "认证账户用户名",
  "password": "认证账户密码",
  "gateway": "e255c08e04856698.lqz.na.ipidea.online",
  "port": 2336,
  "apiUrl": "https://api.ipidea.net"
}

Kookeey 示例：
{
  "accessId": "12345",
  "token": "your-secret-token",
  "apiUrl": "https://kookeey.com"
}`}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 测试结果详情 */}
      <TestResultModal
        visible={testResultModalVisible}
        onCancel={() => setTestResultModalVisible(false)}
        provider={currentTestingProvider}
        testResult={currentTestResult}
        loading={testMutation.isPending}
      />

      {/* 导入导出对话框 */}
      <ImportExportModal
        visible={importExportModalVisible}
        onCancel={() => setImportExportModalVisible(false)}
        providers={providers || []}
        onImport={handleImport}
      />
    </div>
  );
});

ProviderConfig.displayName = 'Proxy.ProviderConfig';

export default ProviderConfig;
