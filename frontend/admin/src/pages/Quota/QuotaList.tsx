import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Progress,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Statistic,
  Row,
  Col,
  Alert,
  Badge,
  Tooltip,
  Drawer,
} from 'antd';
import {
  PlusOutlined,
  WarningOutlined,
  ReloadOutlined,
  LineChartOutlined,
  BellOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { Quota, CreateQuotaDto, UpdateQuotaDto, QuotaAlert, QuotaStatistics } from '@/types';
import * as quotaService from '@/services/quota';

const QuotaList: React.FC = () => {
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedQuota, setSelectedQuota] = useState<Quota | null>(null);
  const [alerts, setAlerts] = useState<QuotaAlert[]>([]);
  const [statistics, setStatistics] = useState<QuotaStatistics | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // 加载配额列表
  const loadQuotas = useCallback(async () => {
    setLoading(true);
    try {
      // 这里需要一个获取所有配额的API,暂时使用模拟数据
      // 实际应该有一个 GET /quotas 接口
      const mockQuotas: Quota[] = [];
      setQuotas(mockQuotas);
    } catch (error) {
      message.error('加载配额列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载配额告警
  const loadAlerts = useCallback(async () => {
    try {
      const result = await quotaService.getQuotaAlerts(80);
      if (result.success && result.data) {
        setAlerts(result.data);
      }
    } catch (error) {
      console.error('加载配额告警失败:', error);
    }
  }, []);

  useEffect(() => {
    loadQuotas();
    loadAlerts();
    // 每30秒刷新一次告警
    const alertInterval = setInterval(loadAlerts, 30000);
    return () => clearInterval(alertInterval);
  }, [loadQuotas, loadAlerts]);

  // 创建配额
  const handleCreateQuota = useCallback(async (values: CreateQuotaDto) => {
    try {
      const result = await quotaService.createQuota(values);
      if (result.success) {
        message.success('创建配额成功');
        setCreateModalVisible(false);
        form.resetFields();
        loadQuotas();
      } else {
        message.error(result.message || '创建配额失败');
      }
    } catch (error) {
      message.error('创建配额失败');
      console.error(error);
    }
  }, [form, loadQuotas]);

  // 更新配额
  const handleUpdateQuota = useCallback(async (values: UpdateQuotaDto) => {
    if (!selectedQuota) return;
    try {
      const result = await quotaService.updateQuota(selectedQuota.id, values);
      if (result.success) {
        message.success('更新配额成功');
        setEditModalVisible(false);
        editForm.resetFields();
        loadQuotas();
      } else {
        message.error(result.message || '更新配额失败');
      }
    } catch (error) {
      message.error('更新配额失败');
      console.error(error);
    }
  }, [selectedQuota, editForm, loadQuotas]);

  // 查看配额详情
  const handleViewDetail = useCallback(async (record: Quota) => {
    setSelectedQuota(record);
    setSelectedUserId(record.userId);
    setDetailDrawerVisible(true);

    // 加载使用统计
    try {
      const result = await quotaService.getUsageStats(record.userId);
      if (result.success && result.data) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error('加载使用统计失败:', error);
    }
  }, []);

  // 编辑配额
  const handleEdit = useCallback((record: Quota) => {
    setSelectedQuota(record);
    editForm.setFieldsValue({
      limits: record.limits,
      autoRenew: record.autoRenew,
    });
    setEditModalVisible(true);
  }, [editForm]);

  // 计算使用率百分比
  const calculateUsagePercent = (used: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'green',
      exceeded: 'red',
      suspended: 'orange',
      expired: 'gray',
    };
    return colors[status] || 'default';
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      active: '正常',
      exceeded: '超限',
      suspended: '暂停',
      expired: '过期',
    };
    return texts[status] || status;
  };

  // 表格列配置
  const columns = useMemo(() => [
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 200,
      ellipsis: true,
    },
    {
      title: '设备配额',
      key: 'devices',
      width: 180,
      render: (record: Quota) => {
        const percent = calculateUsagePercent(
          record.usage.currentDevices,
          record.limits.maxDevices
        );
        return (
          <div>
            <div>
              {record.usage.currentDevices} / {record.limits.maxDevices}
            </div>
            <Progress
              percent={percent}
              size="small"
              status={percent > 90 ? 'exception' : percent > 70 ? 'normal' : 'success'}
            />
          </div>
        );
      },
    },
    {
      title: 'CPU 配额',
      key: 'cpu',
      width: 180,
      render: (record: Quota) => {
        const percent = calculateUsagePercent(
          record.usage.usedCpuCores,
          record.limits.totalCpuCores
        );
        return (
          <div>
            <div>{record.usage.usedCpuCores} / {record.limits.totalCpuCores} 核</div>
            <Progress percent={percent} size="small" />
          </div>
        );
      },
    },
    {
      title: '内存配额',
      key: 'memory',
      width: 180,
      render: (record: Quota) => {
        const percent = calculateUsagePercent(
          record.usage.usedMemoryGB,
          record.limits.totalMemoryGB
        );
        return (
          <div>
            <div>{record.usage.usedMemoryGB} / {record.limits.totalMemoryGB} GB</div>
            <Progress percent={percent} size="small" />
          </div>
        );
      },
    },
    {
      title: '存储配额',
      key: 'storage',
      width: 180,
      render: (record: Quota) => {
        const percent = calculateUsagePercent(
          record.usage.usedStorageGB,
          record.limits.totalStorageGB
        );
        return (
          <div>
            <div>{record.usage.usedStorageGB} / {record.limits.totalStorageGB} GB</div>
            <Progress percent={percent} size="small" />
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (record: Quota) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
            详情
          </Button>
        </Space>
      ),
    },
  ], [handleEdit, handleViewDetail]);

  // 配额告警组件
  const AlertPanel = useMemo(() => {
    if (alerts.length === 0) return null;

    return (
      <Alert
        message={
          <Space>
            <WarningOutlined />
            <span>配额告警 ({alerts.length})</span>
          </Space>
        }
        description={
          <div>
            {alerts.slice(0, 3).map((alert, index) => (
              <div key={index} style={{ marginBottom: 8 }}>
                <Tag color="orange">{alert.quotaType}</Tag>
                <span>用户 {alert.userId}: </span>
                <span>{alert.message} (使用率: {alert.usagePercent}%)</span>
              </div>
            ))}
            {alerts.length > 3 && (
              <Button type="link" size="small">
                查看全部 {alerts.length} 条告警
              </Button>
            )}
          </div>
        }
        type="warning"
        showIcon
        closable
        style={{ marginBottom: 16 }}
      />
    );
  }, [alerts]);

  // 使用趋势图表配置
  const usageTrendOption = useMemo(() => {
    if (!statistics) return null;

    return {
      title: {
        text: '配额使用趋势',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      legend: {
        data: ['设备', 'CPU(核)', '内存(GB)', '存储(GB)'],
        bottom: 10,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: statistics.dailyUsage?.map((item) => item.date) || [],
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '设备',
          type: 'line',
          data: statistics.dailyUsage?.map((item) => item.devices) || [],
          smooth: true,
        },
        {
          name: 'CPU(核)',
          type: 'line',
          data: statistics.dailyUsage?.map((item) => item.cpuCores) || [],
          smooth: true,
        },
        {
          name: '内存(GB)',
          type: 'line',
          data: statistics.dailyUsage?.map((item) => item.memoryGB) || [],
          smooth: true,
        },
        {
          name: '存储(GB)',
          type: 'line',
          data: statistics.dailyUsage?.map((item) => item.storageGB) || [],
          smooth: true,
        },
      ],
    };
  }, [statistics]);

  // 配额分布饼图配置
  const distributionOption = useMemo(() => {
    if (!statistics) return null;

    return {
      title: {
        text: '当前资源使用分布',
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
      },
      series: [
        {
          name: '资源使用',
          type: 'pie',
          radius: '50%',
          data: [
            { value: statistics.currentUsage?.devices || 0, name: '设备数' },
            { value: statistics.currentUsage?.cpuCores || 0, name: 'CPU核数' },
            { value: statistics.currentUsage?.memoryGB || 0, name: '内存(GB)' },
            { value: statistics.currentUsage?.storageGB || 0, name: '存储(GB)' },
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  }, [statistics]);

  return (
    <div>
      {/* 配额告警面板 */}
      {AlertPanel}

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总配额数"
              value={quotas.length}
              prefix={<LineChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="正常状态"
              value={quotas.filter((q) => q.status === 'active').length}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="超限配额"
              value={quotas.filter((q) => q.status === 'exceeded').length}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={
                <Space>
                  <span>配额告警</span>
                  <Badge count={alerts.length} />
                </Space>
              }
              value={alerts.length}
              prefix={<BellOutlined />}
              valueStyle={{ color: alerts.length > 0 ? '#faad14' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      {/* 配额列表 */}
      <Card
        title="配额管理"
        extra={
          <Space>
            <Tooltip title="刷新">
              <Button icon={<ReloadOutlined />} onClick={loadQuotas} />
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建配额
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={quotas}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: true,
          }}
        />
      </Card>

      {/* 创建配额模态框 */}
      <Modal
        title="创建配额"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateQuota}
        >
          <Form.Item
            label="用户ID"
            name="userId"
            rules={[{ required: true, message: '请输入用户ID' }]}
          >
            <Input placeholder="输入用户ID" />
          </Form.Item>

          <Form.Item label="设备限制">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['limits', 'maxDevices']}
                  rules={[{ required: true, message: '请输入最大设备数' }]}
                >
                  <InputNumber
                    placeholder="最大设备数"
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['limits', 'maxConcurrentDevices']}
                  rules={[{ required: true, message: '请输入最大并发设备数' }]}
                >
                  <InputNumber
                    placeholder="最大并发设备数"
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item label="资源限制">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name={['limits', 'totalCpuCores']}
                  rules={[{ required: true, message: '请输入总CPU核数' }]}
                >
                  <InputNumber
                    placeholder="总CPU核数"
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['limits', 'totalMemoryGB']}
                  rules={[{ required: true, message: '请输入总内存(GB)' }]}
                >
                  <InputNumber
                    placeholder="总内存(GB)"
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['limits', 'totalStorageGB']}
                  rules={[{ required: true, message: '请输入总存储(GB)' }]}
                >
                  <InputNumber
                    placeholder="总存储(GB)"
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item label="带宽限制">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['limits', 'maxBandwidthMbps']}
                  rules={[{ required: true, message: '请输入最大带宽(Mbps)' }]}
                >
                  <InputNumber
                    placeholder="最大带宽(Mbps)"
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['limits', 'monthlyTrafficGB']}
                  rules={[{ required: true, message: '请输入月流量(GB)' }]}
                >
                  <InputNumber
                    placeholder="月流量(GB)"
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑配额模态框 */}
      <Modal
        title="编辑配额"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        width={700}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateQuota}
        >
          <Form.Item label="设备限制">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name={['limits', 'maxDevices']}>
                  <InputNumber
                    placeholder="最大设备数"
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name={['limits', 'maxConcurrentDevices']}>
                  <InputNumber
                    placeholder="最大并发设备数"
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item label="资源限制">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name={['limits', 'totalCpuCores']}>
                  <InputNumber
                    placeholder="总CPU核数"
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name={['limits', 'totalMemoryGB']}>
                  <InputNumber
                    placeholder="总内存(GB)"
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name={['limits', 'totalStorageGB']}>
                  <InputNumber
                    placeholder="总存储(GB)"
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>
        </Form>
      </Modal>

      {/* 配额详情抽屉 */}
      <Drawer
        title="配额详情"
        width={720}
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setStatistics(null);
        }}
      >
        {selectedQuota && (
          <div>
            <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <p><strong>用户ID:</strong> {selectedQuota.userId}</p>
                  <p><strong>状态:</strong> <Tag color={getStatusColor(selectedQuota.status)}>{getStatusText(selectedQuota.status)}</Tag></p>
                </Col>
                <Col span={12}>
                  <p><strong>创建时间:</strong> {new Date(selectedQuota.createdAt).toLocaleString()}</p>
                  <p><strong>更新时间:</strong> {new Date(selectedQuota.updatedAt).toLocaleString()}</p>
                </Col>
              </Row>
            </Card>

            <Card title="配额限制" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="最大设备数" value={selectedQuota.limits.maxDevices} />
                </Col>
                <Col span={12}>
                  <Statistic title="最大并发设备" value={selectedQuota.limits.maxConcurrentDevices} />
                </Col>
                <Col span={8}>
                  <Statistic title="总CPU(核)" value={selectedQuota.limits.totalCpuCores} />
                </Col>
                <Col span={8}>
                  <Statistic title="总内存(GB)" value={selectedQuota.limits.totalMemoryGB} />
                </Col>
                <Col span={8}>
                  <Statistic title="总存储(GB)" value={selectedQuota.limits.totalStorageGB} />
                </Col>
              </Row>
            </Card>

            <Card title="当前使用" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="当前设备数"
                    value={selectedQuota.usage.currentDevices}
                    suffix={`/ ${selectedQuota.limits.maxDevices}`}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="并发设备"
                    value={selectedQuota.usage.currentConcurrentDevices}
                    suffix={`/ ${selectedQuota.limits.maxConcurrentDevices}`}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="已用CPU(核)"
                    value={selectedQuota.usage.usedCpuCores}
                    suffix={`/ ${selectedQuota.limits.totalCpuCores}`}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="已用内存(GB)"
                    value={selectedQuota.usage.usedMemoryGB}
                    suffix={`/ ${selectedQuota.limits.totalMemoryGB}`}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="已用存储(GB)"
                    value={selectedQuota.usage.usedStorageGB}
                    suffix={`/ ${selectedQuota.limits.totalStorageGB}`}
                  />
                </Col>
              </Row>
            </Card>

            {/* 使用趋势图 */}
            {usageTrendOption && (
              <Card title="使用趋势" size="small" style={{ marginBottom: 16 }}>
                <ReactECharts option={usageTrendOption} style={{ height: 300 }} />
              </Card>
            )}

            {/* 资源分布图 */}
            {distributionOption && (
              <Card title="资源分布" size="small">
                <ReactECharts option={distributionOption} style={{ height: 300 }} />
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default React.memo(QuotaList);
