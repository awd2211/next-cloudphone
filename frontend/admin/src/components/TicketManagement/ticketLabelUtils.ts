/**
 * ticketLabelUtils - 工单标签和颜色工具函数
 * 提供工单状态、优先级、分类等的显示标签和颜色映射
 */
import type { TicketStatus, TicketPriority, TicketCategory, ReplyType } from '@/types';

/**
 * 获取工单状态颜色
 */
export const getStatusColor = (status: TicketStatus): string => {
  const colors: Record<TicketStatus, string> = {
    open: 'blue',
    in_progress: 'orange',
    pending: 'gold',
    resolved: 'green',
    closed: 'default',
  };
  return colors[status] || 'default';
};

/**
 * 获取工单状态标签
 */
export const getStatusLabel = (status: TicketStatus): string => {
  const labels: Record<TicketStatus, string> = {
    open: '待处理',
    in_progress: '处理中',
    pending: '待用户反馈',
    resolved: '已解决',
    closed: '已关闭',
  };
  return labels[status] || status;
};

/**
 * 获取优先级颜色
 */
export const getPriorityColor = (priority: TicketPriority): string => {
  const colors: Record<TicketPriority, string> = {
    low: 'default',
    medium: 'blue',
    high: 'orange',
    urgent: 'red',
  };
  return colors[priority] || 'default';
};

/**
 * 获取优先级标签
 */
export const getPriorityLabel = (priority: TicketPriority): string => {
  const labels: Record<TicketPriority, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  };
  return labels[priority] || priority;
};

/**
 * 获取分类标签
 */
export const getCategoryLabel = (category: TicketCategory): string => {
  const labels: Record<TicketCategory, string> = {
    technical: '技术支持',
    billing: '账单问题',
    account: '账户问题',
    feature_request: '功能请求',
    other: '其他',
  };
  return labels[category] || category;
};

/**
 * 获取回复类型颜色
 */
export const getReplyTypeColor = (type: ReplyType): string => {
  const colors: Record<ReplyType, string> = {
    user: 'blue',
    staff: 'green',
    system: 'purple',
  };
  return colors[type] || 'default';
};
