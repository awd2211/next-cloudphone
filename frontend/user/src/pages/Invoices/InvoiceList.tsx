import React, { useState, useMemo, useCallback } from 'react';
import { Card, Table, Button, Space, Typography, Empty, Form } from 'antd';
import { FileTextOutlined, PlusOutlined } from '@/icons';
import {
  InvoiceStatsCards,
  InvoiceApplyModal,
  InvoiceDetailModal,
} from '@/components/Invoice';
import {
  useInvoices,
  useApplyInvoice,
  useDownloadInvoice,
  useBills,
} from '@/hooks/queries';
import { createInvoiceTableColumns } from '@/utils/invoiceTableColumns';
import type { Invoice } from '@/types';

const { Title } = Typography;

/**
 * 发票列表页面（React Query 优化版）
 * 展示所有发票，支持申请、查看详情、下载等操作
 */
const InvoiceList: React.FC = () => {
  // Form 实例
  const [form] = Form.useForm();

  // 本地状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // React Query hooks
  const { data: invoicesData, isLoading: loading } = useInvoices({ page, pageSize });
  const { data: billsData } = useBills({ page: 1, pageSize: 100, status: 'paid' }); // 获取已支付账单
  const applyInvoice = useApplyInvoice();
  const downloadInvoice = useDownloadInvoice();

  const invoices = invoicesData?.items || [];
  const bills = billsData?.items || [];
  const total = invoicesData?.total || 0;
  const downloading = downloadInvoice.isPending;

  // 打开/关闭申请弹窗
  const handleOpenApplyModal = useCallback(() => {
    setApplyModalVisible(true);
  }, []);

  const handleCloseApplyModal = useCallback(() => {
    setApplyModalVisible(false);
    form.resetFields();
  }, [form]);

  // 打开/关闭详情弹窗
  const handleOpenDetailModal = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailModalVisible(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedInvoice(null);
  }, []);

  // 申请发票
  const handleApplyInvoice = useCallback(
    async (values: any) => {
      await applyInvoice.mutateAsync(values);
      handleCloseApplyModal();
    },
    [applyInvoice, handleCloseApplyModal]
  );

  // 下载发票
  const handleDownload = useCallback(
    async (invoice: Invoice) => {
      await downloadInvoice.mutateAsync(invoice.id);
    },
    [downloadInvoice]
  );

  // 分页变化
  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  // 表格列配置
  const columns = useMemo(
    () =>
      createInvoiceTableColumns({
        onViewDetail: handleOpenDetailModal,
        onDownload: handleDownload,
      }),
    [handleOpenDetailModal, handleDownload]
  );

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
