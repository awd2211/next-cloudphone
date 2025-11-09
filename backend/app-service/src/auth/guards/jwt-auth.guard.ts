import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT 认证守卫
 *
 * 用于保护需要认证的端点
 * 必须在 PermissionsGuard 之前执行，以设置 request.user
 *
 * 使用方法：
 * ```typescript
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Get('protected')
 * async protectedRoute() { ... }
 * ```
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 检查是否标记为公开端点
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * 处理认证结果
   * 确保返回正确的 401 HTTP 状态码而非 500
   */
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('未授权访问，请先登录');
    }
    return user;
  }
}
