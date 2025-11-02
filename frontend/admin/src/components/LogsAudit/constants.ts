export const ACTION_COLORS: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  read: 'default',
  login: 'cyan',
  logout: 'purple',
};

export const METHOD_COLORS: Record<string, string> = {
  GET: 'blue',
  POST: 'green',
  PUT: 'orange',
  PATCH: 'cyan',
  DELETE: 'red',
};

export const ACTION_OPTIONS = [
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'read', label: '查看' },
  { value: 'login', label: '登录' },
  { value: 'logout', label: '登出' },
];

export const RESOURCE_OPTIONS = [
  { value: 'users', label: '用户' },
  { value: 'devices', label: '设备' },
  { value: 'orders', label: '订单' },
  { value: 'roles', label: '角色' },
  { value: 'settings', label: '设置' },
];

export const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return 'green';
  if (status >= 400) return 'red';
  return 'orange';
};

export const getDurationColor = (duration: number): string => {
  if (duration < 100) return 'green';
  if (duration < 500) return 'orange';
  return 'red';
};
