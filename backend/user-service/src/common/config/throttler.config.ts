import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * 限流配置
 *
 * 说明：
 * - ttl: 时间窗口（秒）
 * - limit: 时间窗口内最大请求次数
 *
 * 示例：
 * - 默认：60秒内最多100次请求
 * - 登录：60秒内最多5次请求
 * - 注册：60秒内最多3次请求
 */
export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      name: 'default',
      ttl: 60000, // 60 秒
      limit: 100, // 100 次请求
    },
    {
      name: 'strict',
      ttl: 60000, // 60 秒
      limit: 10, // 10 次请求（严格模式）
    },
  ],
};

/**
 * 特定路由的限流装饰器配置
 */
export const ThrottlerLimits = {
  /**
   * 登录接口：60秒内最多5次
   * 防止暴力破解
   */
  LOGIN: {
    name: 'login',
    ttl: 60000,
    limit: 5,
  },

  /**
   * 注册接口：60秒内最多3次
   * 防止恶意注册
   */
  REGISTER: {
    name: 'register',
    ttl: 60000,
    limit: 3,
  },

  /**
   * 发送验证码：60秒内最多1次
   * 防止短信轰炸
   */
  SEND_CODE: {
    name: 'send-code',
    ttl: 60000,
    limit: 1,
  },

  /**
   * 密码重置：300秒（5分钟）内最多3次
   */
  RESET_PASSWORD: {
    name: 'reset-password',
    ttl: 300000,
    limit: 3,
  },

  /**
   * 上传接口：60秒内最多20次
   */
  UPLOAD: {
    name: 'upload',
    ttl: 60000,
    limit: 20,
  },

  /**
   * 查询接口：60秒内最多200次
   * （相对宽松）
   */
  QUERY: {
    name: 'query',
    ttl: 60000,
    limit: 200,
  },

  /**
   * 公共接口：60秒内最多500次
   * （非常宽松）
   */
  PUBLIC: {
    name: 'public',
    ttl: 60000,
    limit: 500,
  },
};

/**
 * IP 黑名单
 * 这些 IP 将被完全阻止访问
 */
export const ipBlacklist: string[] = [
  // 示例：
  // '192.168.1.100',
  // '10.0.0.50',
];

/**
 * IP 白名单
 * 这些 IP 不受限流限制
 */
export const ipWhitelist: string[] = [
  '127.0.0.1',
  '::1',
  'localhost',
  // 添加受信任的内网 IP
  // '192.168.1.0/24',
];
