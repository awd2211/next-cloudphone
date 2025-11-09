import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BasePermissionsGuard } from '@cloudphone/shared';

/**
 * 权限守卫
 *
 * 继承自 @cloudphone/shared 的 BasePermissionsGuard
 * 提供统一的权限检查逻辑
 */
@Injectable()
export class PermissionsGuard extends BasePermissionsGuard {
  constructor(reflector: Reflector) {
    super(reflector);
  }
}
