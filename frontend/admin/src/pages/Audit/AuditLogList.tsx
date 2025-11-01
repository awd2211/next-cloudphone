import React from 'react';
import { Card, Table, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useAuditColumns, AuditFilterBar } from '@/components/Audit';
import { useAuditLogs } from '@/hooks/useAuditLogs';

const AuditLogList: React.FC = () => {
  const {
    loading,
    filteredLogs,
    resourceTypeFilter,
    statusFilter,
    methodFilter,
    searchText,
    setResourceTypeFilter,
    setStatusFilter,
    setMethodFilter,
    setSearchText,
    handleExport,
    handleReset,
    handleViewDetails,
  } = useAuditLogs();

  const columns = useAuditColumns({ onViewDetails: handleViewDetails });

  return (
    <Card
      title="审计日志"
      extra={
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
          导出日志
        </Button>
      }
    >
      <AuditFilterBar
        resourceTypeFilter={resourceTypeFilter}
        methodFilter={methodFilter}
        statusFilter={statusFilter}
        searchText={searchText}
        onResourceTypeChange={setResourceTypeFilter}
        onMethodChange={setMethodFilter}
        onStatusChange={setStatusFilter}
        onSearchChange={setSearchText}
        onReset={handleReset}
      />

      <Table
        columns={columns}
        dataSource={filteredLogs}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条日志`,
          showSizeChanger: true,
        }}
        scroll={{ x: 1300 }}
      />
    </Card>
  );
};

export default AuditLogList;
