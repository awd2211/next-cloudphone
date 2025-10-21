import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Modal, Descriptions, Divider, message } from 'antd';
import { DownloadOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import request from '../../utils/request';

interface Invoice {
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

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 'inv-001',
      invoiceNo: 'INV-202510-001',
      billingPeriod: '2025年10月',
      amount: 6542.30,
      status: 'unpaid',
      issueDate: '2025-10-20',
      dueDate: '2025-10-30',
      items: [
        { description: '设备租赁费用', quantity: 15, unitPrice: 180.00, amount: 2700.00 },
        { description: 'CPU 使用费', quantity: 320, unitPrice: 4.50, amount: 1440.00 },
        { description: '内存使用费', quantity: 512, unitPrice: 2.80, amount: 1433.60 },
        { description: '存储费用', quantity: 100, unitPrice: 9.687, amount: 968.70 },
      ],
    },
    {
      id: 'inv-002',
      invoiceNo: 'INV-202509-001',
      billingPeriod: '2025年9月',
      amount: 7128.50,
      status: 'paid',
      issueDate: '2025-09-20',
      dueDate: '2025-09-30',
      paidDate: '2025-09-25',
      items: [
        { description: '设备租赁费用', quantity: 18, unitPrice: 180.00, amount: 3240.00 },
        { description: 'CPU 使用费', quantity: 350, unitPrice: 4.50, amount: 1575.00 },
        { description: '内存使用费', quantity: 600, unitPrice: 2.80, amount: 1680.00 },
        { description: '存储费用', quantity: 65, unitPrice: 9.746, amount: 633.50 },
      ],
    },
    {
      id: 'inv-003',
      invoiceNo: 'INV-202508-001',
      billingPeriod: '2025年8月',
      amount: 5896.20,
      status: 'paid',
      issueDate: '2025-08-20',
      dueDate: '2025-08-30',
      paidDate: '2025-08-22',
      items: [
        { description: '设备租赁费用', quantity: 12, unitPrice: 180.00, amount: 2160.00 },
        { description: 'CPU 使用费', quantity: 280, unitPrice: 4.50, amount: 1260.00 },
        { description: '内存使用费', quantity: 450, unitPrice: 2.80, amount: 1260.00 },
        { description: '存储费用', quantity: 120, unitPrice: 9.302, amount: 1216.20 },
      ],
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const getStatusTag = (status: Invoice['status']) => {
    const statusConfig = {
      paid: { color: 'success', text: '已支付' },
      unpaid: { color: 'warning', text: '未支付' },
      overdue: { color: 'error', text: '已逾期' },
    };
    const config = statusConfig[status];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const handleViewDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailModalVisible(true);
  };

  const handleDownload = async (invoice: Invoice) => {
    try {
      // 调用后端 API 下载发票 PDF
      const response = await request.get(`/invoices/${invoice.id}/download`, {
        responseType: 'blob', // 关键：告诉 axios 响应类型是 blob
      });

      // 创建 Blob 对象
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // 创建下载链接
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoice.invoiceNo}.pdf`);
      document.body.appendChild(link);
      link.click();

      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('发票下载成功');
    } catch (error) {
      message.error('发票下载失败');
      console.error('Failed to download invoice:', error);
    }
  };

  const columns: ColumnsType<Invoice> = [
    {
      title: '账单编号',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      width: 150,
    },
    {
      title: '账单周期',
      dataIndex: 'billingPeriod',
      key: 'billingPeriod',
      width: 120,
    },
    {
      title: '账单金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amount: number) => (
        <span style={{ fontWeight: 600 }}>¥{amount.toFixed(2)}</span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: '开票日期',
      dataIndex: 'issueDate',
      key: 'issueDate',
      width: 120,
    },
    {
      title: '到期日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
    },
    {
      title: '支付日期',
      dataIndex: 'paidDate',
      key: 'paidDate',
      width: 120,
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
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
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
  ];

  const itemColumns: ColumnsType<InvoiceItem> = [
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
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    {
      title: '小计',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amount: number) => (
        <span style={{ fontWeight: 600 }}>¥{amount.toFixed(2)}</span>
      ),
    },
  ];

  return (
    <>
      <Card
        title="账单管理"
        extra={
          <Button type="primary" icon={<FileTextOutlined />}>
            申请发票
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={invoices}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条账单`,
          }}
        />
      </Card>

      <Modal
        title="账单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => selectedInvoice && handleDownload(selectedInvoice)}
          >
            下载账单
          </Button>,
        ]}
      >
        {selectedInvoice && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="账单编号">
                {selectedInvoice.invoiceNo}
              </Descriptions.Item>
              <Descriptions.Item label="账单周期">
                {selectedInvoice.billingPeriod}
              </Descriptions.Item>
              <Descriptions.Item label="开票日期">
                {selectedInvoice.issueDate}
              </Descriptions.Item>
              <Descriptions.Item label="到期日期">
                {selectedInvoice.dueDate}
              </Descriptions.Item>
              <Descriptions.Item label="支付日期">
                {selectedInvoice.paidDate || '未支付'}
              </Descriptions.Item>
              <Descriptions.Item label="账单状态">
                {getStatusTag(selectedInvoice.status)}
              </Descriptions.Item>
              <Descriptions.Item label="账单金额" span={2}>
                <span style={{ fontSize: 18, fontWeight: 600, color: '#ff4d4f' }}>
                  ¥{selectedInvoice.amount.toFixed(2)}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Divider>账单明细</Divider>

            <Table
              columns={itemColumns}
              dataSource={selectedInvoice.items}
              rowKey="description"
              pagination={false}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <strong>合计</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <strong style={{ fontSize: 16 }}>
                        ¥{selectedInvoice.amount.toFixed(2)}
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </>
        )}
      </Modal>
    </>
  );
};

export default InvoiceList;
