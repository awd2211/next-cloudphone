import React from 'react';
import { Card, Table, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { TransactionFilterBar } from '@/components/Billing';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';

const TransactionHistory: React.FC = () => {
  const {
    filteredTransactions,
    loading,
    typeFilter,
    statusFilter,
    searchText,
    setTypeFilter,
    setStatusFilter,
    setSearchText,
    columns,
    handleExport,
    handleReset,
  } = useTransactionHistory();

  return (
    <Card
      title="交易记录"
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

      <Table
        columns={columns}
        dataSource={filteredTransactions}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条记录`,
          showSizeChanger: true,
        }}
      />
    </Card>
  );
};

export default TransactionHistory;
