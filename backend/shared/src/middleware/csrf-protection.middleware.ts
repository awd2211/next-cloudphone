import { Injectable, NestMiddleware, ForbiddenException, Logger, Optional, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * CSRF 防护配置
 */
export interface CsrfProtectionConfig {
  /**
   * 是否启用 CSRF 防护
   */
  enabled: boolean;

  /**
   * Cookie 名称
   */
  cookieName: string;

  /**
   * Header 名称
   */
  headerName: string;

  /**
   * Token 长度
   */
  tokenLength: number;

  /**
   * Token 有效期（秒）
   */
  tokenTtl: number;

  /**
   * 是否使用 Double Submit Cookie 模式
   */
  useDoubleSubmit: boolean;

  /**
   * Cookie 配置
   */
  cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
    maxAge: number;
  };

  /**
   * 需要 CSRF 保护的 HTTP 方法
   */
  protectedMethods: string[];

  /**
   * 排除的路径（正则表达式）
   */
  excludedPaths: RegExp[];
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: CsrfProtectionConfig = {
  enabled: true,
  cookieName: 'XSRF-TOKEN',
  headerName: 'X-XSRF-TOKEN',
  tokenLength: 32,
  tokenTtl: 3600, // 1 小时
  useDoubleSubmit: true,
  cookieOptions: {
    httpOnly: false, // 需要 JavaScript 读取
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 3600000, // 1 小时
  },
  protectedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  excludedPaths: [
    /^\/api\/auth\/login$/,
    /^\/api\/auth\/register$/,
    /^\/health$/,
    /^\/metrics$/,
  ],
};

/**
 * CSRF Token 存储接口
 */
interface CsrfTokenStore {
  set(key: string, value: string, ttl: number): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}

/**
 * 内存 Token 存储（仅用于开发）
 */
class MemoryCsrfTokenStore implements CsrfTokenStore {
  private store = new Map<string, { value: string; expiry: number }>();

  async set(key: string, value: string, ttl: number): Promise<void> {
    const expiry = Date.now() + ttl * 1000;
    this.store.set(key, { value, expiry });
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Redis Token 存储
 */
class RedisCsrfTokenStore implements CsrfTokenStore {
  constructor(private redis: any) {}

  async set(key: string, value: string, ttl: number): Promise<void> {
    await this.redis.setex(`csrf:${key}`, ttl, value);
  }

  async get(key: string): Promise<string | null> {
    return await this.redis.get(`csrf:${key}`);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(`csrf:${key}`);
  }
}

/**
 * CSRF 防护中间件
 *
 * 实现方式:
 * 1. Double Submit Cookie 模式（推荐）
 *    - 生成随机 token
 *    - 设置 cookie: XSRF-TOKEN=<token>
 *    - 前端从 cookie 读取 token
 *    - 前端在请求头中携带: X-XSRF-TOKEN=<token>
 *    - 后端验证 cookie 和 header 中的 token 是否一致
 *
 * 2. Stateful Token 模式
 *    - 生成 token 并存储在服务端（Redis）
 *    - 关联到用户会话
 *    - 验证时检查 token 是否存在且有效
 *
 * 使用示例:
 * ```typescript
 * // 在 app.module.ts 中使用
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(CsrfProtectionMiddleware)
 *       .forRoutes({ path: '*', method: RequestMethod.ALL });
 *   }
 * }
 *
 * // 前端使用
 * // 1. 从 cookie 读取 token
 * const csrfToken = document.cookie
 *   .split('; ')
 *   .find(row => row.startsWith('XSRF-TOKEN='))
 *   ?.split('=')[1];
 *
 * // 2. 在请求头中携带
 * axios.post('/api/data', data, {
 *   headers: {
 *     'X-XSRF-TOKEN': csrfToken
 *   }
 * });
 * ```
 */
@Injectable()
export class CsrfProtectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfProtectionMiddleware.name);
  private config: CsrfProtectionConfig;
  private tokenStore: CsrfTokenStore;

  constructor(
    @Optional() @Inject(ConfigService) 
    configService?: ConfigService,
    @Optional() 
    redis?: any,
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      enabled: configService?.get<boolean>('CSRF_PROTECTION_ENABLED', true) ?? true,
      useDoubleSubmit: configService?.get<boolean>('CSRF_USE_DOUBLE_SUBMIT', true) ?? true,
      tokenTtl: configService?.get<number>('CSRF_TOKEN_TTL', 3600) ?? 3600,
    };

    // 选择存储方式
    if (this.config.useDoubleSubmit) {
      // Double Submit Cookie 不需要服务端存储
      this.tokenStore = new MemoryCsrfTokenStore();
    } else if (redis) {
      this.tokenStore = new RedisCsrfTokenStore(redis);
    } else {
      this.tokenStore = new MemoryCsrfTokenStore();
      this.logger.warn('Using memory token store. Not suitable for production!');
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    if (!this.config.enabled) {
      return next();
    }

    // 检查是否需要保护
    if (!this.shouldProtect(req)) {
      return next();
    }

    // 为 GET 请求生成新 token
    if (req.method === 'GET') {
      await this.generateToken(req, res);
      return next();
    }

    // 验证 token
    try {
      await this.verifyToken(req);
      next();
    } catch (error) {
      this.logger.warn({
        message: 'CSRF token validation failed',
        method: req.method,
        url: req.url,
        ip: req.ip,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new ForbiddenException('CSRF token validation failed');
    }
  }

  /**
   * 检查请求是否需要 CSRF 保护
   */
  private shouldProtect(req: Request): boolean {
    // 检查 HTTP 方法
    if (!this.config.protectedMethods.includes(req.method)) {
      return false;
    }

    // 检查排除路径
    const path = req.path;
    for (const pattern of this.config.excludedPaths) {
      if (pattern.test(path)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 生成 CSRF token
   */
  private async generateToken(req: Request, res: Response): Promise<void> {
    // 检查是否已有有效 token
    const existingToken = req.cookies?.[this.config.cookieName];
    if (existingToken && await this.isValidToken(existingToken, req)) {
      return;
    }

    // 生成新 token
    const token = this.createToken();

    // Double Submit Cookie 模式
    if (this.config.useDoubleSubmit) {
      // 仅设置 cookie
      res.cookie(this.config.cookieName, token, this.config.cookieOptions);
    } else {
      // Stateful 模式: 存储到服务端
      const sessionId = this.getSessionId(req);
      await this.tokenStore.set(sessionId, token, this.config.tokenTtl);
      res.cookie(this.config.cookieName, token, this.config.cookieOptions);
    }
  }

  /**
   * 验证 CSRF token
   */
  private async verifyToken(req: Request): Promise<void> {
    const cookieToken = req.cookies?.[this.config.cookieName];
    const headerToken = req.headers[this.config.headerName.toLowerCase()] as string;

    if (!cookieToken) {
      throw new Error('CSRF token missing in cookie');
    }

    if (!headerToken) {
      throw new Error('CSRF token missing in header');
    }

    if (this.config.useDoubleSubmit) {
      // Double Submit Cookie: 比较 cookie 和 header 中的 token
      if (!this.constantTimeCompare(cookieToken, headerToken)) {
        throw new Error('CSRF token mismatch');
      }
    } else {
      // Stateful: 验证 token 是否存在于服务端
      const sessionId = this.getSessionId(req);
      const storedToken = await this.tokenStore.get(sessionId);

      if (!storedToken) {
        throw new Error('CSRF token not found or expired');
      }

      if (!this.constantTimeCompare(storedToken, headerToken)) {
        throw new Error('CSRF token mismatch');
      }
    }
  }

  /**
   * 检查 token 是否有效
   */
  private async isValidToken(token: string, req: Request): Promise<boolean> {
    if (this.config.useDoubleSubmit) {
      return token.length === this.config.tokenLength * 2;
    } else {
      const sessionId = this.getSessionId(req);
      const storedToken = await this.tokenStore.get(sessionId);
      return storedToken === token;
    }
  }

  /**
   * 创建随机 token
   */
  private createToken(): string {
    return crypto.randomBytes(this.config.tokenLength).toString('hex');
  }

  /**
   * 获取会话 ID
   */
  private getSessionId(req: Request): string {
    // 从 JWT 或会话中获取用户 ID
    const user = (req as any).user;
    if (user?.id) {
      return `user:${user.id}`;
    }

    // 使用会话 ID
    const sessionId = (req as any).sessionID;
    if (sessionId) {
      return `session:${sessionId}`;
    }

    // 使用 IP 作为后备
    return `ip:${req.ip}`;
  }

  /**
   * 常量时间比较（防止时序攻击）
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

/**
 * CSRF 装饰器 - 标记需要 CSRF 保护的路由
 */
export const CsrfProtected = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('csrf:protected', true, descriptor.value);
    return descriptor;
  };
};

/**
 * CSRF 装饰器 - 标记排除 CSRF 保护的路由
 */
export const CsrfExempt = () => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('csrf:exempt', true, descriptor.value);
    return descriptor;
  };
};
