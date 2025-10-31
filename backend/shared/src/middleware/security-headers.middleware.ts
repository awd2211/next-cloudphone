import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * 安全头配置
 */
export interface SecurityHeadersConfig {
  /**
   * 是否启用
   */
  enabled: boolean;

  /**
   * HSTS (HTTP Strict Transport Security)
   */
  hsts: {
    enabled: boolean;
    maxAge: number; // 秒
    includeSubDomains: boolean;
    preload: boolean;
  };

  /**
   * Content-Security-Policy
   */
  contentSecurityPolicy: {
    enabled: boolean;
    directives: Record<string, string[]>;
    reportOnly: boolean;
  };

  /**
   * X-Frame-Options
   */
  frameOptions: {
    enabled: boolean;
    action: 'DENY' | 'SAMEORIGIN' | string; // string 用于 ALLOW-FROM
  };

  /**
   * X-Content-Type-Options
   */
  noSniff: boolean;

  /**
   * X-XSS-Protection
   */
  xssProtection: {
    enabled: boolean;
    mode: 'block' | 'sanitize';
  };

  /**
   * Referrer-Policy
   */
  referrerPolicy: {
    enabled: boolean;
    policy: string;
  };

  /**
   * Permissions-Policy (原 Feature-Policy)
   */
  permissionsPolicy: {
    enabled: boolean;
    features: Record<string, string[]>;
  };

  /**
   * Cross-Origin-Opener-Policy
   */
  crossOriginOpenerPolicy: {
    enabled: boolean;
    policy: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
  };

  /**
   * Cross-Origin-Embedder-Policy
   */
  crossOriginEmbedderPolicy: {
    enabled: boolean;
    policy: 'require-corp' | 'credentialless';
  };

  /**
   * Cross-Origin-Resource-Policy
   */
  crossOriginResourcePolicy: {
    enabled: boolean;
    policy: 'same-origin' | 'same-site' | 'cross-origin';
  };
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: SecurityHeadersConfig = {
  enabled: true,

  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 年
    includeSubDomains: true,
    preload: true,
  },

  contentSecurityPolicy: {
    enabled: true,
    reportOnly: false,
    directives: {
      'default-src': ["'self'"],
      'base-uri': ["'self'"],
      'font-src': ["'self'", 'https:', 'data:'],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'object-src': ["'none'"],
      'script-src': ["'self'"],
      'script-src-attr': ["'none'"],
      'style-src': ["'self'", 'https:', "'unsafe-inline'"],
      'upgrade-insecure-requests': [],
    },
  },

  frameOptions: {
    enabled: true,
    action: 'DENY',
  },

  noSniff: true,

  xssProtection: {
    enabled: true,
    mode: 'block',
  },

  referrerPolicy: {
    enabled: true,
    policy: 'no-referrer',
  },

  permissionsPolicy: {
    enabled: true,
    features: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: [],
    },
  },

  crossOriginOpenerPolicy: {
    enabled: true,
    policy: 'same-origin',
  },

  crossOriginEmbedderPolicy: {
    enabled: false, // 可能影响第三方资源加载
    policy: 'require-corp',
  },

  crossOriginResourcePolicy: {
    enabled: true,
    policy: 'same-origin',
  },
};

