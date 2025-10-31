import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Button,
  Space,
  message,
  Modal,
  Select,
  Divider,
  Typography,
  Steps,
} from 'antd';
import {
  LeftOutlined,
  DownloadOutlined,
  PrinterOutlined,
  FileTextOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getBillDetail,
  payBill,
  downloadBill,
  applyInvoice,
  formatAmount,
  formatBillingCycle,
  BillType,
  BillStatus,
  PaymentMethod,
  type Bill,
  type BillItem,
  type InvoiceRequest,
} from '@/services/billing';
import { triggerDownload } from '@/services/export';

const { Title, Text } = Typography;
const { Option } = Select;
const { Step } = Steps;

// 配置同 BillList
const billTypeConfig: Record<BillType, { label: string; color: string }> = {
  [BillType.SUBSCRIPTION]: { label: '订阅费', color: 'blue' },
  [BillType.USAGE]: { label: '使用费', color: 'cyan' },
  [BillType.RECHARGE]: { label: '充值', color: 'green' },
  [BillType.REFUND]: { label: '退款', color: 'orange' },
  [BillType.PENALTY]: { label: '违约金', color: 'red' },
  [BillType.DISCOUNT]: { label: '折扣', color: 'purple' },
  [BillType.COUPON]: { label: '优惠券', color: 'magenta' },
  [BillType.COMMISSION]: { label: '佣金', color: 'gold' },
};

const statusConfig: Record<BillStatus, { label: string; color: string }> = {
  [BillStatus.PENDING]: { label: '待支付', color: 'warning' },
  [BillStatus.PAID]: { label: '已支付', color: 'success' },
  [BillStatus.CANCELLED]: { label: '已取消', color: 'default' },
  [BillStatus.REFUNDED]: { label: '已退款', color: 'processing' },
  [BillStatus.OVERDUE]: { label: '已逾期', color: 'error' },
  [BillStatus.PARTIAL]: { label: '部分支付', color: 'warning' },
};

const paymentMethodConfig: Record<PaymentMethod, { label: string; color: string }> = {
  [PaymentMethod.BALANCE]: { label: '余额支付', color: 'blue' },
  [PaymentMethod.ALIPAY]: { label: '支付宝', color: 'cyan' },
  [PaymentMethod.WECHAT]: { label: '微信支付', color: 'green' },
  [PaymentMethod.CREDIT_CARD]: { label: '信用卡', color: 'gold' },
  [PaymentMethod.PAYPAL]: { label: 'PayPal', color: 'geekblue' },
};

const BillDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [bill, setBill] = useState<Bill | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BALANCE);
  const [invoiceType, setInvoiceType] = useState<'personal' | 'company'>('personal');
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [taxId, setTaxId] = useState('');

  // 加载账单详情
  const loadBillDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getBillDetail(id);
      setBill(data);
    } catch (error) {
      message.error('加载账单详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillDetail();
  }, [id]);

  // 支付
  const handlePay = async () => {
    if (!bill) return;
    try {
      const result = await payBill({ billId: bill.id, paymentMethod });
      if (result.success) {
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else {
          message.success('支付成功！');
          setPaymentModalVisible(false);
          loadBillDetail();
        }
      } else {
        message.error(result.message || '支付失败');
      }
    } catch (error) {
      message.error('支付失败');
    }
  };

  // 下载账单
  const handleDownload = async () => {
    if (!bill) return;
    try {
      message.loading({ content: '正在下载...', key: 'download' });
      const blob = await downloadBill(bill.id);
      triggerDownload(blob, `账单-${bill.billNo}.pdf`);
      message.success({ content: '下载成功！', key: 'download' });
    } catch (error) {
      message.error({ content: '下载失败', key: 'download' });
    }
  };

  // 申请发票
  const handleApplyInvoice = async () => {
    if (!bill) return;
    try {
      const invoiceData: InvoiceRequest = {
        billId: bill.id,
        type: invoiceType,
        title: invoiceTitle,
        taxId: invoiceType === 'company' ? taxId : undefined,
        email: '', // 从用户信息获取
      };
      await applyInvoice(invoiceData);
      message.success('发票申请已提交');
      setInvoiceModalVisible(false);
    } catch (error) {
      message.error('申请发票失败');
    }
  };

  if (loading || !bill) {
    return <Card loading={loading} />;
  }

  // 账单项表格列
  const itemColumns: ColumnsType<BillItem> = [
    { title: '项目名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', render: (text) => text || '-' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 100 },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      render: (price) => formatAmount(price),
    },
    {
      title: '折扣',
      dataIndex: 'discount',
      key: 'discount',
      width: 100,
      render: (discount) => (discount ? formatAmount(discount) : '-'),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => formatAmount(amount),
    },
  ];

  // 状态步骤
  const getStatusStep = () => {
    const statusMap: Record<BillStatus, number> = {
      [BillStatus.PENDING]: 0,
      [BillStatus.OVERDUE]: 0,
      [BillStatus.PAID]: 1,
      [BillStatus.CANCELLED]: -1,
      [BillStatus.REFUNDED]: 2,
      [BillStatus.PARTIAL]: 0,
    };
    return statusMap[bill.status] >= 0 ? statusMap[bill.status] : 0;
  };

  return (
    <div>
      {/* 页头 */}
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button icon={<LeftOutlined />} onClick={() => navigate('/billing')}>
              返回
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              <FileTextOutlined /> 账单详情
            </Title>
          </Space>
          <Space>
            {bill.status === BillStatus.PENDING && (
              <Button
                type="primary"
                icon={<WalletOutlined />}
                onClick={() => setPaymentModalVisible(true)}
              >
                立即支付
              </Button>
            )}
            {bill.status === BillStatus.PAID && (
              <>
                <Button icon={<FileTextOutlined />} onClick={() => setInvoiceModalVisible(true)}>
                  申请发票
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                  下载账单
                </Button>
                <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                  打印
                </Button>
              </>
            )}
          </Space>
        </Space>
      </Card>

      {/* 状态步骤 */}
      <Card style={{ marginBottom: 16 }}>
        <Steps current={getStatusStep()}>
          <Step title="待支付" description={dayjs(bill.createdAt).format('YYYY-MM-DD HH:mm')} />
          <Step
            title="已支付"
            description={bill.paidAt ? dayjs(bill.paidAt).format('YYYY-MM-DD HH:mm') : undefined}
          />
          {bill.status === BillStatus.REFUNDED && <Step title="已退款" description="退款完成" />}
        </Steps>
      </Card>

      {/* 账单信息 */}
      <Card title="账单信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="账单号">{bill.billNo}</Descriptions.Item>
          <Descriptions.Item label="账单类型">
            <Tag color={billTypeConfig[bill.type].color}>{billTypeConfig[bill.type].label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="账单状态">
            <Tag color={statusConfig[bill.status].color}>{statusConfig[bill.status].label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="计费周期">{formatBillingCycle(bill.cycle)}</Descriptions.Item>
          {bill.periodStart && bill.periodEnd && (
            <Descriptions.Item label="账期范围" span={2}>
              {dayjs(bill.periodStart).format('YYYY-MM-DD')} ~{' '}
              {dayjs(bill.periodEnd).format('YYYY-MM-DD')}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="创建时间">
            {dayjs(bill.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          {bill.paidAt && (
            <Descriptions.Item label="支付时间">
              {dayjs(bill.paidAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          )}
          {bill.paymentMethod && (
            <Descriptions.Item label="支付方式">
              <Tag color={paymentMethodConfig[bill.paymentMethod].color}>
                {paymentMethodConfig[bill.paymentMethod].label}
              </Tag>
            </Descriptions.Item>
          )}
          {bill.description && (
            <Descriptions.Item label="说明" span={2}>
              {bill.description}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* 账单明细 */}
      <Card title="账单明细" style={{ marginBottom: 16 }}>
        <Table
          columns={itemColumns}
          dataSource={bill.items}
          rowKey="id"
          pagination={false}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5} align="right">
                  <Text strong>小计：</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong>{formatAmount(bill.amount)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
              {bill.discountAmount && bill.discountAmount > 0 && (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5} align="right">
                    <Text type="success">折扣：</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Text type="success">-{formatAmount(bill.discountAmount)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
              {bill.taxAmount && bill.taxAmount > 0 && (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5} align="right">
                    <Text>税额：</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Text>{formatAmount(bill.taxAmount)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5} align="right">
                  <Text strong style={{ fontSize: 16 }}>
                    实付金额：
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                    {formatAmount(bill.finalAmount)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      {/* 支付 Modal */}
      <Modal
        title="支付账单"
        open={paymentModalVisible}
        onOk={handlePay}
        onCancel={() => setPaymentModalVisible(false)}
        okText="确认支付"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text>应付金额：</Text>
            <Text strong style={{ fontSize: 24, color: '#1890ff' }}>
              {formatAmount(bill.finalAmount)}
            </Text>
          </div>
          <div>
            <Text>选择支付方式：</Text>
            <Select
              value={paymentMethod}
              onChange={setPaymentMethod}
              style={{ width: '100%', marginTop: 8 }}
              size="large"
            >
              {Object.entries(paymentMethodConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.label}
                </Option>
              ))}
            </Select>
          </div>
        </Space>
      </Modal>

      {/* 发票 Modal */}
      <Modal
        title="申请发票"
        open={invoiceModalVisible}
        onOk={handleApplyInvoice}
        onCancel={() => setInvoiceModalVisible(false)}
        okText="提交申请"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>发票类型：</Text>
            <Select
              value={invoiceType}
              onChange={setInvoiceType}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Option value="personal">个人</Option>
              <Option value="company">企业</Option>
            </Select>
          </div>
          <div>
            <Text>发票抬头：</Text>
            <Input
              value={invoiceTitle}
              onChange={(e) => setInvoiceTitle(e.target.value)}
              style={{ marginTop: 8 }}
              placeholder="请输入发票抬头"
            />
          </div>
          {invoiceType === 'company' && (
            <div>
              <Text>税号：</Text>
              <Input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                style={{ marginTop: 8 }}
                placeholder="请输入企业税号"
              />
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default BillDetail;
