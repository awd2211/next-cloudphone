import { SetMetadata } from '@nestjs/common';

/**
 * Public 装饰器
 *
 * 用于标记公开端点（不需要认证）
 *
 * 使用示例：
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() { ... }
 * ```
 */
export const Public = () => SetMetadata('isPublic', true);
