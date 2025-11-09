import request from '@/utils/request';

export interface LoginParams {
  username: string;
  password: string;
  captcha: string;
  captchaId: string;
}

export interface LoginResponse {
  success?: boolean;
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

export const getCaptcha = () => {
  return request.get<any, CaptchaResponse>('/auth/captcha');
};

export const login = (params: LoginParams) => {
  return request.post<any, LoginResponse>('/auth/login', params);
};

export const logout = () => {
  return request.post('/auth/logout');
};

export const getCurrentUser = () => {
  return request.get('/auth/me');
};

/**
 * 刷新 Token
 * 使用当前有效的 token 获取新的 token
 */
export const refreshToken = () => {
  return request.post<any, { token: string; expiresIn?: string }>('/auth/refresh');
};
