import React from 'react';
import { Card, Table, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { TicketFilterBar, useTicketTableColumns } from '@/components/TicketList';
import { useTicketList } from '@/hooks/useTicketList';

const TicketList: React.FC = () => {
  const {
    loading,
    filteredTickets,
    searchText,
    categoryFilter,
    statusFilter,
    priorityFilter,
    setSearchText,
    setCategoryFilter,
    setStatusFilter,
    setPriorityFilter,
    handleViewDetail,
    handleCreateTicket,
  } = useTicketList();

  const columns = useTicketTableColumns({ onViewDetail: handleViewDetail });

  return (
    <Card
      title="工单管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTicket}>
          创建工单
        </Button>
      }
    >
      <TicketFilterBar
        searchText={searchText}
        categoryFilter={categoryFilter}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        onSearchChange={setSearchText}
        onCategoryChange={setCategoryFilter}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
      />

      <Table
        columns={columns}
        dataSource={filteredTickets}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条工单`,
          showSizeChanger: true,
        }}
        scroll={{ x: 1400 }}
      />
    </Card>
  );
};

export default React.memo(TicketList);
