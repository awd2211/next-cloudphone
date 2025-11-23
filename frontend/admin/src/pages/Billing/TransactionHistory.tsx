import React, { useEffect } from 'react';
import { Card, Button, Row, Col, Statistic, Tag, message } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  DownloadOutlined,
  TransactionOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { TransactionFilterBar, type Transaction } from '@/components/Billing';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

/**
 * 交易记录页面（优化版）
 *
 * 优化点：
 * 1. ErrorBoundary 错误边界保护
 * 2. LoadingState 统一加载状态
 * 3. 统计卡片展示交易统计
 * 4. 快捷键支持 (Ctrl+R 刷新)
 * 5. 页面标题优化
 */
const TransactionHistoryContent: React.FC = () => {
  const {
    filteredTransactions,
    loading,
    statistics,
    typeFilter,
    statusFilter,
    searchText,
    setTypeFilter,
    setStatusFilter,
    setSearchText,
    columns,
    handleExport,
    handleReset,
    refetch,
  } = useTransactionHistory();

  // 快捷键支持: Ctrl+R 刷新数据
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch?.();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch]);

  return (
    <LoadingState loading={loading} onRetry={refetch}>
      <div>
        {/* 页面标题 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ marginBottom: 0 }}>
            <TransactionOutlined style={{ marginRight: 8 }} />
            交易记录
            <Tag
              icon={<ReloadOutlined spin={loading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={() => refetch?.()}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
        </div>

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="总交易数"
                value={statistics.totalCount}
                prefix={<TransactionOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="总收入"
                value={statistics.totalIncome}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#52c41a' }}
                suffix={<ArrowUpOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="总支出"
                value={statistics.totalExpense}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#ff4d4f' }}
                suffix={<ArrowDownOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="成功"
                value={statistics.successCount}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="处理中"
                value={statistics.pendingCount}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="失败"
                value={statistics.failedCount}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 交易记录表格 */}
        <Card
          extra={
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
              导出记录
            </Button>
          }
        >
          <TransactionFilterBar
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            searchText={searchText}
            onTypeChange={setTypeFilter}
            onStatusChange={setStatusFilter}
            onSearchChange={(e) => setSearchText(e.target.value)}
            onReset={handleReset}
          />

          <AccessibleTable<Transaction>
            ariaLabel="交易记录列表"
            loadingText="正在加载交易记录"
            emptyText="暂无交易记录"
            columns={columns}
            dataSource={filteredTransactions}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 20,
              pageSizeOptions: ['10', '20', '50', '100', '200'],
              showTotal: (total) => `共 ${total} 条记录`,
              showSizeChanger: true,
            }}
            scroll={{ y: 600 }}
            virtual
          />
        </Card>
      </div>
    </LoadingState>
  );
};

/**
 * 交易记录页面 - 带错误边界包裹
 */
const TransactionHistory: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="TransactionHistory">
      <TransactionHistoryContent />
    </ErrorBoundary>
  );
};

export default TransactionHistory;
