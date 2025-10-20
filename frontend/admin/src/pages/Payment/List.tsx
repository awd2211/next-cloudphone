import { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Modal, Form, Input, InputNumber, message, Image } from 'antd';
import { ReloadOutlined, DollarOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getPayments, queryPaymentStatus, refundPayment } from '@/services/billing';
import type { Payment } from '@/types';
import dayjs from 'dayjs';

const PaymentList = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [form] = Form.useForm();

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await getPayments({ page, pageSize });
      setPayments(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载支付列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [page, pageSize]);

  const handleQueryStatus = async (paymentNo: string) => {
    try {
      await queryPaymentStatus(paymentNo);
      message.success('查询支付状态成功');
      loadPayments();
    } catch (error) {
      message.error('查询支付状态失败');
    }
  };

  const handleRefund = async (values: { amount: number; reason: string }) => {
    if (!selectedPayment) return;
    try {
      await refundPayment(selectedPayment.id, values.amount, values.reason);
      message.success('退款申请成功');
      setRefundModalVisible(false);
      form.resetFields();
      loadPayments();
    } catch (error) {
      message.error('退款申请失败');
    }
  };

  const columns: ColumnsType<Payment> = [
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
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '支付方式',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => {
        const methodMap: Record<string, { color: string; text: string }> = {
          wechat: { color: 'green', text: '微信支付' },
          alipay: { color: 'blue', text: '支付宝' },
          balance: { color: 'orange', text: '余额支付' },
        };
        const config = methodMap[method] || { color: 'default', text: method };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
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
      },
    },
    {
      title: '交易号',
      dataIndex: 'transactionId',
      key: 'transactionId',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '支付时间',
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {(record.status === 'pending' || record.status === 'processing') && (
            <>
              <Button
                type="link"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => handleQueryStatus(record.paymentNo)}
              >
                查询状态
              </Button>
              {record.paymentUrl && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setSelectedPayment(record);
                    setQrCodeModalVisible(true);
                  }}
                >
                  查看二维码
                </Button>
              )}
            </>
          )}
          {record.status === 'success' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DollarOutlined />}
              onClick={() => {
                setSelectedPayment(record);
                form.setFieldsValue({ amount: record.amount });
                setRefundModalVisible(true);
              }}
            >
              退款
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>支付管理</h2>

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
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          },
        }}
        scroll={{ x: 1600 }}
      />

      {/* 退款对话框 */}
      <Modal
        title="申请退款"
        open={refundModalVisible}
        onCancel={() => {
          setRefundModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleRefund} layout="vertical">
          <Form.Item label="支付单号">
            <Input value={selectedPayment?.paymentNo} disabled />
          </Form.Item>

          <Form.Item label="支付金额">
            <Input value={`¥${selectedPayment?.amount.toFixed(2)}`} disabled />
          </Form.Item>

          <Form.Item
            label="退款金额"
            name="amount"
            rules={[
              { required: true, message: '请输入退款金额' },
              {
                validator: (_, value) => {
                  if (value && selectedPayment && value > selectedPayment.amount) {
                    return Promise.reject('退款金额不能大于支付金额');
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              min={0.01}
              max={selectedPayment?.amount}
              precision={2}
              style={{ width: '100%' }}
              prefix="¥"
            />
          </Form.Item>

          <Form.Item
            label="退款原因"
            name="reason"
            rules={[{ required: true, message: '请输入退款原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入退款原因" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 二维码对话框 */}
      <Modal
        title="支付二维码"
        open={qrCodeModalVisible}
        onCancel={() => setQrCodeModalVisible(false)}
        footer={null}
      >
        {selectedPayment?.paymentUrl && (
          <div style={{ textAlign: 'center' }}>
            <Image
              src={selectedPayment.paymentUrl}
              alt="支付二维码"
              width={300}
              height={300}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            />
            <p style={{ marginTop: 16 }}>请使用{selectedPayment.method === 'wechat' ? '微信' : '支付宝'}扫码支付</p>
            <p>金额: ¥{selectedPayment.amount.toFixed(2)}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentList;
