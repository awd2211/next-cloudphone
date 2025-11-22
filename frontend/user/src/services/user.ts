/**
 * 用户服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { User } from '@/types';

/** 获取当前用户信息 */
export const getUserInfo = () =>
  api.get<User>('/users/me');

/** 更新用户信息 */
export const updateProfile = async (data: { email?: string; phone?: string }) => {
  const userId = localStorage.getItem('userId') || '';
  if (!userId) {
    throw new Error('用户未登录');
  }
  return api.patch<User>(`/users/${userId}`, data);
};

/** 修改密码 */
export const changePassword = async (data: { oldPassword: string; newPassword: string }) => {
  const userId = localStorage.getItem('userId') || '';
  if (!userId) {
    throw new Error('用户未登录');
  }
  return api.post<void>(`/users/${userId}/change-password`, data);
};

/** 获取余额 */
export const getBalance = async () => {
  const userId = localStorage.getItem('userId') || '';
  if (!userId) {
    return { balance: 0 };
  }
  return api.get<{ balance: number }>(`/balance/user/${userId}`);
};

/** 充值 */
export const recharge = async (amount: number) => {
  const userId = localStorage.getItem('userId') || '';
  if (!userId) {
    throw new Error('用户未登录');
  }
  return api.post<void>('/balance/recharge', { userId, amount });
};

/** 更新用户偏好设置 */
export const updateUserPreferences = (
  userId: string,
  data: {
    language?: string;
    theme?: string;
    preferences?: Record<string, unknown>;
  }
) => api.patch<void>(`/users/${userId}/preferences`, data);
