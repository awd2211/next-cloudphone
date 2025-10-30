import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * JWT 密钥最小长度要求（256 位 = 32 字节）
 */
const MIN_SECRET_LENGTH = 32;

/**
 * JWT 配置选项
 */
export interface JwtConfigOptions {
  /**
   * JWT 密钥（主密钥）
   * 生产环境必须提供，且长度不少于 32 字符
   */
  secret: string;

  /**
   * JWT 过期时间（默认 1 小时）
   */
  expiresIn?: string;

  /**
   * JWT 刷新令牌过期时间（默认 7 天）
   */
  refreshExpiresIn?: string;

  /**
   * 旧的 JWT 密钥（用于密钥轮换）
   * 在密钥轮换期间，同时接受新旧密钥签名的 Token
   */
  oldSecret?: string;

  /**
   * JWT 发行者
   */
  issuer?: string;

  /**
   * JWT 受众
   */
  audience?: string;

  /**
   * 是否为开发环境
   */
  isDevelopment?: boolean;
}

/**
 * 🔒 JWT 配置工厂
 * 提供安全的 JWT 配置，支持密钥轮换和强制密钥强度验证
 */
export class JwtConfigFactory {
  /**
   * 验证 JWT Secret 的强度
   * @param secret JWT 密钥
   * @param isDevelopment 是否为开发环境
   * @throws Error 如果密钥不符合要求
   */
  static validateSecretStrength(
    secret: string,
    isDevelopment: boolean = false,
  ): void {
    // 生产环境严格检查
    if (!isDevelopment) {
      // 1. 检查密钥长度
      if (!secret || secret.length < MIN_SECRET_LENGTH) {
        throw new Error(
          `JWT_SECRET 长度不足！生产环境要求至少 ${MIN_SECRET_LENGTH} 字符（当前: ${secret?.length || 0} 字符）`,
        );
      }

      // 2. 检查是否使用默认弱密钥
      const weakSecrets = [
        'secret',
        'dev-secret-key-change-in-production',
        'change-me',
        'your-secret-key',
        'jwt-secret',
        'default-secret',
        '123456',
        'password',
      ];

      if (weakSecrets.some((weak) => secret.toLowerCase().includes(weak))) {
        throw new Error(
          '检测到弱 JWT_SECRET！生产环境禁止使用默认或常见密钥',
        );
      }

      // 3. 检查密钥复杂度（应包含多种字符类型）
      const hasUpperCase = /[A-Z]/.test(secret);
      const hasLowerCase = /[a-z]/.test(secret);
      const hasDigit = /[0-9]/.test(secret);
      const hasSpecialChar = /[^A-Za-z0-9]/.test(secret);

      const complexity =
        (hasUpperCase ? 1 : 0) +
        (hasLowerCase ? 1 : 0) +
        (hasDigit ? 1 : 0) +
        (hasSpecialChar ? 1 : 0);

      if (complexity < 3) {
        throw new Error(
          'JWT_SECRET 复杂度不足！应包含大小写字母、数字和特殊字符中的至少 3 种',
        );
      }
    } else {
      // 开发环境：警告但不阻止
      if (!secret || secret.length < MIN_SECRET_LENGTH) {
        console.warn(
          `⚠️  警告: JWT_SECRET 长度不足（${secret?.length || 0} 字符），建议至少 ${MIN_SECRET_LENGTH} 字符`,
        );
      }
    }
  }

