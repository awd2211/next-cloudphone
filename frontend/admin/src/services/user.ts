import request from '@/utils/request';
import type {
  User,
  CreateUserDto,
  UpdateUserDto,
  PaginationParams,
  PaginatedResponse,
  CursorPaginationParams,
  CursorPaginatedResponse,
} from '@/types';

// 用户列表 (传统偏移分页)
export const getUsers = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<User>>('/users', { params });
};

// 用户列表 (游标分页 - 高性能)
export const getUsersCursor = (
  params?: CursorPaginationParams & {
    tenantId?: string;
    includeRoles?: boolean;
  }
) => {
  return request.get<CursorPaginatedResponse<User>>('/users/cursor', { params });
};

// 获取用户详情
export const getUser = (id: string) => {
  return request.get<User>(`/users/${id}`);
};

// 创建用户
export const createUser = (data: CreateUserDto) => {
  return request.post<User>('/users', data);
};

// 更新用户
export const updateUser = (id: string, data: UpdateUserDto) => {
  return request.patch<User>(`/users/${id}`, data);
};

// 删除用户
export const deleteUser = (id: string) => {
  return request.delete(`/users/${id}`);
};

// 用户统计
export const getUserStats = () => {
  return request.get<{
    total: number;
    active: number;
    inactive: number;
    banned: number;
  }>('/users/stats');
};

// 充值余额
export const rechargeBalance = (userId: string, amount: number, reason?: string) => {
  return request.post(`/balance/recharge`, { userId, amount, reason: reason || '管理员充值' });
};

// 扣减余额
export const deductBalance = (userId: string, amount: number, reason: string) => {
  return request.post(`/balance/adjust`, { userId, amount: -amount, reason, type: 'adjustment' });
};

// 修改密码
export const changePassword = (
  userId: string,
  data: { oldPassword: string; newPassword: string }
) => {
  return request.post(`/users/${userId}/change-password`, data);
};

// 重置密码
export const resetPassword = (userId: string, newPassword: string) => {
  return request.post(`/users/${userId}/reset-password`, { newPassword });
};

// 批量删除用户
export const batchDeleteUsers = (userIds: string[]) => {
  return request.post('/users/batch-delete', { userIds });
};
