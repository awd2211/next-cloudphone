import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  PERMISSIONS_KEY,
  PermissionRequirement,
  PermissionOperator,
} from "../decorators/permissions.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const permissionRequirement =
      this.reflector.getAllAndOverride<PermissionRequirement>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (
      !permissionRequirement ||
      permissionRequirement.permissions.length === 0
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("用户未认证");
    }

    // 从用户对象中获取权限
    const userPermissions = user.permissions || [];
    const requiredPermissions = permissionRequirement.permissions;
    const operator = permissionRequirement.operator || PermissionOperator.AND;

    let hasPermission: boolean;

    if (operator === PermissionOperator.OR) {
      hasPermission = requiredPermissions.some((permission) =>
        userPermissions.includes(permission),
      );
    } else {
      hasPermission = requiredPermissions.every((permission) =>
        userPermissions.includes(permission),
      );
    }

    if (!hasPermission) {
      const operatorText = operator === PermissionOperator.OR ? "任一" : "所有";
      throw new ForbiddenException(
        `需要${operatorText}权限: ${requiredPermissions.join(", ")}`,
      );
    }

    return true;
  }
}
