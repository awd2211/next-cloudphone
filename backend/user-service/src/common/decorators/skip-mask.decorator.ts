import { SetMetadata } from '@nestjs/common';

/**
 * 跳过敏感数据脱敏装饰器
 * 用于需要返回完整数据的管理员接口
 *
 * @example
 * @SkipMask('email') // 跳过邮箱脱敏
 * @SkipMask(['email', 'phone']) // 跳过多个字段的脱敏
 * @SkipMask() // 跳过所有脱敏
 */
export const SKIP_MASK_KEY = 'skip_mask';
export const SkipMask = (fields?: string | string[]) => {
  return SetMetadata(SKIP_MASK_KEY, fields);
};
