import { applyDecorators } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';

/**
 * 跳过限流检查
 * 用于不需要限流的公开接口
 */
export const NoThrottle = () => SkipThrottle();

/**
 * 登录接口限流
 * 60秒内最多5次请求
 */
export const LoginThrottle = () =>
  Throttle({
    default: {
      ttl: 60000,  // 60秒
      limit: 5,    // 5次
    },
  });

/**
 * 注册接口限流
 * 60秒内最多3次请求
 */
export const RegisterThrottle = () =>
  Throttle({
    default: {
      ttl: 60000,  // 60秒
      limit: 3,    // 3次
    },
  });

/**
 * 发送验证码限流
 * 60秒内最多1次
 */
export const SendCodeThrottle = () =>
  Throttle({
    default: {
      ttl: 60000,  // 60秒
      limit: 1,    // 1次
    },
  });

/**
 * 密码重置限流
 * 300秒（5分钟）内最多3次
 */
export const ResetPasswordThrottle = () =>
  Throttle({
    default: {
      ttl: 300000,  // 300秒
      limit: 3,     // 3次
    },
  });

/**
 * 上传接口限流
 * 60秒内最多20次
 */
export const UploadThrottle = () =>
  Throttle({
    default: {
      ttl: 60000,  // 60秒
      limit: 20,   // 20次
    },
  });

/**
 * 查询接口限流（宽松）
 * 60秒内最多200次
 */
export const QueryThrottle = () =>
  Throttle({
    default: {
      ttl: 60000,  // 60秒
      limit: 200,  // 200次
    },
  });

/**
 * 公共接口限流（非常宽松）
 * 60秒内最多500次
 */
export const PublicThrottle = () =>
  Throttle({
    default: {
      ttl: 60000,  // 60秒
      limit: 500,  // 500次
    },
  });

/**
 * 严格限流
 * 60秒内最多10次
 */
export const StrictThrottle = () =>
  Throttle({
    default: {
      ttl: 60000,  // 60秒
      limit: 10,   // 10次
    },
  });

/**
 * 自定义限流
 */
export const CustomThrottle = (ttl: number, limit: number) =>
  Throttle({
    default: {
      ttl,
      limit,
    },
  });
