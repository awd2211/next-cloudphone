/**
 * 通知模板配置常量
 */

export const TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  system: { color: 'blue', label: '系统通知' },
  user: { color: 'green', label: '用户通知' },
  device: { color: 'orange', label: '设备通知' },
  billing: { color: 'purple', label: '账单通知' },
  app: { color: 'cyan', label: '应用通知' },
};

export const CHANNEL_CONFIG: Record<string, { color: string; label: string }> = {
  websocket: { color: 'blue', label: 'WebSocket' },
  email: { color: 'green', label: '邮件' },
  sms: { color: 'orange', label: '短信' },
};
