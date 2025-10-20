import request from '@/utils/request';

export interface TwoFactorSecret {
  secret: string;
  qrCode: string;
  otpauthUrl?: string;
}

export interface Enable2FADto {
  token: string;
}

export interface Verify2FADto {
  username: string;
  password: string;
  captcha: string;
  captchaId: string;
  twoFactorToken: string;
}

/**
 * 生成2FA密钥和二维码
 */
export const generate2FASecret = () => {
  return request.get<TwoFactorSecret>('/auth/2fa/generate');
};

/**
 * 启用2FA
 */
export const enable2FA = (data: Enable2FADto) => {
  return request.post('/auth/2fa/enable', data);
};

/**
 * 禁用2FA
 */
export const disable2FA = (data: Enable2FADto) => {
  return request.post('/auth/2fa/disable', data);
};

/**
 * 2FA登录验证
 */
export const verify2FA = (data: Verify2FADto) => {
  return request.post<{ token: string; user: any }>('/auth/2fa/verify', data);
};
