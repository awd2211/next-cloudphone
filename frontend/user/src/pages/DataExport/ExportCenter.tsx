import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Form,
  Select,
  DatePicker,
  Modal,
  Table,
  Tag,
  Space,
  message,
  Progress,
  Statistic,
  Popconfirm,
  Typography,
  Alert,
  Empty,
} from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  ReloadOutlined,
  ExportOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import {
  createExportTask,
  getExportTasks,
  getExportStats,
  deleteExportTask,
  deleteExportTasks,
  downloadExportFile,
  retryExportTask,
  clearCompletedTasks,
  clearFailedTasks,
  formatFileSize,
  triggerDownload,
  ExportDataType,
  ExportFormat,
  ExportStatus,
  type ExportTask,
  type ExportRequest,
  type ExportStats as ExportStatsType,
  type ExportTaskListQuery,
} from '@/services/export';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// 数据类型配置
const dataTypeConfig: Record<
  ExportDataType,
  { label: string; icon: React.ReactNode; color: string; description: string }
> = {
  [ExportDataType.ORDERS]: {
    label: '订单数据',
    icon: <FileTextOutlined />,
    color: '#1890ff',
    description: '导出所有订单记录，包括订单详情、支付信息等',
  },
  [ExportDataType.DEVICES]: {
    label: '设备数据',
    icon: <FileTextOutlined />,
    color: '#52c41a',
    description: '导出设备列表和配置信息',
  },
  [ExportDataType.TICKETS]: {
    label: '工单数据',
    icon: <FileTextOutlined />,
    color: '#faad14',
    description: '导出工单记录和回复内容',
  },
  [ExportDataType.BILLING]: {
    label: '账单数据',
    icon: <FileTextOutlined />,
    color: '#eb2f96',
    description: '导出账单记录和充值历史',
  },
  [ExportDataType.USAGE]: {
    label: '使用记录',
    icon: <FileTextOutlined />,
    color: '#13c2c2',
    description: '导出设备使用时长和流量记录',
  },
  [ExportDataType.MESSAGES]: {
    label: '消息通知',
    icon: <FileTextOutlined />,
    color: '#722ed1',
    description: '导出所有消息通知记录',
  },
  [ExportDataType.TRANSACTIONS]: {
    label: '交易记录',
    icon: <FileTextOutlined />,
    color: '#fa8c16',
    description: '导出所有交易流水记录',
  },
};

// 格式配置
const formatConfig: Record<ExportFormat, { label: string; icon: React.ReactNode; color: string }> =
  {
    [ExportFormat.CSV]: { label: 'CSV', icon: <FileTextOutlined />, color: '#52c41a' },
    [ExportFormat.EXCEL]: { label: 'Excel', icon: <FileExcelOutlined />, color: '#1890ff' },
    [ExportFormat.PDF]: { label: 'PDF', icon: <FilePdfOutlined />, color: '#f5222d' },
    [ExportFormat.JSON]: { label: 'JSON', icon: <FileTextOutlined />, color: '#faad14' },
  };

// 状态配置
const statusConfig: Record<ExportStatus, { label: string; icon: React.ReactNode; color: string }> =
  {
    [ExportStatus.PENDING]: { label: '等待中', icon: <ClockCircleOutlined />, color: 'default' },
    [ExportStatus.PROCESSING]: {
      label: '处理中',
      icon: <SyncOutlined spin />,
      color: 'processing',
    },
    [ExportStatus.COMPLETED]: { label: '已完成', icon: <CheckCircleOutlined />, color: 'success' },
    [ExportStatus.FAILED]: { label: '失败', icon: <CloseCircleOutlined />, color: 'error' },
    [ExportStatus.EXPIRED]: { label: '已过期', icon: <CloseCircleOutlined />, color: 'warning' },
  };

