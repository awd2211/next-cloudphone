import { TicketType, TicketPriority, TicketStatus } from '@/services/ticket';

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

// 状态配置
export const statusConfig = {
  [TicketStatus.OPEN]: { label: '待处理', color: 'warning' },
  [TicketStatus.IN_PROGRESS]: { label: '处理中', color: 'processing' },
  [TicketStatus.WAITING]: { label: '等待回复', color: 'default' },
  [TicketStatus.RESOLVED]: { label: '已解决', color: 'success' },
  [TicketStatus.CLOSED]: { label: '已关闭', color: 'default' },
};
