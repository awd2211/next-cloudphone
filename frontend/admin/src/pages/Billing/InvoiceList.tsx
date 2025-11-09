import React from 'react';
import { Card, Button } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { FileTextOutlined } from '@ant-design/icons';
import { InvoiceDetailModal, type Invoice } from '@/components/Billing';
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
        <AccessibleTable<Invoice>
          ariaLabel="账单列表"
          loadingText="正在加载账单列表"
          emptyText="暂无账单数据"
          columns={columns}
          dataSource={invoices}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
            showTotal: (total) => `共 ${total} 条账单`,
          }}
          scroll={{ y: 600 }}
          virtual
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
