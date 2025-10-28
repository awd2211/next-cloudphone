/**
 * 路由路径常量
 */

export const ROUTES = {
  // 认证
  LOGIN: '/login',
  LOGOUT: '/logout',

  // 仪表盘
  DASHBOARD: '/',

  // 设备管理
  DEVICES: '/devices',
  DEVICE_LIST: '/devices/list',
  DEVICE_DETAIL: '/devices/:id',
  DEVICE_CREATE: '/devices/create',

  // 用户管理
  USERS: '/users',
  USER_LIST: '/users/list',
  USER_DETAIL: '/users/:id',
  USER_CREATE: '/users/create',
  USER_BALANCE: '/users/:id/balance',

  // 应用管理
  APPS: '/apps',
  APP_LIST: '/apps/list',
  APP_DETAIL: '/apps/:id',
  APP_UPLOAD: '/apps/upload',

  // 订单管理
  ORDERS: '/orders',
  ORDER_LIST: '/orders/list',
  ORDER_DETAIL: '/orders/:id',

  // 套餐管理
  PLANS: '/plans',
  PLAN_LIST: '/plans/list',
  PLAN_CREATE: '/plans/create',
  PLAN_EDIT: '/plans/:id/edit',

  // 支付管理
  PAYMENTS: '/payments',
  PAYMENT_DASHBOARD: '/payments/dashboard',
  PAYMENT_LIST: '/payments/list',
  PAYMENT_REFUND: '/payments/refund',
  PAYMENT_WEBHOOK: '/payments/webhook',

  // 账单管理
  BILLING: '/billing',
  BILLING_OVERVIEW: '/billing/overview',
  BILLING_TRANSACTIONS: '/billing/transactions',
  BILLING_INVOICES: '/billing/invoices',

  // 报表中心
  ANALYTICS: '/analytics',
  ANALYTICS_REVENUE: '/analytics/revenue',
  ANALYTICS_REPORTS: '/analytics/reports',

  // 权限管理
  PERMISSIONS: '/permissions',
  ROLE_LIST: '/permissions/roles',
  PERMISSION_LIST: '/permissions/list',
  DATA_SCOPE: '/permissions/data-scope',
  FIELD_PERMISSION: '/permissions/field-permission',

  // 审计日志
  AUDIT: '/audit',
  AUDIT_LOGS: '/audit/logs',

  // 工单系统
  TICKETS: '/tickets',
  TICKET_LIST: '/tickets/list',
  TICKET_DETAIL: '/tickets/:id',

  // 系统设置
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_SECURITY: '/settings/security',
  SETTINGS_API_KEYS: '/settings/api-keys',
} as const;

/**
 * 获取带参数的路由
 */
export function getRoute(path: string, params: Record<string, string>): string {
  let result = path;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`:${key}`, value);
  });
  return result;
}
