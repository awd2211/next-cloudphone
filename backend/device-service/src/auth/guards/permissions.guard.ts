import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BasePermissionsGuard } from '@cloudphone/shared';

/**
 * Device Service 权限守卫
 *
 * 继承自 @cloudphone/shared 的 BasePermissionsGuard
 * 提供统一的权限检查逻辑
 */
@Injectable()
export class PermissionsGuard extends BasePermissionsGuard {
  constructor(reflector: Reflector) {
    super(reflector);
  }

  // 如果需要额外的权限检查逻辑,可以重写 additionalPermissionCheck 方法
  // protected async additionalPermissionCheck(
  //   user: any,
  //   requiredPermissions: string[],
  //   context: ExecutionContext
  // ): Promise<boolean> {
  //   // 例如: 检查数据范围权限
  //   return true;
  // }
}
