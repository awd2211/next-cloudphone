import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT 认证守卫
 *
 * 使用 Passport JWT 策略验证请求中的 token
 * 支持 @Public() 装饰器标记的公开端点
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * 判断是否可以激活路由
   *
   * @param context - 执行上下文
   * @returns 是否允许访问
   */
  canActivate(context: ExecutionContext) {
    // 检查是否为公开端点
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 执行 JWT 验证
    return super.canActivate(context);
  }

  /**
   * 处理认证结果
   *
   * @param err - 认证过程中的错误
   * @param user - 认证成功后的用户对象
   * @returns 用户对象
   * @throws UnauthorizedException 当认证失败时
   */
  handleRequest(err: any, user: any) {
    // 如果有错误或者没有用户信息，抛出401异常
    if (err || !user) {
      throw err || new UnauthorizedException('未授权访问');
    }
    return user;
  }
}
