import React from 'react';
import { Card, Button } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { DownloadOutlined } from '@ant-design/icons';
import { TransactionFilterBar, type Transaction } from '@/components/Billing';
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
  );
};

export default TransactionHistory;
