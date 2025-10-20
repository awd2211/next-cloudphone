import request from '@/utils/request';

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

export const login = (params: LoginParams) => {
  return request.post<any, LoginResponse>('/auth/login', params);
};

export const logout = () => {
  return request.post('/auth/logout');
};

export const getCurrentUser = () => {
  return request.get('/auth/me');
};
