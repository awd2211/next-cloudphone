import React from 'react';
import { Button, Tag, Space, Typography } from 'antd';
import { FileTextOutlined, DownloadOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Invoice } from '@/services/billing';

const { Text } = Typography;

interface InvoiceTableActionsProps {
  onViewDetail: (invoice: Invoice) => void;
  onDownload: (id: string, invoiceNo: string) => void;
  downloading: boolean;
}

// 状态配置
const statusConfig: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
  pending: {
    color: 'processing',
    icon: <ClockCircleOutlined />,
    text: '待开具',
  },
  issued: {
    color: 'success',
    icon: <CheckCircleOutlined />,
    text: '已开具',
  },
  rejected: {
    color: 'error',
    icon: <CloseCircleOutlined />,
    text: '已拒绝',
  },
};

/**
 * 渲染发票状态
 */
const renderStatus = (status: string) => {
  const config = statusConfig[status] || statusConfig.pending || {
    color: 'default',
    icon: <ClockCircleOutlined />,
    text: status,
  };
  return (
    <Tag icon={config.icon} color={config.color}>
      {config.text}
    </Tag>
  );
};

/**
 * 创建发票表格列配置
 */
export const createInvoiceTableColumns = (
  actions: InvoiceTableActionsProps
): ColumnsType<Invoice> => [
  {
    title: '发票号',
    dataIndex: 'invoiceNo',
    key: 'invoiceNo',
    width: 180,
    render: (text: string) => (
      <Text strong style={{ fontFamily: 'monospace' }}>
        {text}
      </Text>
    ),
  },
  {
    title: '发票抬头',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 100,
    render: (type: string) => (
      <Tag color={type === 'company' ? 'blue' : 'green'}>
        {type === 'company' ? '企业' : '个人'}
      </Tag>
    ),
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 120,
    align: 'right',
    render: (amount: number) => (
      <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
        ¥{amount.toFixed(2)}
      </Text>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    align: 'center',
    render: renderStatus,
  },
  {
    title: '申请时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
    render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
  },
  {
    title: '开具时间',
    dataIndex: 'issuedAt',
    key: 'issuedAt',
    width: 180,
    render: (text?: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'),
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
    fixed: 'right',
    render: (_: any, record: Invoice) => (
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<FileTextOutlined />}
          onClick={() => actions.onViewDetail(record)}
        >
          详情
        </Button>
        {record.status === 'issued' && record.downloadUrl && (
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            loading={actions.downloading}
            onClick={() => actions.onDownload(record.id, record.invoiceNo)}
          >
            下载
          </Button>
        )}
      </Space>
    ),
  },
];
