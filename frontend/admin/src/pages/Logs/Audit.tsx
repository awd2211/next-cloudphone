import React, { useEffect, useCallback } from 'react';
import { Typography, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  LogsAuditFilterBar,
  useLogsAuditColumns,
  LogDetailModal,
  LogsAuditToolbar,
} from '@/components/LogsAudit';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import { useLogsAudit } from '@/hooks/useLogsAudit';
import type { AuditLog } from '@/services/log';

const { Title, Text } = Typography;

/**
 * 操作日志列表页面（优化版）
 *
 * 优化策略:
 * 1. ErrorBoundary - 组件错误不会导致整个页面崩溃
 * 2. LoadingState - 统一加载状态管理（骨架屏、错误提示、重试）
 * 3. 快捷键支持 - Ctrl+R 刷新数据
 * 4. 页面标题优化 - 显示快捷键提示
 */
const AuditLogListContent: React.FC = () => {
  const {
    logs,
    loading,
    total,
    page,
    pageSize,
    selectedLog,
    detailModalVisible,
    loadLogs,
    handleSearch,
    handleActionChange,
    handleResourceChange,
    handleDateRangeChange,
    handleExportExcel,
    handleCleanLogs,
    handleViewDetail,
    handleCloseDetail,
    handlePageChange,
  } = useLogsAudit();

  const columns = useLogsAuditColumns({ onViewDetail: handleViewDetail });

  // 刷新数据
  const handleRefresh = useCallback(() => {
    loadLogs();
  }, [loadLogs]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R 或 Cmd+R 刷新数据（阻止浏览器默认刷新行为）
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh]);

  return (
    <div>
      {/* 页面标题 - 带快捷键提示 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          操作日志
        </Title>
        <Tooltip title="按 Ctrl+R 刷新数据">
          <Text
            type="secondary"
            style={{ marginLeft: 12, fontSize: 12, cursor: 'pointer' }}
            onClick={handleRefresh}
          >
            <ReloadOutlined style={{ marginRight: 4 }} />
            Ctrl+R 刷新
          </Text>
        </Tooltip>
      </div>

      <LogsAuditFilterBar
        onSearch={handleSearch}
        onActionChange={handleActionChange}
        onResourceChange={handleResourceChange}
        onDateRangeChange={handleDateRangeChange}
      />

      <LogsAuditToolbar
        onExportExcel={handleExportExcel}
        onCleanLogs={handleCleanLogs}
      />

      <LoadingState
        loading={loading && logs.length === 0}
        empty={!loading && logs.length === 0}
        loadingType="skeleton"
        skeletonRows={10}
        emptyDescription="暂无操作日志数据"
        onRetry={handleRefresh}
      >
        <AccessibleTable<AuditLog>
          ariaLabel="操作日志列表"
          loadingText="正在加载操作日志"
          emptyText="暂无操作日志数据"
          columns={columns}
          dataSource={logs as any}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
          }}
          scroll={{ x: 1400, y: 600 }}
          virtual
        />
      </LoadingState>

      <LogDetailModal
        visible={detailModalVisible}
        log={selectedLog}
        onClose={handleCloseDetail}
      />
    </div>
  );
};

/**
 * 操作日志列表页面
 * 使用 ErrorBoundary 包裹，防止组件错误导致整个应用崩溃
 */
const AuditLogList: React.FC = () => {
  return (
    <ErrorBoundary componentName="操作日志列表">
      <AuditLogListContent />
    </ErrorBoundary>
  );
};

export default AuditLogList;
