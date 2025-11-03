import { Button, Tag, Space, Popconfirm, Tooltip } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  formatAmount,
  formatBillingCycle,
  BillType,
  BillStatus,
  PaymentMethod,
  type Bill,
} from '@/services/billing';

// 账单类型配置
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

// 状态配置
const statusConfig: Record<BillStatus, { label: string; color: string }> = {
  [BillStatus.PENDING]: { label: '待支付', color: 'warning' },
  [BillStatus.PAID]: { label: '已支付', color: 'success' },
  [BillStatus.CANCELLED]: { label: '已取消', color: 'default' },
  [BillStatus.REFUNDED]: { label: '已退款', color: 'processing' },
  [BillStatus.OVERDUE]: { label: '已逾期', color: 'error' },
  [BillStatus.PARTIAL]: { label: '部分支付', color: 'warning' },
};

// 支付方式配置
const paymentMethodConfig: Record<PaymentMethod, { label: string; color: string }> = {
  [PaymentMethod.BALANCE]: { label: '余额支付', color: 'blue' },
  [PaymentMethod.ALIPAY]: { label: '支付宝', color: 'cyan' },
  [PaymentMethod.WECHAT]: { label: '微信支付', color: 'green' },
  [PaymentMethod.CREDIT_CARD]: { label: '信用卡', color: 'gold' },
  [PaymentMethod.PAYPAL]: { label: 'PayPal', color: 'geekblue' },
};

interface BillTableActionsProps {
  onViewDetail: (id: string) => void;
  onPay: (bill: Bill) => void;
  onCancel: (id: string) => void;
  onDownload: (bill: Bill) => void;
}

/**
 * 创建账单表格列配置
 */
export const createBillTableColumns = (
  actions: BillTableActionsProps
): ColumnsType<Bill> => [
  {
    title: '账单号',
    dataIndex: 'billNo',
    key: 'billNo',
    width: 180,
    render: (billNo: string, record: Bill) => (
      <Button type="link" onClick={() => actions.onViewDetail(record.id)}>
        {billNo}
      </Button>
    ),
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 100,
    render: (type: BillType) => {
      const config = billTypeConfig[type];
      return <Tag color={config.color}>{config.label}</Tag>;
    },
  },
  {
    title: '账期',
    dataIndex: 'cycle',
    key: 'cycle',
    width: 100,
    render: (cycle) => formatBillingCycle(cycle),
  },
  {
    title: '金额',
    dataIndex: 'finalAmount',
    key: 'finalAmount',
    width: 120,
    render: (amount: number) => (
      <span style={{ fontWeight: 500, color: '#1890ff' }}>
        {formatAmount(amount)}
      </span>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (status: BillStatus) => {
      const config = statusConfig[status];
      return <Tag color={config.color}>{config.label}</Tag>;
    },
  },
  {
    title: '支付方式',
    dataIndex: 'paymentMethod',
    key: 'paymentMethod',
    width: 120,
    render: (method?: PaymentMethod) => {
      if (!method) return '-';
      const config = paymentMethodConfig[method];
      return <Tag color={config.color}>{config.label}</Tag>;
    },
  },
  {
    title: '账期范围',
    key: 'period',
    width: 200,
    render: (_: any, record: Bill) => {
      if (!record.periodStart || !record.periodEnd) return '-';
      return (
        <span style={{ fontSize: 12 }}>
          {dayjs(record.periodStart).format('YYYY-MM-DD')} ~{' '}
          {dayjs(record.periodEnd).format('YYYY-MM-DD')}
        </span>
      );
    },
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
    width: 180,
    fixed: 'right',
    render: (_: any, record: Bill) => (
      <Space size="small">
        {record.status === BillStatus.PENDING && (
          <Button
            type="primary"
            size="small"
            onClick={() => actions.onPay(record)}
          >
            支付
          </Button>
        )}
        {(record.status === BillStatus.PENDING ||
          record.status === BillStatus.OVERDUE) && (
          <Popconfirm
            title="确认取消此账单？"
            onConfirm={() => actions.onCancel(record.id)}
          >
            <Button size="small" danger>
              取消
            </Button>
          </Popconfirm>
        )}
        {record.status === BillStatus.PAID && (
          <Tooltip title="下载账单">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => actions.onDownload(record)}
            />
          </Tooltip>
        )}
        <Button size="small" onClick={() => actions.onViewDetail(record.id)}>
          详情
        </Button>
      </Space>
    ),
  },
];
