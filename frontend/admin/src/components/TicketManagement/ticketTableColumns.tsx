/**
 * ticketTableColumns - 工单表格列定义
 */
import { Button, Space, Tag, Badge, Rate } from 'antd';
import { EditOutlined, EyeOutlined, MessageOutlined } from '@ant-design/icons';
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from '@/types';
import {
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel,
  getCategoryLabel,
} from './ticketLabelUtils';

interface ColumnHandlers {
  onViewDetail: (record: Ticket) => void;
  onReply: (record: Ticket) => void;
  onEdit: (record: Ticket) => void;
}

/**
 * 创建工单表格列定义
 */
export const createTicketTableColumns = (handlers: ColumnHandlers) => [
  {
    title: '工单编号',
    dataIndex: 'ticketNumber',
    key: 'ticketNumber',
    width: 160,
  },
  {
    title: '主题',
    dataIndex: 'subject',
    key: 'subject',
    width: 200,
    ellipsis: true,
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 120,
    render: (category: TicketCategory) => <Tag color="cyan">{getCategoryLabel(category)}</Tag>,
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: 100,
    render: (priority: TicketPriority) => (
      <Tag color={getPriorityColor(priority)}>{getPriorityLabel(priority)}</Tag>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    render: (status: TicketStatus) => (
      <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
    ),
  },
  {
    title: '用户ID',
    dataIndex: 'userId',
    key: 'userId',
    width: 120,
    ellipsis: true,
  },
  {
    title: '分配给',
    dataIndex: 'assignedTo',
    key: 'assignedTo',
    width: 120,
    ellipsis: true,
    render: (assignedTo?: string) => assignedTo || <span style={{ color: '#999' }}>未分配</span>,
  },
  {
    title: '回复数',
    dataIndex: 'replyCount',
    key: 'replyCount',
    width: 80,
    render: (count: number) => <Badge count={count} showZero />,
  },
  {
    title: '评分',
    dataIndex: 'rating',
    key: 'rating',
    width: 120,
    render: (rating?: number) =>
      rating ? <Rate disabled value={rating} /> : <span style={{ color: '#999' }}>未评分</span>,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 170,
    render: (date: string) => new Date(date).toLocaleString('zh-CN'),
  },
  {
    title: '操作',
    key: 'action',
    width: 250,
    fixed: 'right' as const,
    render: (_: any, record: Ticket) => (
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handlers.onViewDetail(record)}
        >
          详情
        </Button>
        <Button
          type="link"
          size="small"
          icon={<MessageOutlined />}
          onClick={() => handlers.onReply(record)}
        >
          回复
        </Button>
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handlers.onEdit(record)}
        >
          编辑
        </Button>
      </Space>
    ),
  },
];
