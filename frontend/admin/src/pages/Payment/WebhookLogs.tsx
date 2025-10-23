import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Select,
  message,
  Modal,
  Descriptions,
  Typography,
  Result,
  Spin,
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  LockOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks';
import dayjs from 'dayjs';
import { getWebhookLogs } from '@/services/payment-admin';

const { Option } = Select;
const { Paragraph } = Typography;

interface WebhookLog {
  id: string;
  provider: string;
  event: string;
  status: 'success' | 'failed' | 'pending';
  requestBody: any;
  responseBody?: any;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  processedAt?: string;
}

const WebhookLogs: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, loading: permissionLoading } = usePermission();

  // 权限检查
  if (permissionLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" tip="正在加载权限..." />
      </div>
    );
  }

  if (!hasPermission('payment:webhook:view')) {
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status="403"
          title="403"
          subTitle="抱歉，您没有权限访问此页面。"
          icon={<LockOutlined />}
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </div>
    );
  }

  return <WebhookLogsContent />;
};

const WebhookLogsContent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // 加载日志
  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await getWebhookLogs({
        page,
        limit: pageSize,
        provider,
      });
      setLogs(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (error) {
      message.error('加载 Webhook 日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, pageSize, provider]);

  // 获取提供商显示
  const getProviderTag = (provider: string) => {
    const providerMap: Record<string, { color: string; text: string }> = {
      stripe: { color: 'purple', text: 'Stripe' },
      paypal: { color: 'blue', text: 'PayPal' },
      paddle: { color: 'cyan', text: 'Paddle' },
      wechat: { color: 'green', text: '微信支付' },
      alipay: { color: 'blue', text: '支付宝' },
    };
    const config = providerMap[provider] || { color: 'default', text: provider };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取状态显示
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { icon: React.ReactNode; color: string; text: string }> = {
      success: { icon: <CheckCircleOutlined />, color: 'success', text: '成功' },
      failed: { icon: <CloseCircleOutlined />, color: 'error', text: '失败' },
      pending: { icon: <SyncOutlined spin />, color: 'processing', text: '处理中' },
    };
    const config = statusMap[status] || { icon: null, color: 'default', text: status };
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  const columns: ColumnsType<WebhookLog> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      ellipsis: true,
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      render: (provider: string) => getProviderTag(provider),
    },
    {
      title: '事件类型',
      dataIndex: 'event',
      key: 'event',
      width: 200,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '重试次数',
      dataIndex: 'retryCount',
      key: 'retryCount',
      width: 100,
      render: (count: number) => (
        <Tag color={count > 0 ? 'orange' : 'default'}>{count}</Tag>
      ),
    },
    {
      title: '接收时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '处理时间',
      dataIndex: 'processedAt',
      key: 'processedAt',
      width: 180,
      render: (date: string) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedLog(record);
            setDetailModalVisible(true);
          }}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题和筛选 */}
        <Card>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0 }}>Webhook 日志</h2>
              <p style={{ margin: '8px 0 0', color: '#666' }}>
                查看和监控支付平台的 Webhook 事件
              </p>
            </div>
            <Space>
              <Select
                style={{ width: 150 }}
                placeholder="全部提供商"
                allowClear
                value={provider}
                onChange={(value) => {
                  setProvider(value);
                  setPage(1);
                }}
              >
                <Option value="stripe">Stripe</Option>
                <Option value="paypal">PayPal</Option>
                <Option value="paddle">Paddle</Option>
                <Option value="wechat">微信支付</Option>
                <Option value="alipay">支付宝</Option>
              </Select>
              <Button icon={<ReloadOutlined />} onClick={loadLogs}>
                刷新
              </Button>
            </Space>
          </Space>
        </Card>

        {/* 日志表格 */}
        <Card>
          <Table
            columns={columns}
            dataSource={logs}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              },
            }}
            scroll={{ x: 1200 }}
          />
        </Card>
      </Space>

      {/* 详情对话框 */}
      <Modal
        title="Webhook 日志详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedLog && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="日志ID" span={2}>
                {selectedLog.id}
              </Descriptions.Item>
              <Descriptions.Item label="提供商">
                {getProviderTag(selectedLog.provider)}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedLog.status)}
              </Descriptions.Item>
              <Descriptions.Item label="事件类型" span={2}>
                {selectedLog.event}
              </Descriptions.Item>
              <Descriptions.Item label="重试次数">
                {selectedLog.retryCount}
              </Descriptions.Item>
              <Descriptions.Item label="接收时间">
                {dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="处理时间" span={2}>
                {selectedLog.processedAt
                  ? dayjs(selectedLog.processedAt).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
            </Descriptions>

            {selectedLog.errorMessage && (
              <Card title="错误信息" size="small">
                <Paragraph
                  copyable
                  style={{ margin: 0, color: '#ff4d4f', whiteSpace: 'pre-wrap' }}
                >
                  {selectedLog.errorMessage}
                </Paragraph>
              </Card>
            )}

            <Card title="请求体 (Request Body)" size="small">
              <Paragraph
                copyable
                style={{
                  margin: 0,
                  background: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  maxHeight: '300px',
                  overflow: 'auto',
                }}
              >
                <pre style={{ margin: 0, fontSize: '12px' }}>
                  {JSON.stringify(selectedLog.requestBody, null, 2)}
                </pre>
              </Paragraph>
            </Card>

            {selectedLog.responseBody && (
              <Card title="响应体 (Response Body)" size="small">
                <Paragraph
                  copyable
                  style={{
                    margin: 0,
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflow: 'auto',
                  }}
                >
                  <pre style={{ margin: 0, fontSize: '12px' }}>
                    {JSON.stringify(selectedLog.responseBody, null, 2)}
                  </pre>
                </Paragraph>
              </Card>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default WebhookLogs;
