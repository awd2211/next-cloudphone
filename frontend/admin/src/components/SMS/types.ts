/**
 * SMS 相关类型定义
 */

export interface SMSRecord {
  id: string;
  phone: string;
  content: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  provider: string;
  userId?: string;
  userName?: string;
  templateCode?: string;
  variables?: Record<string, any>;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface SMSStats {
  today: number;
  thisMonth: number;
  successRate: number;
  total: number;
}
