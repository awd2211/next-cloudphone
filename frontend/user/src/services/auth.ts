import request from '@/utils/request';
import type { User, LoginDto, RegisterDto } from '@/types';

// 用户注册
export const register = (data: RegisterDto) => {
  return request.post<User>('/auth/register', data);
};

// 用户登录
export const login = (data: LoginDto) => {
  return request.post<{ token: string; user: User }>('/auth/login', data);
};

// 获取当前用户信息
export const getCurrentUser = () => {
  return request.get<User>('/auth/me');
};

// 退出登录
export const logout = () => {
  return request.post('/auth/logout');
};
