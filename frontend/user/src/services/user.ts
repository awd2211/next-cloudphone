import request from '@/utils/request';
import type { User } from '@/types';

/**
 * 用户服务 API
 *
 * ⚠️ 注意：部分端点路径已调整以匹配后端实现
 */

// 获取当前用户信息
export const getUserInfo = () => {
  return request.get<User>('/users/me');
};

// 更新用户信息
// 后端使用 PATCH /users/:id 而不是 /users/profile
export const updateProfile = (data: { email?: string; phone?: string }) => {
  const userId = localStorage.getItem('userId') || '';
  if (!userId) {
    return Promise.reject(new Error('用户未登录'));
  }
  return request.patch<User>(`/users/${userId}`, data);
};

// 修改密码
// 后端使用 POST /users/:id/change-password 而不是 /users/change-password
export const changePassword = (data: { oldPassword: string; newPassword: string }) => {
  const userId = localStorage.getItem('userId') || '';
  if (!userId) {
    return Promise.reject(new Error('用户未登录'));
  }
  return request.post(`/users/${userId}/change-password`, data);
};

// 获取余额
// 后端使用 /balance/user/:userId 而不是 /users/balance
export const getBalance = () => {
  const userId = localStorage.getItem('userId') || '';
  if (!userId) {
    return Promise.resolve({ balance: 0 });
  }
  return request.get<{ balance: number }>(`/balance/user/${userId}`);
};

// 充值
// 后端使用 POST /balance/recharge
export const recharge = (amount: number) => {
  const userId = localStorage.getItem('userId') || '';
  if (!userId) {
    return Promise.reject(new Error('用户未登录'));
  }
  return request.post('/balance/recharge', { userId, amount });
};

// 更新用户偏好设置
export const updateUserPreferences = (
  userId: string,
  data: {
    language?: string;
    theme?: string;
    preferences?: Record<string, any>;
  }
) => {
  return request.patch(`/users/${userId}/preferences`, data);
};
