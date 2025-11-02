import React from 'react';
import { Card, Table, Button, Space, Typography, Empty } from 'antd';
import { FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import {
  InvoiceStatsCards,
  InvoiceApplyModal,
  InvoiceDetailModal,
} from '@/components/Invoice';
import { useInvoiceList } from '@/hooks/useInvoiceList';

const { Title } = Typography;

/**
 * 发票列表页面
 * 展示所有发票，支持申请、查看详情、下载等操作
 */
const InvoiceList: React.FC = () => {
  const {
    invoices,
    bills,
    loading,
    downloading,
    total,
    page,
    pageSize,
    columns,
    form,
    applyModalVisible,
    detailModalVisible,
    selectedInvoice,
    handleOpenApplyModal,
    handleCloseApplyModal,
    handleCloseDetailModal,
    handleApplyInvoice,
    handleDownload,
    handlePageChange,
  } = useInvoiceList();

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 标题和统计卡片 */}
      <Card
        style={{ marginBottom: '24px' }}
        title={
          <Space>
            <FileTextOutlined style={{ fontSize: '20px' }} />
            <Title level={4} style={{ margin: 0 }}>
              发票管理
            </Title>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenApplyModal}>
            申请发票
          </Button>
        }
      >
        <InvoiceStatsCards invoices={invoices} />
      </Card>

      {/* 发票列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" size="small">
                    <span style={{ color: '#999' }}>暂无发票记录</span>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={handleOpenApplyModal}
                    >
                      立即申请发票
                    </Button>
                  </Space>
                }
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
          }}
        />
      </Card>

      {/* 申请发票弹窗 */}
      <InvoiceApplyModal
        visible={applyModalVisible}
        form={form}
        bills={bills}
        onCancel={handleCloseApplyModal}
        onFinish={handleApplyInvoice}
      />

      {/* 发票详情弹窗 */}
      <InvoiceDetailModal
        visible={detailModalVisible}
        invoice={selectedInvoice}
        downloading={downloading}
        onCancel={handleCloseDetailModal}
        onDownload={handleDownload}
      />
    </div>
  );
};

export default InvoiceList;
