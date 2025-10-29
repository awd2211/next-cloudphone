import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * 从请求中提取用户信息的装饰器
 *
 * 使用方式:
 * @Get()
 * async getProfile(@User() user) {
 *   return user;
 * }
 *
 * 或提取特定字段:
 * @Get()
 * async getUserId(@User('id') userId: string) {
 *   return userId;
 * }
 */
export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
