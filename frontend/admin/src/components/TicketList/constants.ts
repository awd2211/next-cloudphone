/**
 * Ticket List 常量和工具函数
 */

export interface Ticket {
  id: string;
  ticketNo: string;
  title: string;
  category: 'technical' | 'billing' | 'account' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  lastReplyAt?: string;
  replyCount: number;
  unreadReplies: number;
}

export const CATEGORY_CONFIG = {
  technical: { color: 'blue', text: '技术问题' },
  billing: { color: 'orange', text: '账单问题' },
  account: { color: 'green', text: '账号问题' },
  other: { color: 'default', text: '其他' },
};

export const PRIORITY_CONFIG = {
  low: { color: 'default', text: '低' },
  medium: { color: 'blue', text: '中' },
  high: { color: 'orange', text: '高' },
  urgent: { color: 'red', text: '紧急' },
};

export const STATUS_CONFIG = {
  open: { status: 'error', text: '待处理' },
  in_progress: { status: 'processing', text: '处理中' },
  waiting_customer: { status: 'warning', text: '等待客户' },
  resolved: { status: 'success', text: '已解决' },
  closed: { status: 'default', text: '已关闭' },
};

export const PRIORITY_ORDER = { low: 1, medium: 2, high: 3, urgent: 4 };

export const CATEGORY_OPTIONS = [
  { value: 'all', label: '全部分类' },
  { value: 'technical', label: '技术问题' },
  { value: 'billing', label: '账单问题' },
  { value: 'account', label: '账号问题' },
  { value: 'other', label: '其他' },
];

export const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'open', label: '待处理' },
  { value: 'in_progress', label: '处理中' },
  { value: 'waiting_customer', label: '等待客户' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' },
];

export const PRIORITY_OPTIONS = [
  { value: 'all', label: '全部优先级' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

// Mock 数据（用于演示）
export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'ticket-001',
    ticketNo: 'TKT-20251020-001',
    title: '设备无法启动',
    category: 'technical',
    priority: 'high',
    status: 'in_progress',
    userId: 'user-001',
    userName: '张三',
    userEmail: 'zhangsan@example.com',
    assignedTo: 'admin-001',
    assignedToName: '李工程师',
    createdAt: '2025-10-20 09:30:15',
    updatedAt: '2025-10-20 14:22:30',
    lastReplyAt: '2025-10-20 14:22:30',
    replyCount: 5,
    unreadReplies: 2,
  },
  {
    id: 'ticket-002',
    ticketNo: 'TKT-20251020-002',
    title: '账单金额异常',
    category: 'billing',
    priority: 'medium',
    status: 'waiting_customer',
    userId: 'user-002',
    userName: '王五',
    userEmail: 'wangwu@example.com',
    assignedTo: 'admin-002',
    assignedToName: '赵客服',
    createdAt: '2025-10-20 10:15:42',
    updatedAt: '2025-10-20 11:30:18',
    lastReplyAt: '2025-10-20 11:30:18',
    replyCount: 3,
    unreadReplies: 0,
  },
  {
    id: 'ticket-003',
    ticketNo: 'TKT-20251019-003',
    title: '如何增加设备配额',
    category: 'account',
    priority: 'low',
    status: 'resolved',
    userId: 'user-003',
    userName: '李四',
    userEmail: 'lisi@example.com',
    assignedTo: 'admin-001',
    assignedToName: '李工程师',
    createdAt: '2025-10-19 14:20:10',
    updatedAt: '2025-10-19 16:45:22',
    lastReplyAt: '2025-10-19 16:45:22',
    replyCount: 2,
    unreadReplies: 0,
  },
  {
    id: 'ticket-004',
    ticketNo: 'TKT-20251019-004',
    title: 'API 调用报错',
    category: 'technical',
    priority: 'urgent',
    status: 'open',
    userId: 'user-004',
    userName: '赵六',
    userEmail: 'zhaoliu@example.com',
    createdAt: '2025-10-19 16:50:33',
    updatedAt: '2025-10-19 16:50:33',
    replyCount: 0,
    unreadReplies: 1,
  },
  {
    id: 'ticket-005',
    ticketNo: 'TKT-20251018-005',
    title: '申请退款',
    category: 'billing',
    priority: 'medium',
    status: 'closed',
    userId: 'user-005',
    userName: '孙七',
    userEmail: 'sunqi@example.com',
    assignedTo: 'admin-002',
    assignedToName: '赵客服',
    createdAt: '2025-10-18 09:10:05',
    updatedAt: '2025-10-18 17:20:15',
    lastReplyAt: '2025-10-18 17:20:15',
    replyCount: 8,
    unreadReplies: 0,
  },
];