const ExportCenter: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<ExportTask[]>([]);
  const [stats, setStats] = useState<ExportStatsType | null>(null);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // 查询参数
  const [query, setQuery] = useState<ExportTaskListQuery>({
    page: 1,
    pageSize: 10,
  });

  // 加载任务列表
  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await getExportTasks(query);
      setTasks(response.items);
      setTotal(response.total);
    } catch (error) {
      message.error('加载导出任务失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计
  const loadStats = async () => {
    try {
      const statsData = await getExportStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  useEffect(() => {
    loadTasks();
    loadStats();

    // 自动刷新（每 5 秒）
    const interval = setInterval(() => {
      loadTasks();
      loadStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [query]);

  // 创建导出任务
  const handleCreateExport = async () => {
    try {
      const values = await form.validateFields();

      const exportData: ExportRequest = {
        dataType: values.dataType,
        format: values.format,
      };

      if (values.dateRange) {
        exportData.startDate = values.dateRange[0].format('YYYY-MM-DD');
        exportData.endDate = values.dateRange[1].format('YYYY-MM-DD');
      }

      await createExportTask(exportData);
      message.success('导出任务已创建，正在处理中...');
      setCreateModalVisible(false);
      form.resetFields();
      loadTasks();
      loadStats();
    } catch (error: any) {
      if (error.errorFields) {
        message.error('请填写完整信息');
      } else {
        message.error('创建导出任务失败');
      }
    }
  };

  // 下载文件
  const handleDownload = async (task: ExportTask) => {
    try {
      message.loading({ content: '正在下载...', key: 'download' });
      const blob = await downloadExportFile(task.id);
      triggerDownload(blob, task.fileName);
      message.success({ content: '下载成功！', key: 'download' });
    } catch (error) {
      message.error({ content: '下载失败', key: 'download' });
    }
  };

  // 删除任务
  const handleDelete = async (id: string) => {
    try {
      await deleteExportTask(id);
      message.success('删除成功');
      loadTasks();
      loadStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    try {
      await deleteExportTasks(selectedRowKeys);
      message.success('删除成功');
      setSelectedRowKeys([]);
      loadTasks();
      loadStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 重试任务
  const handleRetry = async (id: string) => {
    try {
      await retryExportTask(id);
      message.success('任务已重新提交');
      loadTasks();
    } catch (error) {
      message.error('重试失败');
    }
  };

  // 清空已完成
  const handleClearCompleted = async () => {
    try {
      await clearCompletedTasks();
      message.success('已清空已完成的任务');
      loadTasks();
      loadStats();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 清空失败
  const handleClearFailed = async () => {
    try {
      await clearFailedTasks();
      message.success('已清空失败的任务');
      loadTasks();
      loadStats();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 表格列
  const columns: ColumnsType<ExportTask> = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      width: 250,
      ellipsis: true,
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 120,
      render: (type: ExportDataType) => {
        const config = dataTypeConfig[type];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: 100,
      render: (format: ExportFormat) => {
        const config = formatConfig[format];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: ExportStatus, record: ExportTask) => {
        const config = statusConfig[status];
        return (
          <Space direction="vertical" size="small">
            <Tag color={config.color} icon={config.icon}>
              {config.label}
            </Tag>
            {status === ExportStatus.PROCESSING && record.recordCount && (
              <Progress percent={50} size="small" status="active" showInfo={false} />
            )}
          </Space>
        );
      },
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      render: (size?: number) => (size ? formatFileSize(size) : '-'),
    },
    {
      title: '记录数',
      dataIndex: 'recordCount',
      key: 'recordCount',
      width: 100,
      render: (count?: number) => count || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: any, record: ExportTask) => (
        <Space size="small">
          {record.status === ExportStatus.COMPLETED && (
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            >
              下载
            </Button>
          )}
          {record.status === ExportStatus.FAILED && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRetry(record.id)}
            >
              重试
            </Button>
          )}
          <Popconfirm title="确认删除此任务？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 页头 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                <ExportOutlined /> 数据导出中心
              </Title>
              <Paragraph type="secondary" style={{ margin: 0 }}>
                导出您的数据，支持多种格式
              </Paragraph>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<ExportOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建导出任务
            </Button>
          </div>
        </Space>
      </Card>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="总任务数" value={stats.total} prefix={<FileTextOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="处理中"
                value={stats.processing + stats.pending}
                valueStyle={{ color: '#1890ff' }}
                prefix={<SyncOutlined spin={stats.processing > 0} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="已完成"
                value={stats.completed}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总大小"
                value={formatFileSize(stats.totalSize)}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              loadTasks();
              loadStats();
            }}
          >
            刷新
          </Button>

          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={handleBatchDelete}
          >
            删除选中 ({selectedRowKeys.length})
          </Button>

          <Popconfirm title="确认清空所有已完成的任务？" onConfirm={handleClearCompleted}>
            <Button icon={<ClearOutlined />}>清空已完成</Button>
          </Popconfirm>

          <Popconfirm title="确认清空所有失败的任务？" onConfirm={handleClearFailed}>
            <Button icon={<ClearOutlined />}>清空失败</Button>
          </Popconfirm>

          <Select
            placeholder="状态筛选"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => setQuery({ ...query, status: value, page: 1 })}
          >
            {Object.entries(statusConfig).map(([key, config]) => (
              <Option key={key} value={key}>
                {config.label}
              </Option>
            ))}
          </Select>

          <Select
            placeholder="数据类型"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => setQuery({ ...query, dataType: value, page: 1 })}
          >
            {Object.entries(dataTypeConfig).map(([key, config]) => (
              <Option key={key} value={key}>
                {config.label}
              </Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* 任务列表 */}
      <Card>
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个任务`,
            onChange: (page, pageSize) => setQuery({ ...query, page, pageSize }),
          }}
          locale={{
            emptyText: <Empty description="暂无导出任务" />,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建导出 Modal */}
      <Modal
        title={
          <Space>
            <ExportOutlined /> 创建导出任务
          </Space>
        }
        open={createModalVisible}
        onOk={handleCreateExport}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okText="创建"
        cancelText="取消"
      >
        <Alert
          message="提示"
          description="导出任务将在后台处理，完成后可在列表中下载文件。文件将保留 7 天。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={form} layout="vertical">
          <Form.Item
            name="dataType"
            label="数据类型"
            rules={[{ required: true, message: '请选择数据类型' }]}
          >
            <Select placeholder="选择要导出的数据类型" size="large">
              {Object.entries(dataTypeConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Space>
                    <span style={{ color: config.color }}>{config.icon}</span>
                    <div>
                      <div>{config.label}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {config.description}
                      </Text>
                    </div>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="format"
            label="导出格式"
            rules={[{ required: true, message: '请选择导出格式' }]}
          >
            <Select placeholder="选择文件格式" size="large">
              {Object.entries(formatConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Space>
                    <span style={{ color: config.color }}>{config.icon}</span>
                    <span>{config.label}</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="dateRange" label="日期范围（可选）">
            <RangePicker
              style={{ width: '100%' }}
              size="large"
              format="YYYY-MM-DD"
              placeholder={['开始日期', '结束日期']}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExportCenter;
