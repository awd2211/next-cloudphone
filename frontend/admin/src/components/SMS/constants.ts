/**
 * SMS 相关常量配置
 */

/**
 * 短信状态配置
 */
export const STATUS_CONFIG: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待发送' },
  sent: { color: 'processing', text: '已发送' },
  delivered: { color: 'success', text: '已送达' },
  failed: { color: 'error', text: '发送失败' },
};

/**
 * 供应商映射
 */
export const PROVIDER_MAP: Record<string, string> = {
  aliyun: '阿里云',
  tencent: '腾讯云',
  twilio: 'Twilio',
};

/**
 * 状态筛选选项
 */
export const STATUS_OPTIONS = [
  { label: '等待发送', value: 'pending' },
  { label: '已发送', value: 'sent' },
  { label: '已送达', value: 'delivered' },
  { label: '发送失败', value: 'failed' },
];

/**
 * 供应商选项
 */
export const PROVIDER_OPTIONS = [
  { label: '阿里云', value: 'aliyun' },
  { label: '腾讯云', value: 'tencent' },
  { label: 'Twilio', value: 'twilio' },
];
