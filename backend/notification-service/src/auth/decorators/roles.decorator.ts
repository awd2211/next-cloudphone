import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * 角色装饰器 - 声明接口所需的角色
 * @param roles 角色名称数组
 * @example
 * @RequireRole('admin', 'template-manager')
 * @Post()
 * createTemplate() { ... }
 */
export const RequireRole = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Roles 装饰器 - RequireRole 的别名
 *
 * 使用示例：
 * ```typescript
 * @Roles('admin', 'template-manager')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Post()
 * createTemplate() { ... }
 * ```
 */
export const Roles = RequireRole;
