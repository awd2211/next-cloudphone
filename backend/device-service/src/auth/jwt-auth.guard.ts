import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: Error | null, user: any, info: any) {
    // 如果认证失败，抛出 UnauthorizedException
    if (err || !user) {
      throw err || new UnauthorizedException("未授权访问，请先登录");
    }
    return user;
  }
}
