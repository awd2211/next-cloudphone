import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from './api-keys.service';

export const API_KEY_AUTH = 'api-key-auth';
export const API_SCOPES_KEY = 'api-scopes';

/**
 * API 密钥认证守卫
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(
    private readonly apiKeysService: ApiKeysService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 从请求头获取 API 密钥
    const apiKeyHeader = request.headers['x-api-key'] || request.headers['authorization'];

    if (!apiKeyHeader) {
      throw new UnauthorizedException('缺少 API 密钥');
    }

    // 提取密钥（支持 Bearer 格式）
    const apiKeySecret = apiKeyHeader.startsWith('Bearer ')
      ? apiKeyHeader.substring(7)
      : apiKeyHeader;

    // 验证密钥
    const apiKey = await this.apiKeysService.validateApiKey(apiKeySecret);

    if (!apiKey) {
      throw new UnauthorizedException('无效或已过期的 API 密钥');
    }

    // 检查所需权限
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(API_SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredScopes && requiredScopes.length > 0) {
      const hasRequiredScopes = requiredScopes.every((scope) => apiKey.hasScopePattern(scope));

      if (!hasRequiredScopes) {
        this.logger.warn(
          `API 密钥权限不足 - 需要: ${requiredScopes.join(', ')}, 拥有: ${apiKey.scopes.join(', ')}`
        );
        throw new UnauthorizedException('API 密钥权限不足');
      }
    }

    // 将 API 密钥和用户信息注入到请求对象
    request.apiKey = apiKey;
    request.user = apiKey.user;

    // 记录 IP 地址
    apiKey.lastUsedIp = request.ip;

    return true;
  }
}

/**
 * API 权限装饰器
 */
export const ApiScopes = (...scopes: string[]) => Reflect.metadata(API_SCOPES_KEY, scopes);
