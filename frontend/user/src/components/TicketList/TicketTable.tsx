import React, { useMemo } from 'react';
import { Table, Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { createTicketColumns } from '@/utils/ticketConfig';
import type { Ticket } from '@/services/ticket';

interface TicketTableProps {
  tickets: Ticket[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize?: number) => void;
  onViewDetail: (ticketId: string) => void;
  onCreateTicket: () => void;
}

/**
 * 工单表格组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 使用 useMemo 缓存表格列定义
 * - 支持空状态显示
 */
export const TicketTable: React.FC<TicketTableProps> = React.memo(
  ({ tickets, loading, total, page, pageSize, onPageChange, onViewDetail, onCreateTicket }) => {
    // 使用 useMemo 缓存表格列定义
    const columns = useMemo(() => createTicketColumns(onViewDetail), [onViewDetail]);

    return (
      <Table
        columns={columns}
        dataSource={tickets}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: onPageChange,
        }}
        locale={{
          emptyText: (
            <Empty description="暂无工单" image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button type="primary" icon={<PlusOutlined />} onClick={onCreateTicket}>
                创建第一个工单
              </Button>
            </Empty>
          ),
        }}
      />
    );
  }
);

TicketTable.displayName = 'TicketTable';
