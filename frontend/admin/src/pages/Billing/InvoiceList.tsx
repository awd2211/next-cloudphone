import React from 'react';
import { Card, Table, Button } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { InvoiceDetailModal } from '@/components/Billing';
import { useInvoiceList } from '@/hooks/useInvoiceList';

const InvoiceList: React.FC = () => {
  const {
    invoices,
    loading,
    detailModalVisible,
    selectedInvoice,
    columns,
    handleDownload,
    handleCloseDetail,
  } = useInvoiceList();

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

      <InvoiceDetailModal
        visible={detailModalVisible}
        invoice={selectedInvoice}
        onClose={handleCloseDetail}
        onDownload={handleDownload}
      />
    </>
  );
};

export default InvoiceList;
