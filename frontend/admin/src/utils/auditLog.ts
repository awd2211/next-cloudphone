import type { AuditLog } from '@/types/auditLog';

export const generateLogs = (count: number): AuditLog[] => {
  const actions = ['登录', '登出', '创建设备', '删除设备', '修改配额', '查看账单', '导出数据'];
  const resources = ['user', 'device', 'quota', 'billing'];
  const levels: Array<'info' | 'warning' | 'error'> = ['info', 'warning', 'error'];

  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i + 1}`,
    userId: `user-${Math.floor(Math.random() * 100)}`,
    userName: `用户${Math.floor(Math.random() * 100)}`,
    action: actions[Math.floor(Math.random() * actions.length)]!,
    resourceType: resources[Math.floor(Math.random() * resources.length)]!,
    resourceId: `resource-${Math.floor(Math.random() * 1000)}`,
    ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    userAgent: 'Mozilla/5.0',
    timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    level: levels[Math.floor(Math.random() * levels.length)]!,
    details: `操作详情 ${i + 1}`,
  }));
};

export const getLevelColor = (level: string): string => {
  switch (level) {
    case 'error':
      return 'red';
    case 'warning':
      return 'orange';
    default:
      return 'blue';
  }
};
