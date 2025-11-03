import { Button, Tag, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { TicketType, TicketPriority, TicketStatus, type Ticket } from '@/services/ticket';

/**
 * 工单配置文件
 * 集中管理工单类型、优先级、状态的显示配置
 */

// 工单类型配置
export const ticketTypeConfig = {
  [TicketType.TECHNICAL]: { label: '技术问题', color: 'blue' },
  [TicketType.BILLING]: { label: '账单问题', color: 'orange' },
  [TicketType.DEVICE]: { label: '设备问题', color: 'purple' },
  [TicketType.APP]: { label: '应用问题', color: 'cyan' },
  [TicketType.FEATURE]: { label: '功能建议', color: 'green' },
  [TicketType.OTHER]: { label: '其他', color: 'default' },
};

// 优先级配置
export const priorityConfig = {
  [TicketPriority.LOW]: { label: '低', color: 'default' },
  [TicketPriority.MEDIUM]: { label: '中', color: 'blue' },
  [TicketPriority.HIGH]: { label: '高', color: 'orange' },
  [TicketPriority.URGENT]: { label: '紧急', color: 'red' },
};

// 状态配置（带图标）
export const statusConfig = {
  [TicketStatus.OPEN]: {
    label: '待处理',
    color: 'warning' as const,
    icon: <ClockCircleOutlined />,
  },
  [TicketStatus.IN_PROGRESS]: {
    label: '处理中',
    color: 'processing' as const,
    icon: <SyncOutlined spin />,
  },
  [TicketStatus.WAITING]: {
    label: '等待回复',
    color: 'default' as const,
    icon: <ClockCircleOutlined />,
  },
  [TicketStatus.RESOLVED]: {
    label: '已解决',
    color: 'success' as const,
    icon: <CheckCircleOutlined />,
  },
  [TicketStatus.CLOSED]: {
    label: '已关闭',
    color: 'default' as const,
    icon: <CloseCircleOutlined />,
  },
};

/**
 * 创建工单表格列定义
 */
export const createTicketColumns = (
  onViewDetail: (ticketId: string) => void
): ColumnsType<Ticket> => [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 120,
    render: (id: string) => (
      <Button
        type="link"
        onClick={() => onViewDetail(id)}
        style={{ padding: 0, fontFamily: 'monospace' }}
      >
        #{id.slice(0, 8)}
      </Button>
    ),
  },
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
    ellipsis: true,
    render: (title: string, record: Ticket) => (
      <Tooltip title={title}>
        <a onClick={() => onViewDetail(record.id)}>{title}</a>
      </Tooltip>
    ),
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 100,
    render: (type: TicketType) => (
      <Tag color={ticketTypeConfig[type]?.color}>{ticketTypeConfig[type]?.label}</Tag>
    ),
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: 80,
    render: (priority: TicketPriority) => (
      <Tag color={priorityConfig[priority]?.color}>{priorityConfig[priority]?.label}</Tag>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    render: (status: TicketStatus) => (
      <Tag icon={statusConfig[status]?.icon} color={statusConfig[status]?.color}>
        {statusConfig[status]?.label}
      </Tag>
    ),
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 150,
    render: (createdAt: string) => (
      <Tooltip title={dayjs(createdAt).format('YYYY-MM-DD HH:mm:ss')}>
        {dayjs(createdAt).fromNow()}
      </Tooltip>
    ),
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    render: (_, record: Ticket) => (
      <Button type="link" onClick={() => onViewDetail(record.id)}>
        查看详情
      </Button>
    ),
  },
];
