/**
 * 社交登录服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { User } from '@/types';

/**
 * 社交登录类型
 */
export type SocialProvider = 'google' | 'facebook' | 'twitter' | 'github' | 'wechat';

/**
 * 社交登录响应
 */
export interface SocialAuthResponse {
  token: string;
  user: User;
  isNewUser?: boolean; // 是否是新用户（首次通过社交账号登录）
}

/**
 * 社交登录配置
 */
export interface SocialAuthConfig {
  provider: SocialProvider;
  clientId: string;
  redirectUri: string;
  scope?: string[];
}

/**
 * 获取社交登录授权 URL
 * @param provider 社交平台提供商
 */
export const getSocialAuthUrl = (provider: SocialProvider) =>
  api.get<{ authUrl: string }>(`/auth/social/${provider}/url`);

/**
 * 处理社交登录回调
 * @param provider 社交平台提供商
 * @param code 授权码
 * @param state 状态参数
 */
export interface SocialAuthCallbackDto {
  code: string;
  state?: string;
}

export const handleSocialAuthCallback = (provider: SocialProvider, data: SocialAuthCallbackDto) =>
  api.post<SocialAuthResponse>(`/auth/social/${provider}/callback`, data);

/**
 * 绑定社交账号
 * @param provider 社交平台提供商
 * @param code 授权码
 */
export const bindSocialAccount = (provider: SocialProvider, code: string) =>
  api.post(`/auth/social/${provider}/bind`, { code });

/**
 * 解绑社交账号
 * @param provider 社交平台提供商
 */
export const unbindSocialAccount = (provider: SocialProvider) =>
  api.delete(`/auth/social/${provider}/unbind`);

/**
 * 获取已绑定的社交账号列表
 */
export interface BoundSocialAccount {
  provider: SocialProvider;
  providerId: string;
  email?: string;
  displayName?: string;
  avatar?: string;
  boundAt: string;
}

export const getBoundSocialAccounts = () =>
  api.get<BoundSocialAccount[]>('/auth/social/bound');

/**
 * 客户端社交登录配置
 * 这些配置通常存储在环境变量中
 */
export const SOCIAL_AUTH_CONFIG: Record<SocialProvider, Partial<SocialAuthConfig>> = {
  google: {
    provider: 'google',
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/auth/callback/google`,
    scope: ['email', 'profile'],
  },
  facebook: {
    provider: 'facebook',
    clientId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
    redirectUri: `${window.location.origin}/auth/callback/facebook`,
    scope: ['email', 'public_profile'],
  },
  twitter: {
    provider: 'twitter',
    clientId: import.meta.env.VITE_TWITTER_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/auth/callback/twitter`,
    scope: ['tweet.read', 'users.read'],
  },
  github: {
    provider: 'github',
    clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
    redirectUri: `${window.location.origin}/auth/callback/github`,
    scope: ['read:user', 'user:email'],
  },
  wechat: {
    provider: 'wechat',
    clientId: import.meta.env.VITE_WECHAT_APP_ID || '',
    redirectUri: `${window.location.origin}/auth/callback/wechat`,
    scope: ['snsapi_login'],
  },
};

/**
 * 启动社交登录流程
 * @param provider 社交平台提供商
 */
export const initiateSocialLogin = async (provider: SocialProvider) => {
  try {
    // 从后端获取授权 URL（推荐方式，由后端生成以确保安全）
    const { authUrl } = await getSocialAuthUrl(provider);

    // 打开社交登录授权页面
    window.location.href = authUrl;
  } catch (error) {
    console.error(`Failed to initiate ${provider} login:`, error);
    throw error;
  }
};

/**
 * 在新窗口中打开社交登录（可选方案）
 * @param provider 社交平台提供商
 */
export const openSocialLoginPopup = async (provider: SocialProvider): Promise<SocialAuthResponse> => {
  const { authUrl } = await getSocialAuthUrl(provider);

  // 打开弹窗
  const width = 600;
  const height = 700;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  const popup = window.open(
    authUrl,
    `${provider}_login`,
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
  );

  // 返回 Promise 等待登录完成
  return new Promise<SocialAuthResponse>((resolve, reject) => {
    // 监听来自弹窗的消息
    const messageHandler = (event: MessageEvent) => {
      // 验证消息来源
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'social_auth_success' && event.data?.response) {
        cleanup();
        resolve(event.data.response as SocialAuthResponse);
      } else if (event.data?.type === 'social_auth_error') {
        cleanup();
        reject(new Error(event.data.error || 'Social login failed'));
      }
    };

    window.addEventListener('message', messageHandler);

    const cleanup = () => {
      window.removeEventListener('message', messageHandler);
      clearInterval(checkInterval);
    };

    const checkInterval = setInterval(() => {
      try {
        // 检查弹窗是否关闭
        if (popup?.closed) {
          cleanup();
          reject(new Error('Login popup was closed'));
          return;
        }
      } catch (e) {
        // 跨域访问会抛出异常，忽略
      }
    }, 500);

    // 30秒超时
    setTimeout(() => {
      cleanup();
      if (popup && !popup.closed) {
        popup.close();
      }
      reject(new Error('Login timeout'));
    }, 30000);
  });
};
