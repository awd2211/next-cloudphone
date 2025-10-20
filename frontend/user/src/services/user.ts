import request from '@/utils/request';
import type { User } from '@/types';

// 更新用户信息
export const updateProfile = (data: { email?: string; phone?: string }) => {
  return request.patch<User>('/users/profile', data);
};

// 修改密码
export const changePassword = (data: { oldPassword: string; newPassword: string }) => {
  return request.post('/users/change-password', data);
};

// 获取余额
export const getBalance = () => {
  return request.get<{ balance: number }>('/users/balance');
};

// 充值
export const recharge = (amount: number) => {
  return request.post('/users/recharge', { amount });
};
