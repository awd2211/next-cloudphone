import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  message,
  Descriptions,
  Badge,
  Result,
  Spin,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  LockOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks';
import dayjs from 'dayjs';
import {
  getPendingRefunds,
  approveRefund,
  rejectRefund,
  type PaymentDetail,
} from '@/services/payment-admin';

const RefundManagement: React.FC = () => {
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

  if (!hasPermission('payment:refund:view')) {
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

  return <RefundManagementContent />;
};

const RefundManagementContent: React.FC = () => {
  const { hasPermission } = usePermission();
  const [loading, setLoading] = useState(false);
  const [refunds, setRefunds] = useState<PaymentDetail[]>([]);
  const [selectedRefund, setSelectedRefund] = useState<PaymentDetail | null>(null);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();

  // 加载待审核退款列表
  const loadRefunds = async () => {
    setLoading(true);
    try {
      const res = await getPendingRefunds();
      setRefunds(res.data);
    } catch (error) {
      message.error('加载退款列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefunds();
  }, []);

  // 批准退款
  const handleApprove = async (values: { adminNote?: string }) => {
    if (!selectedRefund) return;
    try {
      await approveRefund(selectedRefund.id, values.adminNote);
      message.success('退款已批准');
      setApproveModalVisible(false);
      approveForm.resetFields();
      loadRefunds();
    } catch (error) {
      message.error('批准退款失败');
    }
  };

  // 拒绝退款
  const handleReject = async (values: { reason: string; adminNote?: string }) => {
    if (!selectedRefund) return;
    try {
      await rejectRefund(selectedRefund.id, values.reason, values.adminNote);
      message.success('退款已拒绝');
      setRejectModalVisible(false);
      rejectForm.resetFields();
      loadRefunds();
    } catch (error) {
      message.error('拒绝退款失败');
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

  const columns: ColumnsType<PaymentDetail> = [
    {
      title: '支付单号',
      dataIndex: 'paymentNo',
      key: 'paymentNo',
      width: 180,
      fixed: 'left',
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
      width: 120,
      ellipsis: true,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
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
      render: (method: string) => getMethodTag(method),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '支付时间',
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: (date: string) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedRefund(record);
              setDetailModalVisible(true);
            }}
          >
            详情
          </Button>
          {hasPermission('payment:refund:approve') && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setSelectedRefund(record);
                setApproveModalVisible(true);
              }}
            >
              批准
            </Button>
          )}
          {hasPermission('payment:refund:reject') && (
            <Button
              type="link"
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => {
                setSelectedRefund(record);
                setRejectModalVisible(true);
              }}
            >
              拒绝
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
              <h2 style={{ margin: 0 }}>退款管理</h2>
              <p style={{ margin: '8px 0 0', color: '#666' }}>
                <Badge
                  count={refunds.length}
                  style={{ backgroundColor: '#faad14' }}
                />
                <span style={{ marginLeft: 8 }}>待审核的退款申请</span>
              </p>
            </div>
            <Button icon={<ReloadOutlined />} onClick={loadRefunds}>
              刷新
            </Button>
          </Space>
        </Card>

        {/* 退款列表 */}
        <Card>
          <Table
            columns={columns}
            dataSource={refunds}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 1600 }}
            locale={{ emptyText: '暂无待审核的退款申请' }}
          />
        </Card>
      </Space>

      {/* 退款详情对话框 */}
      <Modal
        title="退款详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedRefund && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="支付单号" span={2}>
              {selectedRefund.paymentNo}
            </Descriptions.Item>
            <Descriptions.Item label="订单号" span={2}>
              {selectedRefund.order?.orderNo || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="用户ID">
              {selectedRefund.userId}
            </Descriptions.Item>
            <Descriptions.Item label="交易号">
              {selectedRefund.transactionId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="支付金额">
              {selectedRefund.currency === 'CNY' ? '¥' : selectedRefund.currency === 'USD' ? '$' : selectedRefund.currency}
              {selectedRefund.amount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="支付方式">
              {getMethodTag(selectedRefund.method)}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {getStatusTag(selectedRefund.status)}
            </Descriptions.Item>
            <Descriptions.Item label="客户ID">
              {selectedRefund.customerId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="支付时间" span={2}>
              {selectedRefund.paidAt
                ? dayjs(selectedRefund.paidAt).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {dayjs(selectedRefund.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间" span={2}>
              {dayjs(selectedRefund.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {selectedRefund.metadata && (
              <Descriptions.Item label="元数据" span={2}>
                <pre style={{ margin: 0, fontSize: '12px' }}>
                  {JSON.stringify(selectedRefund.metadata, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 批准退款对话框 */}
      <Modal
        title="批准退款"
        open={approveModalVisible}
        onCancel={() => {
          setApproveModalVisible(false);
          approveForm.resetFields();
        }}
        onOk={() => approveForm.submit()}
      >
        <Form form={approveForm} onFinish={handleApprove} layout="vertical">
          <Form.Item label="支付单号">
            <Input value={selectedRefund?.paymentNo} disabled />
          </Form.Item>

          <Form.Item label="退款金额">
            <Input
              value={
                selectedRefund
                  ? `${selectedRefund.currency === 'CNY' ? '¥' : selectedRefund.currency === 'USD' ? '$' : selectedRefund.currency}${selectedRefund.amount.toFixed(2)}`
                  : ''
              }
              disabled
            />
          </Form.Item>

          <Form.Item label="管理员备注" name="adminNote">
            <Input.TextArea
              rows={3}
              placeholder="可选的管理员备注（批准原因、处理说明等）"
            />
          </Form.Item>

          <div style={{ color: '#999', fontSize: '12px' }}>
            ⚠️ 批准后将立即向支付平台发起退款请求，请确认无误后操作。
          </div>
        </Form>
      </Modal>

      {/* 拒绝退款对话框 */}
      <Modal
        title="拒绝退款"
        open={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false);
          rejectForm.resetFields();
        }}
        onOk={() => rejectForm.submit()}
      >
        <Form form={rejectForm} onFinish={handleReject} layout="vertical">
          <Form.Item label="支付单号">
            <Input value={selectedRefund?.paymentNo} disabled />
          </Form.Item>

          <Form.Item label="退款金额">
            <Input
              value={
                selectedRefund
                  ? `${selectedRefund.currency === 'CNY' ? '¥' : selectedRefund.currency === 'USD' ? '$' : selectedRefund.currency}${selectedRefund.amount.toFixed(2)}`
                  : ''
              }
              disabled
            />
          </Form.Item>

          <Form.Item
            label="拒绝原因"
            name="reason"
            rules={[{ required: true, message: '请输入拒绝原因' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入拒绝退款的原因（将通知用户）"
            />
          </Form.Item>

          <Form.Item label="管理员备注" name="adminNote">
            <Input.TextArea
              rows={2}
              placeholder="可选的管理员内部备注"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RefundManagement;
