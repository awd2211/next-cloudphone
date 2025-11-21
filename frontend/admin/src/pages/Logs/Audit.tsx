import React from 'react';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  LogsAuditFilterBar,
  useLogsAuditColumns,
  LogDetailModal,
  LogsAuditToolbar,
} from '@/components/LogsAudit';
import { useLogsAudit } from '@/hooks/useLogsAudit';
import type { AuditLog } from '@/services/log';

const AuditLogList: React.FC = () => {
  const {
    logs,
    loading,
    total,
    page,
    pageSize,
    selectedLog,
    detailModalVisible,
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

  return (
    <div>
      <h2>操作日志</h2>

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

      <LogDetailModal
        visible={detailModalVisible}
        log={selectedLog}
        onClose={handleCloseDetail}
      />
    </div>
  );
};

export default AuditLogList;