/**
 * HTTP 安全头中间件
 *
 * 功能:
 * 1. HSTS - 强制 HTTPS
 * 2. CSP - 内容安全策略
 * 3. X-Frame-Options - 防止点击劫持
 * 4. X-Content-Type-Options - 防止 MIME 类型嗅探
 * 5. X-XSS-Protection - XSS 过滤器
 * 6. Referrer-Policy - 引用策略
 * 7. Permissions-Policy - 功能权限策略
 * 8. Cross-Origin 策略
 *
 * 使用示例:
 * ```typescript
 * // 在 app.module.ts 中使用
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(SecurityHeadersMiddleware)
 *       .forRoutes({ path: '*', method: RequestMethod.ALL });
 *   }
 * }
 * ```
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private config: SecurityHeadersConfig;

  constructor(configService?: ConfigService) {
    this.config = this.loadConfig(configService);
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (!this.config.enabled) {
      return next();
    }

    // HSTS
    if (this.config.hsts.enabled) {
      this.setHsts(res);
    }

    // Content-Security-Policy
    if (this.config.contentSecurityPolicy.enabled) {
      this.setContentSecurityPolicy(res);
    }

    // X-Frame-Options
    if (this.config.frameOptions.enabled) {
      res.setHeader('X-Frame-Options', this.config.frameOptions.action);
    }

    // X-Content-Type-Options
    if (this.config.noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection
    if (this.config.xssProtection.enabled) {
      const value = this.config.xssProtection.mode === 'block' ? '1; mode=block' : '1';
      res.setHeader('X-XSS-Protection', value);
    }

    // Referrer-Policy
    if (this.config.referrerPolicy.enabled) {
      res.setHeader('Referrer-Policy', this.config.referrerPolicy.policy);
    }

    // Permissions-Policy
    if (this.config.permissionsPolicy.enabled) {
      this.setPermissionsPolicy(res);
    }

    // Cross-Origin-Opener-Policy
    if (this.config.crossOriginOpenerPolicy.enabled) {
      res.setHeader('Cross-Origin-Opener-Policy', this.config.crossOriginOpenerPolicy.policy);
    }

    // Cross-Origin-Embedder-Policy
    if (this.config.crossOriginEmbedderPolicy.enabled) {
      res.setHeader('Cross-Origin-Embedder-Policy', this.config.crossOriginEmbedderPolicy.policy);
    }

    // Cross-Origin-Resource-Policy
    if (this.config.crossOriginResourcePolicy.enabled) {
      res.setHeader('Cross-Origin-Resource-Policy', this.config.crossOriginResourcePolicy.policy);
    }

    next();
  }

  /**
   * 设置 HSTS 头
   */
  private setHsts(res: Response): void {
    const parts: string[] = [`max-age=${this.config.hsts.maxAge}`];

    if (this.config.hsts.includeSubDomains) {
      parts.push('includeSubDomains');
    }

    if (this.config.hsts.preload) {
      parts.push('preload');
    }

    res.setHeader('Strict-Transport-Security', parts.join('; '));
  }

  /**
   * 设置 Content-Security-Policy 头
   */
  private setContentSecurityPolicy(res: Response): void {
    const directives = this.config.contentSecurityPolicy.directives;
    const policy = Object.entries(directives)
      .map(([key, values]) => {
        if (values.length === 0) {
          return key;
        }
        return `${key} ${values.join(' ')}`;
      })
      .join('; ');

    const headerName = this.config.contentSecurityPolicy.reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';

    res.setHeader(headerName, policy);
  }

  /**
   * 设置 Permissions-Policy 头
   */
  private setPermissionsPolicy(res: Response): void {
    const features = this.config.permissionsPolicy.features;
    const policy = Object.entries(features)
      .map(([feature, origins]) => {
        if (origins.length === 0) {
          return `${feature}=()`;
        }
        return `${feature}=(${origins.join(' ')})`;
      })
      .join(', ');

    res.setHeader('Permissions-Policy', policy);
  }

  /**
   * 从环境变量加载配置
   */
  private loadConfig(configService?: ConfigService): SecurityHeadersConfig {
    if (!configService) {
      return DEFAULT_CONFIG;
    }

    return {
      enabled: configService.get<boolean>('SECURITY_HEADERS_ENABLED', true) ?? true,

      hsts: {
        enabled: configService.get<boolean>('HSTS_ENABLED', true) ?? true,
        maxAge: configService.get<number>('HSTS_MAX_AGE', 31536000) ?? 31536000,
        includeSubDomains: configService.get<boolean>('HSTS_INCLUDE_SUBDOMAINS', true) ?? true,
        preload: configService.get<boolean>('HSTS_PRELOAD', true) ?? true,
      },

      contentSecurityPolicy: {
        enabled: configService.get<boolean>('CSP_ENABLED', true) ?? true,
        reportOnly: configService.get<boolean>('CSP_REPORT_ONLY', false) ?? false,
        directives: DEFAULT_CONFIG.contentSecurityPolicy.directives,
      },

      frameOptions: {
        enabled: configService.get<boolean>('FRAME_OPTIONS_ENABLED', true) ?? true,
        action: (configService.get<string>('FRAME_OPTIONS_ACTION', 'DENY') ?? 'DENY') as any,
      },

      noSniff: configService.get<boolean>('NO_SNIFF_ENABLED', true) ?? true,

      xssProtection: {
        enabled: configService.get<boolean>('XSS_PROTECTION_ENABLED', true) ?? true,
        mode: (configService.get<string>('XSS_PROTECTION_MODE', 'block') ?? 'block') as any,
      },

      referrerPolicy: {
        enabled: configService.get<boolean>('REFERRER_POLICY_ENABLED', true) ?? true,
        policy: configService.get<string>('REFERRER_POLICY', 'no-referrer') ?? 'no-referrer',
      },

      permissionsPolicy: {
        enabled: configService.get<boolean>('PERMISSIONS_POLICY_ENABLED', true) ?? true,
        features: DEFAULT_CONFIG.permissionsPolicy.features,
      },

      crossOriginOpenerPolicy: {
        enabled: configService.get<boolean>('COOP_ENABLED', true) ?? true,
        policy: (configService.get<string>('COOP_POLICY', 'same-origin') ?? 'same-origin') as any,
      },

      crossOriginEmbedderPolicy: {
        enabled: configService.get<boolean>('COEP_ENABLED', false) ?? false,
        policy: (configService.get<string>('COEP_POLICY', 'require-corp') ?? 'require-corp') as any,
      },

      crossOriginResourcePolicy: {
        enabled: configService.get<boolean>('CORP_ENABLED', true) ?? true,
        policy: (configService.get<string>('CORP_POLICY', 'same-origin') ?? 'same-origin') as any,
      },
    };
  }
}

/**
 * 开发环境安全头配置（更宽松）
 */
@Injectable()
export class DevelopmentSecurityHeadersMiddleware extends SecurityHeadersMiddleware {
  constructor(configService?: ConfigService) {
    super(configService);

    // 允许 unsafe-eval 和 unsafe-inline（方便开发）
    (this as any).config.contentSecurityPolicy.directives = {
      ...DEFAULT_CONFIG.contentSecurityPolicy.directives,
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'"],
    };

    // 开发环境不强制 HTTPS
    (this as any).config.hsts.enabled = false;
  }
}

/**
 * 生产环境安全头配置（严格）
 */
@Injectable()
export class ProductionSecurityHeadersMiddleware extends SecurityHeadersMiddleware {
  constructor(configService?: ConfigService) {
    super(configService);

    // 启用更严格的 CSP
    (this as any).config.contentSecurityPolicy.directives = {
      'default-src': ["'self'"],
      'base-uri': ["'self'"],
      'font-src': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'img-src': ["'self'", 'data:'],
      'object-src': ["'none'"],
      'script-src': ["'self'"],
      'script-src-attr': ["'none'"],
      'style-src': ["'self'"],
      'upgrade-insecure-requests': [],
      'block-all-mixed-content': [],
    };

    // 启用所有 Cross-Origin 策略
    (this as any).config.crossOriginEmbedderPolicy.enabled = true;
  }
}
