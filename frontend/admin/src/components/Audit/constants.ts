export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceType: 'user' | 'device' | 'plan' | 'quota' | 'billing' | 'ticket' | 'apikey' | 'system';
  resourceId?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failed' | 'warning';
  details?: string;
  changes?: any;
  createdAt: string;
}

export const RESOURCE_TYPE_CONFIG = {
  user: { color: 'blue', text: '用户' },
  device: { color: 'green', text: '设备' },
  plan: { color: 'purple', text: '套餐' },
  quota: { color: 'orange', text: '配额' },
  billing: { color: 'gold', text: '账单' },
  ticket: { color: 'cyan', text: '工单' },
  apikey: { color: 'magenta', text: 'API密钥' },
  system: { color: 'red', text: '系统' },
} as const;

export const METHOD_CONFIG = {
  GET: { color: 'default', text: 'GET' },
  POST: { color: 'green', text: 'POST' },
  PUT: { color: 'blue', text: 'PUT' },
  DELETE: { color: 'red', text: 'DELETE' },
  PATCH: { color: 'orange', text: 'PATCH' },
} as const;

export const STATUS_CONFIG = {
  success: { color: 'success', text: '成功' },
  failed: { color: 'error', text: '失败' },
  warning: { color: 'warning', text: '警告' },
} as const;

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-001',
    userId: 'admin-001',
    userName: '李管理员',
    action: '更新用户配额',
    resource: 'quotas',
    resourceType: 'quota',
    resourceId: 'quota-123',
    method: 'PUT',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    status: 'success',
    details: '将用户 张三 的设备配额从 10 增加到 20',
    changes: { maxDevices: { from: 10, to: 20 } },
    createdAt: '2025-10-20 14:30:25',
  },
  {
    id: 'log-002',
    userId: 'admin-002',
    userName: '赵管理员',
    action: '创建新用户',
    resource: 'users',
    resourceType: 'user',
    resourceId: 'user-456',
    method: 'POST',
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success',
    details: '创建新用户: wangwu@example.com',
    createdAt: '2025-10-20 13:15:42',
  },
  {
    id: 'log-003',
    userId: 'user-001',
    userName: '张三',
    action: '启动设备',
    resource: 'devices',
    resourceType: 'device',
    resourceId: 'device-789',
    method: 'POST',
    ipAddress: '58.220.45.123',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    status: 'success',
    details: '成功启动设备 DEV-12345',
    createdAt: '2025-10-20 12:45:10',
  },
  {
    id: 'log-004',
    userId: 'admin-001',
    userName: '李管理员',
    action: '删除 API 密钥',
    resource: 'apikeys',
    resourceType: 'apikey',
    resourceId: 'key-321',
    method: 'DELETE',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    status: 'success',
    details: '删除 API 密钥: ak_test_xxxx',
    createdAt: '2025-10-20 11:20:33',
  },
  {
    id: 'log-005',
    userId: 'user-002',
    userName: '王五',
    action: '账户充值',
    resource: 'billing',
    resourceType: 'billing',
    resourceId: 'txn-654',
    method: 'POST',
    ipAddress: '112.80.248.75',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G991B)',
    status: 'success',
    details: '充值金额: ¥5000.00',
    createdAt: '2025-10-20 10:10:05',
  },
  {
    id: 'log-006',
    userId: 'admin-002',
    userName: '赵管理员',
    action: '修改系统配置',
    resource: 'system',
    resourceType: 'system',
    method: 'PUT',
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'warning',
    details: '修改系统邮件配置',
    createdAt: '2025-10-20 09:35:50',
  },
  {
    id: 'log-007',
    userId: 'user-003',
    userName: '李四',
    action: '删除设备',
    resource: 'devices',
    resourceType: 'device',
    resourceId: 'device-999',
    method: 'DELETE',
    ipAddress: '61.140.25.180',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'failed',
    details: '删除设备失败: 设备正在运行中',
    createdAt: '2025-10-20 08:50:15',
  },
];
