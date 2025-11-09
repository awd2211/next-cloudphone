import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseJwtStrategy } from '@cloudphone/shared';

/**
 * Device Service JWT 认证策略
 *
 * 继承自 @cloudphone/shared 的 BaseJwtStrategy
 * 提供统一的 JWT 验证逻辑
 */
@Injectable()
export class JwtStrategy extends BaseJwtStrategy {
  constructor(configService: ConfigService) {
    super(configService);
  }

  // 如果需要额外的验证逻辑,可以重写 additionalValidation 方法
  // protected async additionalValidation(user: ValidatedUser): Promise<void> {
  //   // 例如: 检查用户是否被禁用
  // }
}
