import { SetMetadata } from '@nestjs/common';

/**
 * Roles 装饰器
 *
 * 用于标记需要特定角色的端点
 *
 * @param roles 允许访问的角色列表
 *
 * 使用示例：
 * ```typescript
 * @Roles('admin', 'template-manager')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Post()
 * createTemplate() { ... }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