  /**
   * 生成强密钥（用于开发环境或初始化）
   * @returns 随机生成的 64 字节十六进制字符串
   */
  static generateStrongSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * 从环境变量创建 JWT 配置
   * @param configService NestJS ConfigService
   * @returns JWT 配置对象
   */
  static createJwtConfig(configService: ConfigService): JwtConfigOptions {
    const nodeEnv = configService.get('NODE_ENV', 'development');
    const isDevelopment = nodeEnv === 'development' || nodeEnv === 'test';

    // 🔒 获取 JWT_SECRET（生产环境必须提供）
    let secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      if (isDevelopment) {
        // 开发环境：生成临时密钥并警告
        secret = this.generateStrongSecret();
        console.warn(`
⚠️⚠️⚠️  安全警告  ⚠️⚠️⚠️
未设置 JWT_SECRET 环境变量！
已生成临时密钥（仅用于开发环境）：
${secret}

生产环境部署前请务必设置强密钥：
export JWT_SECRET="$(openssl rand -hex 64)"
        `);
      } else {
        // 生产环境：强制要求提供密钥
        throw new Error(`
🔴 致命错误：生产环境未设置 JWT_SECRET！

请设置环境变量：
export JWT_SECRET="$(openssl rand -hex 64)"

或在 .env 文件中配置：
JWT_SECRET=your-strong-secret-key-here
        `);
      }
    }

    // 🔒 验证密钥强度
    this.validateSecretStrength(secret, isDevelopment);

    // 获取旧密钥（用于密钥轮换）
    const oldSecret = configService.get<string>('JWT_OLD_SECRET');
    if (oldSecret) {
      console.log('🔄 检测到旧 JWT 密钥，启用密钥轮换模式');
      // 验证旧密钥强度（较宽松的要求）
      if (oldSecret.length < 16) {
        console.warn('⚠️  警告: 旧 JWT 密钥长度过短，可能存在安全风险');
      }
    }

    return {
      secret,
      expiresIn: configService.get('JWT_EXPIRES_IN', '1h'),
      refreshExpiresIn: configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      oldSecret,
      issuer: configService.get('JWT_ISSUER', 'cloudphone-platform'),
      audience: configService.get('JWT_AUDIENCE', 'cloudphone-users'),
      isDevelopment,
    };
  }

  /**
   * 获取 Passport JWT 策略配置
   * @param configService NestJS ConfigService
   * @returns Passport JWT 策略配置对象
   */
  static getPassportJwtConfig(configService: ConfigService) {
    const jwtConfig = this.createJwtConfig(configService);

    return {
      secretOrKey: jwtConfig.secret,
      ignoreExpiration: false,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    };
  }

  /**
   * 获取 JWT 模块配置
   * @param configService NestJS ConfigService
   * @returns JWT 模块配置对象
   */
  static getJwtModuleConfig(configService: ConfigService): any {
    const jwtConfig = this.createJwtConfig(configService);

    return {
      secret: jwtConfig.secret,
      signOptions: {
        expiresIn: jwtConfig.expiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      },
    };
  }

  /**
   * 检查 Token 是否使用旧密钥签名
   * @param token JWT Token
   * @param configService NestJS ConfigService
   * @returns 如果使用旧密钥返回 true
   */
  static isTokenSignedWithOldSecret(
    token: string,
    configService: ConfigService,
  ): boolean {
    const jwtConfig = this.createJwtConfig(configService);
    if (!jwtConfig.oldSecret) {
      return false;
    }

    try {
      // 尝试使用旧密钥验证
      const jwt = require('jsonwebtoken');
      jwt.verify(token, jwtConfig.oldSecret);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 🔒 创建 JWT 配置（快捷方法）
 *
 * 使用示例：
 * ```typescript
 * import { createJwtConfig } from '@cloudphone/shared';
 *
 * // 在 AuthModule 中使用
 * JwtModule.registerAsync({
 *   imports: [ConfigModule],
 *   useFactory: (configService: ConfigService) => {
 *     return createJwtConfig(configService);
 *   },
 *   inject: [ConfigService],
 * })
 * ```
 */
export function createJwtConfig(configService: ConfigService) {
  return JwtConfigFactory.getJwtModuleConfig(configService);
}

/**
 * 🔒 生成强 JWT 密钥（CLI 工具使用）
 *
 * 使用示例：
 * ```bash
 * node -e "console.log(require('./dist/config/jwt.config').generateStrongJwtSecret())"
 * ```
 */
export function generateStrongJwtSecret(): string {
  return JwtConfigFactory.generateStrongSecret();
}
