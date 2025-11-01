export const typeMap = {
  'time-based': { color: 'blue' as const, text: '按时长' },
  'usage-based': { color: 'green' as const, text: '按用量' },
  tiered: { color: 'orange' as const, text: '阶梯式' },
  custom: { color: 'purple' as const, text: '自定义' },
};

export type BillingRuleType = keyof typeof typeMap;
