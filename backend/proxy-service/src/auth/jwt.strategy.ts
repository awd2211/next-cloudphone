import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseJwtStrategy } from '@cloudphone/shared';

/**
 * JWT 认证策略
 *
 * 继承自 @cloudphone/shared 的 BaseJwtStrategy
 * 提供统一的 JWT 验证逻辑
 */
@Injectable()
export class JwtStrategy extends BaseJwtStrategy {
  constructor(configService: ConfigService) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(configService as any);
  }
}
