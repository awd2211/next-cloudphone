import { SetMetadata } from '@nestjs/common';

/**
 * 公开端点元数据键
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 公开端点装饰器
 *
 * 用于标记不需要认证的端点
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * getHealth() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
