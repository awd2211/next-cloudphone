import request from '@/utils/request';
import type {
  User,
  CreateUserDto,
  UpdateUserDto,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

// 用户列表
export const getUsers = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<User>>('/users', { params });
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
export const rechargeBalance = (userId: string, amount: number) => {
  return request.post(`/users/${userId}/recharge`, { amount });
};

// 扣减余额
export const deductBalance = (userId: string, amount: number, reason: string) => {
  return request.post(`/users/${userId}/deduct`, { amount, reason });
};
