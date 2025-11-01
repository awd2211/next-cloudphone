/**
 * TicketTableCard - 工单表格卡片组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Card, Table, Button, Space, Select } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from '@/types';
import { createTicketTableColumns } from './ticketTableColumns';

interface TicketTableCardProps {
  tickets: Ticket[];
  loading: boolean;
  filterStatus: TicketStatus | undefined;
  filterPriority: TicketPriority | undefined;
  filterCategory: TicketCategory | undefined;
  onFilterStatusChange: (value: TicketStatus | undefined) => void;
  onFilterPriorityChange: (value: TicketPriority | undefined) => void;
  onFilterCategoryChange: (value: TicketCategory | undefined) => void;
  onRefresh: () => void;
  onCreate: () => void;
  onViewDetail: (record: Ticket) => void;
  onReply: (record: Ticket) => void;
  onEdit: (record: Ticket) => void;
}

/**
 * TicketTableCard 组件
 * 显示工单列表表格，包含筛选器和操作按钮
 */
export const TicketTableCard = memo<TicketTableCardProps>(
  ({
    tickets,
    loading,
    filterStatus,
    filterPriority,
    filterCategory,
    onFilterStatusChange,
    onFilterPriorityChange,
    onFilterCategoryChange,
    onRefresh,
    onCreate,
    onViewDetail,
    onReply,
    onEdit,
  }) => {
    const columns = createTicketTableColumns({
      onViewDetail,
      onReply,
      onEdit,
    });

    return (
      <Card
        title="工单管理"
        extra={
          <Space>
            <Select
              placeholder="状态"
              value={filterStatus}
              onChange={onFilterStatusChange}
              style={{ width: 150 }}
              allowClear
            >
              <Select.Option value="open">待处理</Select.Option>
              <Select.Option value="in_progress">处理中</Select.Option>
              <Select.Option value="pending">待用户反馈</Select.Option>
              <Select.Option value="resolved">已解决</Select.Option>
              <Select.Option value="closed">已关闭</Select.Option>
            </Select>
            <Select
              placeholder="优先级"
              value={filterPriority}
              onChange={onFilterPriorityChange}
              style={{ width: 120 }}
              allowClear
            >
              <Select.Option value="low">低</Select.Option>
              <Select.Option value="medium">中</Select.Option>
              <Select.Option value="high">高</Select.Option>
              <Select.Option value="urgent">紧急</Select.Option>
            </Select>
            <Select
              placeholder="分类"
              value={filterCategory}
              onChange={onFilterCategoryChange}
              style={{ width: 150 }}
              allowClear
            >
              <Select.Option value="technical">技术支持</Select.Option>
              <Select.Option value="billing">账单问题</Select.Option>
              <Select.Option value="account">账户问题</Select.Option>
              <Select.Option value="feature_request">功能请求</Select.Option>
              <Select.Option value="other">其他</Select.Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
              新建工单
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1800 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>
    );
  }
);

TicketTableCard.displayName = 'TicketTableCard';
