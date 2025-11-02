export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  details: string;
}
