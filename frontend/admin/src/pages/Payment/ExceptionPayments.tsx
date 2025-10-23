import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  message,
  Modal,
  Descriptions,
  Alert,
  Badge,
  Result,
  Spin,
  Tooltip,
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  WarningOutlined,
  SyncOutlined,
  LockOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks';
import dayjs from 'dayjs';
import {
  getExceptionPayments,
  syncPaymentStatus,
  type PaymentDetail,
} from '@/services/payment-admin';

const ExceptionPayments: React.FC = () => {
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

  if (!hasPermission('payment:exception:view')) {
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

  return <ExceptionPaymentsContent />;
};

const ExceptionPaymentsContent: React.FC = () => {
  const { hasPermission } = usePermission();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // 加载异常支付记录
  const loadExceptionPayments = async () => {
    setLoading(true);
    try {
      const res = await getExceptionPayments(page, pageSize);
      setPayments(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (error) {
      message.error('加载异常支付记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExceptionPayments();
  }, [page, pageSize]);

  // 同步支付状态
  const handleSyncStatus = async (paymentId: string) => {
    setSyncingId(paymentId);
    try {
      await syncPaymentStatus(paymentId);
      message.success('同步成功');
      loadExceptionPayments();
    } catch (error) {
      message.error('同步失败');
    } finally {
      setSyncingId(null);
    }
  };

  // 获取支付方式显示
  const getMethodTag = (method: string) => {
    const methodMap: Record<string, { color: string; text: string }> = {
      wechat: { color: 'green', text: '微信支付' },
      alipay: { color: 'blue', text: '支付宝' },
      balance: { color: 'orange', text: '余额支付' },
      stripe: { color: 'purple', text: 'Stripe' },
      paypal: { color: 'blue', text: 'PayPal' },
      paddle: { color: 'cyan', text: 'Paddle' },
    };
    const config = methodMap[method] || { color: 'default', text: method };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取状态显示
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '待支付' },
      processing: { color: 'orange', text: '支付中' },
      success: { color: 'green', text: '支付成功' },
      failed: { color: 'red', text: '支付失败' },
      refunding: { color: 'orange', text: '退款中' },
      refunded: { color: 'purple', text: '已退款' },
      cancelled: { color: 'default', text: '已取消' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 判断是否为异常
  const getExceptionType = (payment: PaymentDetail): string => {
    const now = dayjs();
    const createdAt = dayjs(payment.createdAt);
    const hoursSinceCreated = now.diff(createdAt, 'hour');

    if (payment.status === 'processing' && hoursSinceCreated > 24) {
      return '长时间处理中';
    } else if (payment.status === 'pending' && hoursSinceCreated > 48) {
      return '长时间待支付';
    } else if (payment.status === 'failed') {
      return '支付失败';
    } else if (payment.status === 'refunding' && hoursSinceCreated > 72) {
      return '退款超时';
    }
    return '其他异常';
  };

  const columns: ColumnsType<PaymentDetail> = [
    {
      title: '支付单号',
      dataIndex: 'paymentNo',
      key: 'paymentNo',
      width: 180,
      fixed: 'left',
    },
    {
      title: '异常类型',
      key: 'exceptionType',
      width: 130,
      render: (_, record) => {
        const type = getExceptionType(record);
        const colorMap: Record<string, string> = {
          '长时间处理中': 'warning',
          '长时间待支付': 'warning',
          支付失败: 'error',
          退款超时: 'error',
          其他异常: 'default',
        };
        return (
          <Tag icon={<WarningOutlined />} color={colorMap[type] || 'default'}>
            {type}
          </Tag>
        );
      },
    },
    {
      title: '订单号',
      dataIndex: 'order',
      key: 'order',
      width: 180,
      render: (order: any) => order?.orderNo || '-',
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 100,
      ellipsis: true,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number, record) => {
        const currencySymbol =
          record.currency === 'CNY'
            ? '¥'
            : record.currency === 'USD'
            ? '$'
            : record.currency;
        return `${currencySymbol}${(amount || 0).toFixed(2)}`;
      },
    },
    {
      title: '支付方式',
      dataIndex: 'method',
      key: 'method',
      width: 120,
      render: (method: string) => getMethodTag(method),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => {
        const hoursSince = dayjs().diff(dayjs(date), 'hour');
        return (
          <Tooltip title={`${hoursSince} 小时前`}>
            {dayjs(date).format('YYYY-MM-DD HH:mm')}
          </Tooltip>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedPayment(record);
              setDetailModalVisible(true);
            }}
          >
            详情
          </Button>
          {hasPermission('payment:sync') && (
            <Button
              type="link"
              size="small"
              icon={<SyncOutlined />}
              loading={syncingId === record.id}
              onClick={() => handleSyncStatus(record.id)}
            >
              同步
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <Card>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0 }}>异常支付监控</h2>
              <p style={{ margin: '8px 0 0', color: '#666' }}>
                <Badge count={total} style={{ backgroundColor: '#faad14' }} />
                <span style={{ marginLeft: 8 }}>条异常支付记录</span>
              </p>
            </div>
            <Button icon={<ReloadOutlined />} onClick={loadExceptionPayments}>
              刷新
            </Button>
          </Space>
        </Card>

        {/* 异常说明 */}
        <Alert
          message="异常支付定义"
          description={
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>长时间处理中：支付状态为"处理中"超过 24 小时</li>
              <li>长时间待支付：支付状态为"待支付"超过 48 小时</li>
              <li>支付失败：支付状态为"失败"</li>
              <li>退款超时：退款状态为"退款中"超过 72 小时</li>
            </ul>
          }
          type="info"
          showIcon
        />

        {/* 异常支付列表 */}
        <Card>
          <Table
            columns={columns}
            dataSource={payments}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条异常记录`,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              },
            }}
            scroll={{ x: 1600 }}
            locale={{ emptyText: '暂无异常支付记录' }}
          />
        </Card>
      </Space>

      {/* 详情对话框 */}
      <Modal
        title="异常支付详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedPayment && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* 异常提示 */}
            <Alert
              message={`异常类型：${getExceptionType(selectedPayment)}`}
              type="warning"
              showIcon
              icon={<WarningOutlined />}
            />

            {/* 支付详情 */}
            <Descriptions column={2} bordered>
              <Descriptions.Item label="支付单号" span={2}>
                {selectedPayment.paymentNo}
              </Descriptions.Item>
              <Descriptions.Item label="订单号" span={2}>
                {selectedPayment.order?.orderNo || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="用户ID">
                {selectedPayment.userId}
              </Descriptions.Item>
              <Descriptions.Item label="交易号">
                {selectedPayment.transactionId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="支付金额">
                {selectedPayment.currency === 'CNY' ? '¥' : selectedPayment.currency === 'USD' ? '$' : selectedPayment.currency}
                {selectedPayment.amount.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="支付方式">
                {getMethodTag(selectedPayment.method)}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedPayment.status)}
              </Descriptions.Item>
              <Descriptions.Item label="客户ID">
                {selectedPayment.customerId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {dayjs(selectedPayment.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                <span style={{ marginLeft: 8, color: '#666' }}>
                  ({dayjs().diff(dayjs(selectedPayment.createdAt), 'hour')} 小时前)
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="更新时间" span={2}>
                {dayjs(selectedPayment.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              {selectedPayment.paidAt && (
                <Descriptions.Item label="支付时间" span={2}>
                  {dayjs(selectedPayment.paidAt).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
              {selectedPayment.paymentUrl && (
                <Descriptions.Item label="支付链接" span={2}>
                  <a href={selectedPayment.paymentUrl} target="_blank" rel="noopener noreferrer">
                    {selectedPayment.paymentUrl}
                  </a>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 元数据 */}
            {selectedPayment.metadata && (
              <Card title="元数据" size="small">
                <pre style={{ margin: 0, fontSize: '12px', maxHeight: 200, overflow: 'auto' }}>
                  {JSON.stringify(selectedPayment.metadata, null, 2)}
                </pre>
              </Card>
            )}

            {/* 操作建议 */}
            <Alert
              message="处理建议"
              description={
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>点击"同步"按钮从支付平台获取最新状态</li>
                  <li>如果长时间未更新，可能需要人工介入处理</li>
                  <li>联系支付平台技术支持进行排查</li>
                </ul>
              }
              type="info"
              showIcon
            />
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default ExceptionPayments;
