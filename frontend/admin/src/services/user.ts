/**
 * 用户管理服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
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
export const getUsers = (params?: PaginationParams): Promise<PaginatedResponse<User>> =>
  api.get<PaginatedResponse<User>>('/users', { params });

// 用户列表 (游标分页 - 高性能)
export const getUsersCursor = (
  params?: CursorPaginationParams & {
    tenantId?: string;
    includeRoles?: boolean;
  }
): Promise<CursorPaginatedResponse<User>> =>
  api.get<CursorPaginatedResponse<User>>('/users/cursor', { params });

// 获取用户详情
export const getUser = (id: string): Promise<User> =>
  api.get<User>(`/users/${id}`);

// 创建用户
export const createUser = (data: CreateUserDto): Promise<User> =>
  api.post<User>('/users', data);

// 更新用户
export const updateUser = (id: string, data: UpdateUserDto): Promise<User> =>
  api.patch<User>(`/users/${id}`, data);

// 删除用户
export const deleteUser = (id: string): Promise<void> =>
  api.delete<void>(`/users/${id}`);

// 用户统计
export const getUserStats = (): Promise<{
  total: number;
  active: number;
  inactive: number;
  banned: number;
}> =>
  api.get<{
    total: number;
    active: number;
    inactive: number;
    banned: number;
  }>('/users/stats');

// 充值余额
export const rechargeBalance = (userId: string, amount: number, reason?: string): Promise<void> =>
  api.post<void>(`/balance/recharge`, { userId, amount, reason: reason || '管理员充值' });

// 扣减余额
export const deductBalance = (userId: string, amount: number, reason: string): Promise<void> =>
  api.post<void>(`/balance/adjust`, { userId, amount: -amount, reason, type: 'adjustment' });

// 修改密码
export const changePassword = (
  userId: string,
  data: { oldPassword: string; newPassword: string }
): Promise<void> =>
  api.post<void>(`/users/${userId}/change-password`, data);

// 重置密码（管理员重置用户密码）
// 注意：后端使用 change-password 端点，但这里是管理员操作，不需要旧密码
export const resetPassword = (userId: string, newPassword: string): Promise<void> =>
  api.post<void>(`/users/${userId}/change-password`, { newPassword });

// 批量删除用户
export const batchDeleteUsers = (userIds: string[]): Promise<void> =>
  api.post<void>('/users/batch-delete', { userIds });
