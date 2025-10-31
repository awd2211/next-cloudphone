import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';

/**
 * 节流配置
 */
export interface ThrottleOptions {
  /**
   * 节流时间窗口（毫秒）
   */
  ttl: number;

  /**
   * 自定义错误消息
   */
  message?: string;

  /**
   * 是否基于用户ID节流（默认：true）
   */
  perUser?: boolean;
}

/**
 * 节流装饰器
 * 防止在指定时间窗口内重复请求
 *
 * @example
 * // 防止5秒内重复请求
 * @Throttle({ ttl: 5000 })
 * @Post('create')
 * async create() { ... }
 *
 * @example
 * // 防止10秒内重复提交（基于IP）
 * @Throttle({ ttl: 10000, perUser: false })
 * @Post('submit')
 * async submit() { ... }
 */
export const Throttle = (options: ThrottleOptions): MethodDecorator => {
  return SetMetadata(THROTTLE_KEY, options);
};

/**
 * 预定义的节流策略
 */
export class ThrottlePresets {
  /**
   * 严格节流：10秒
   */
  static STRICT = { ttl: 10000 };

  /**
   * 标准节流：5秒
   */
  static STANDARD = { ttl: 5000 };

  /**
   * 宽松节流：2秒
   */
  static RELAXED = { ttl: 2000 };

  /**
   * 表单提交节流：15秒
   */
  static FORM_SUBMIT = { ttl: 15000 };

  /**
   * 创建操作节流：5秒
   */
  static CREATE_OPERATION = { ttl: 5000 };

  /**
   * 删除操作节流：3秒
   */
  static DELETE_OPERATION = { ttl: 3000 };
}
