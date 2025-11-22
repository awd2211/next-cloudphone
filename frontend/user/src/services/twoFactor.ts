/**
 * 双因素认证服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';

export interface TwoFactorSecret {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

export interface Enable2FADto {
  token: string;
}

// 生成2FA密钥和二维码
export const generate2FASecret = () =>
  api.get<TwoFactorSecret>('/auth/2fa/generate');

// 启用2FA
export const enable2FA = (data: Enable2FADto) =>
  api.post('/auth/2fa/enable', data);

// 禁用2FA
export const disable2FA = (data: Enable2FADto) =>
  api.post('/auth/2fa/disable', data);

// 2FA登录验证
export const verify2FA = (data: {
  username: string;
  password: string;
  captcha: string;
  captchaId: string;
  twoFactorToken: string;
}) =>
  api.post<{ token: string; user: any }>('/auth/2fa/verify', data);
