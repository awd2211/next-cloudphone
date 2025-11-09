import { useMemo } from 'react';
import { Button, Space, Tag } from 'antd';
import { EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

export interface Invoice {
  id: string;
  invoiceNo: string;
  billingPeriod: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'overdue';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceTableColumnsProps {
  onViewDetail: (invoice: Invoice) => void;
  onDownload: (invoice: Invoice) => void;
}

const getStatusTag = (status: Invoice['status']) => {
  const statusConfig = {
    paid: { color: 'success', text: '已支付' },
    unpaid: { color: 'warning', text: '未支付' },
    overdue: { color: 'error', text: '已逾期' },
  };
  const config = statusConfig[status];
  return <Tag color={config.color}>{config.text}</Tag>;
};

export const useInvoiceTableColumns = ({
  onViewDetail,
  onDownload,
}: InvoiceTableColumnsProps): ColumnsType<Invoice> => {
  return useMemo(
    () => [
      {
        title: '账单编号',
        dataIndex: 'invoiceNo',
        key: 'invoiceNo',
        width: 150,
        sorter: (a, b) => a.invoiceNo.localeCompare(b.invoiceNo),
      },
      {
        title: '账单周期',
        dataIndex: 'billingPeriod',
        key: 'billingPeriod',
        width: 120,
        sorter: (a, b) => a.billingPeriod.localeCompare(b.billingPeriod),
      },
      {
        title: '账单金额',
        dataIndex: 'amount',
        key: 'amount',
        width: 130,
        render: (amount: number) => (
          <span style={{ fontWeight: 600 }}>¥{(amount || 0).toFixed(2)}</span>
        ),
        sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
      },
      {
        title: '开票日期',
        dataIndex: 'issueDate',
        key: 'issueDate',
        width: 120,
        sorter: (a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime(),
      },
      {
        title: '到期日期',
        dataIndex: 'dueDate',
        key: 'dueDate',
        width: 120,
        sorter: (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      },
      {
        title: '支付日期',
        dataIndex: 'paidDate',
        key: 'paidDate',
        width: 120,
        sorter: (a, b) => {
          const timeA = a.paidDate ? new Date(a.paidDate).getTime() : 0;
          const timeB = b.paidDate ? new Date(b.paidDate).getTime() : 0;
          return timeA - timeB;
        },
        render: (paidDate?: string) => paidDate || '-',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: Invoice['status']) => getStatusTag(status),
        filters: [
          { text: '已支付', value: 'paid' },
          { text: '未支付', value: 'unpaid' },
          { text: '已逾期', value: 'overdue' },
        ],
        onFilter: (value, record) => record.status === value,
      },
      {
        title: '操作',
        key: 'actions',
        width: 180,
        render: (_, record) => (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onViewDetail(record)}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => onDownload(record)}
            >
              下载
            </Button>
            {record.status === 'unpaid' && (
              <Button type="link" size="small" danger>
                支付
              </Button>
            )}
          </Space>
        ),
      },
    ],
    [onViewDetail, onDownload]
  );
};

export const invoiceItemColumns: ColumnsType<InvoiceItem> = [
  {
    title: '项目描述',
    dataIndex: 'description',
    key: 'description',
  },
  {
    title: '数量',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 100,
  },
  {
    title: '单价',
    dataIndex: 'unitPrice',
    key: 'unitPrice',
    width: 120,
    render: (price: number) => `¥${(price || 0).toFixed(2)}`,
  },
  {
    title: '小计',
    dataIndex: 'amount',
    key: 'amount',
    width: 130,
    render: (amount: number) => (
      <span style={{ fontWeight: 600 }}>¥{(amount || 0).toFixed(2)}</span>
    ),
  },
];

export { getStatusTag };
