/**
 * 认证服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';

export interface LoginParams {
  username: string;
  password: string;
  captcha: string;
  captchaId: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    roles: string[];
    isSuperAdmin?: boolean;
    tenantId?: string | null;
    fullName?: string | null;
    avatar?: string | null;
  };
}

export interface CaptchaResponse {
  id: string;
  svg: string;
}

export const getCaptcha = (): Promise<CaptchaResponse> =>
  api.get<CaptchaResponse>('/auth/captcha');

export const login = (params: LoginParams): Promise<LoginResponse> =>
  api.post<LoginResponse>('/auth/login', params);

export const logout = (): Promise<void> =>
  api.post<void>('/auth/logout');

export const getCurrentUser = () =>
  api.get('/auth/me');

/**
 * 刷新 Token
 * 使用当前有效的 token 获取新的 token
 */
export const refreshToken = (): Promise<{ token: string; expiresIn?: string }> =>
  api.post<{ token: string; expiresIn?: string }>('/auth/refresh');
