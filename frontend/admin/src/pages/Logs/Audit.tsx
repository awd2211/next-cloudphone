import React from 'react';
import { Table } from 'antd';
import {
  LogsAuditFilterBar,
  useLogsAuditColumns,
  LogDetailModal,
  LogsAuditToolbar,
} from '@/components/LogsAudit';
import { useLogsAudit } from '@/hooks/useLogsAudit';

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

      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: handlePageChange,
        }}
        scroll={{ x: 1400 }}
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
