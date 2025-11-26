import React, { useState, useCallback, useEffect } from 'react';
import { Card, Button, Row, Col, Statistic, Tag, Modal, Input, Space, message } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  FileTextOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';
import { InvoiceDetailModal, type Invoice } from '@/components/Billing';
import { useInvoiceList } from '@/hooks/useInvoiceList';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

/**
 * 账单列表页面（优化版 v2 - 添加 ErrorBoundary + LoadingState + 统计卡片 + 快捷键）
 *
 * 优化点：
 * 1. ✅ 表格列配置提取到 hook
 * 2. ✅ 模态框提取为独立组件
 * 3. ✅ 业务逻辑集中在 useInvoiceList hook
 * 4. ✅ ErrorBoundary - 错误边界保护
 * 5. ✅ LoadingState - 统一加载状态
 * 6. ✅ 统计卡片 - 账单数量/金额统计
 * 7. ✅ 快捷键支持 - Ctrl+K 搜索、Ctrl+R 刷新
 */
const InvoiceList: React.FC = () => {
  // 快速搜索状态
  const [quickSearchVisible, setQuickSearchVisible] = useState(false);
  const [quickSearchValue, setQuickSearchValue] = useState('');

  const {
    invoices,
    total,
    loading,
    error,
    refetch,
    page,
    pageSize,
    setPage,
    setPageSize,
    searchKeyword,
    handleSearch,
    stats,
    detailModalVisible,
    selectedInvoice,
    columns,
    handleDownload,
    handleCloseDetail,
  } = useInvoiceList();

  // ===== 快捷键支持 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K 快速搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSearchVisible(true);
        return;
      }

      // Ctrl+R 刷新列表
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新...');
        return;
      }

      // Escape 关闭快速搜索
      if (e.key === 'Escape' && quickSearchVisible) {
        setQuickSearchVisible(false);
        setQuickSearchValue('');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickSearchVisible, refetch]);

  // ===== 快速搜索处理 =====
  const handleQuickSearch = useCallback((value: string) => {
    setQuickSearchValue('');
    setQuickSearchVisible(false);
    if (value.trim()) {
      handleSearch(value.trim());
    }
  }, [handleSearch]);

  return (
    <ErrorBoundary boundaryName="InvoiceList">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>
            账单管理
            <Tag
              icon={<ReloadOutlined spin={loading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={() => refetch()}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
          <Space>
            <span style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary }}>
              快捷键：Ctrl+K 搜索
            </span>
          </Space>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="账单总数"
                value={stats.total}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="已支付"
                value={stats.paid}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: SEMANTIC.success.main }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="待支付"
                value={stats.unpaid}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: SEMANTIC.warning.main }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="待付金额"
                value={stats.unpaidAmount}
                prefix={<DollarOutlined />}
                precision={2}
                suffix="元"
                valueStyle={{ color: SEMANTIC.error.main }}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" icon={<FileTextOutlined />}>
                申请发票
              </Button>
              {searchKeyword && (
                <Tag closable onClose={() => handleSearch('')}>
                  搜索: {searchKeyword}
                </Tag>
              )}
            </Space>
          </div>

          <LoadingState
            loading={loading}
            error={error}
            empty={!loading && !error && invoices.length === 0}
            onRetry={refetch}
            loadingType="skeleton"
            skeletonRows={5}
            emptyDescription="暂无账单数据"
          >
            <AccessibleTable<Invoice>
              ariaLabel="账单列表"
              loadingText="正在加载账单列表"
              emptyText="暂无账单数据"
              columns={columns}
              dataSource={invoices}
              loading={false} // LoadingState 已处理
              rowKey="id"
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条账单`,
                onChange: (p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                },
                pageSizeOptions: ['10', '20', '50', '100', '200'],
              }}
              scroll={{ y: 600 }}
              virtual
            />
          </LoadingState>
        </Card>

        {/* 快速搜索弹窗 */}
        <Modal
          open={quickSearchVisible}
          title="快速搜索账单"
          footer={null}
          onCancel={() => {
            setQuickSearchVisible(false);
            setQuickSearchValue('');
          }}
          destroyOnClose
        >
          <Input
            placeholder="输入账单号或账期进行搜索..."
            prefix={<SearchOutlined />}
            value={quickSearchValue}
            onChange={(e) => setQuickSearchValue(e.target.value)}
            onPressEnter={(e) => handleQuickSearch((e.target as HTMLInputElement).value)}
            autoFocus
            allowClear
          />
          <div style={{ marginTop: 8, color: NEUTRAL_LIGHT.text.tertiary, fontSize: 12 }}>
            按 Enter 搜索，按 Escape 关闭
          </div>
        </Modal>

        <InvoiceDetailModal
          visible={detailModalVisible}
          invoice={selectedInvoice}
          onClose={handleCloseDetail}
          onDownload={handleDownload}
        />
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(InvoiceList);
