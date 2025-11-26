import React from 'react';
import { Modal, Button, Descriptions, Divider, Table } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { Invoice, invoiceItemColumns, getStatusTag } from './InvoiceTableColumns';
import { SEMANTIC } from '@/theme';

interface InvoiceDetailModalProps {
  visible: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onDownload: (invoice: Invoice) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = React.memo(
  ({ visible, invoice, onClose, onDownload }) => {
    if (!invoice) return null;

    return (
      <Modal
        title="账单详情"
        open={visible}
        onCancel={onClose}
        width={800}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => onDownload(invoice)}
          >
            下载账单
          </Button>,
        ]}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="账单编号">{invoice.invoiceNo}</Descriptions.Item>
          <Descriptions.Item label="账单周期">
            {invoice.billingPeriod}
          </Descriptions.Item>
          <Descriptions.Item label="开票日期">{invoice.issueDate}</Descriptions.Item>
          <Descriptions.Item label="到期日期">{invoice.dueDate}</Descriptions.Item>
          <Descriptions.Item label="支付日期">
            {invoice.paidDate || '未支付'}
          </Descriptions.Item>
          <Descriptions.Item label="账单状态">
            {getStatusTag(invoice.status)}
          </Descriptions.Item>
          <Descriptions.Item label="账单金额" span={2}>
            <span style={{ fontSize: 18, fontWeight: 600, color: SEMANTIC.error.main }}>
              ¥{invoice.amount.toFixed(2)}
            </span>
          </Descriptions.Item>
        </Descriptions>

        <Divider>账单明细</Divider>

        <Table
          columns={invoiceItemColumns}
          dataSource={invoice.items}
          rowKey="description"
          pagination={false}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <strong>合计</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong style={{ fontSize: 16 }}>¥{invoice.amount.toFixed(2)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Modal>
    );
  }
);

InvoiceDetailModal.displayName = 'InvoiceDetailModal';
