import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import sanitizeHtml from 'sanitize-html';

/**
 * XSS 防护配置
 */
export interface XssProtectionConfig {
  /**
   * 是否启用 XSS 防护
   */
  enabled: boolean;

  /**
   * 是否自动清理请求体
   */
  sanitizeBody: boolean;

  /**
   * 是否自动清理查询参数
   */
  sanitizeQuery: boolean;

  /**
   * 是否自动清理路径参数
   */
  sanitizeParams: boolean;

  /**
   * 允许的 HTML 标签
   */
  allowedTags: string[];

  /**
   * 允许的 HTML 属性
   */
  allowedAttributes: Record<string, string[]>;

  /**
   * 是否设置 X-XSS-Protection 响应头
   */
  setXssProtectionHeader: boolean;

  /**
   * 是否设置 Content-Security-Policy 响应头
   */
  setContentSecurityPolicy: boolean;

  /**
   * Content-Security-Policy 策略
   */
  contentSecurityPolicy: string;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: XssProtectionConfig = {
  enabled: true,
  sanitizeBody: true,
  sanitizeQuery: true,
  sanitizeParams: true,
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  allowedAttributes: {
    a: ['href', 'title'],
  },
  setXssProtectionHeader: true,
  setContentSecurityPolicy: true,
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

/**
 * XSS 检测模式
 */
const XSS_PATTERNS = [
  // Script 标签
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<script[\s\S]*?>/gi,

  // 事件处理器
  /on\w+\s*=\s*["']?[^"']*["']?/gi,

  // JavaScript 协议
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,

  // iframe
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /<iframe[\s\S]*?>/gi,

  // object/embed
  /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
  /<embed[\s\S]*?>/gi,

  // meta refresh
  /<meta[\s\S]*?http-equiv[\s\S]*?refresh[\s\S]*?>/gi,

  // base tag
  /<base[\s\S]*?>/gi,

  // link tag (可能加载恶意样式)
  /<link[\s\S]*?>/gi,

  // style tag
  /<style[\s\S]*?>[\s\S]*?<\/style>/gi,

  // import
  /@import/gi,

  // expression (IE)
  /expression\s*\(/gi,
];

/**
 * XSS 防护中间件
 *
 * 功能:
 * 1. 自动清理请求中的 XSS 攻击载荷
 * 2. 设置安全响应头
 * 3. 检测并记录 XSS 攻击尝试
 * 4. 支持白名单 HTML 标签
 *
 * 使用示例:
 * ```typescript
 * // 在 app.module.ts 中使用
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(XssProtectionMiddleware)
 *       .forRoutes({ path: '*', method: RequestMethod.ALL });
 *   }
 * }
 * ```
 */
@Injectable()
export class XssProtectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(XssProtectionMiddleware.name);
  private config: XssProtectionConfig;

  constructor(configService?: ConfigService) {
    this.config = {
      ...DEFAULT_CONFIG,
      enabled: configService?.get<boolean>('XSS_PROTECTION_ENABLED', true) ?? true,
      sanitizeBody: configService?.get<boolean>('XSS_SANITIZE_BODY', true) ?? true,
      sanitizeQuery: configService?.get<boolean>('XSS_SANITIZE_QUERY', true) ?? true,
      sanitizeParams: configService?.get<boolean>('XSS_SANITIZE_PARAMS', true) ?? true,
      setXssProtectionHeader: configService?.get<boolean>('XSS_SET_HEADER', true) ?? true,
      setContentSecurityPolicy: configService?.get<boolean>('XSS_SET_CSP', true) ?? true,
    };
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (!this.config.enabled) {
      return next();
    }

    // 设置 XSS 防护响应头
    if (this.config.setXssProtectionHeader) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // 设置 Content-Security-Policy
    if (this.config.setContentSecurityPolicy) {
      res.setHeader('Content-Security-Policy', this.config.contentSecurityPolicy);
    }

    // 清理请求数据
    let xssDetected = false;

    if (this.config.sanitizeBody && req.body) {
      const { sanitized, detected } = this.sanitizeObject(req.body);
      req.body = sanitized;
      xssDetected = xssDetected || detected;
    }

    if (this.config.sanitizeQuery && req.query) {
      const { sanitized, detected } = this.sanitizeObject(req.query);
      // Use Object.defineProperty to override readonly query property
      Object.defineProperty(req, 'query', {
        value: sanitized,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      xssDetected = xssDetected || detected;
    }

    if (this.config.sanitizeParams && req.params) {
      const { sanitized, detected } = this.sanitizeObject(req.params);
      // Use Object.defineProperty to override readonly params property
      Object.defineProperty(req, 'params', {
        value: sanitized,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      xssDetected = xssDetected || detected;
    }

    // 记录 XSS 攻击尝试
    if (xssDetected) {
      this.logger.warn({
        message: 'XSS attack attempt detected',
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });
    }

    next();
  }

  /**
   * 清理对象（递归）
   */
  private sanitizeObject(obj: any): { sanitized: any; detected: boolean } {
    let detected = false;

    if (obj === null || obj === undefined) {
      return { sanitized: obj, detected };
    }

    if (typeof obj === 'string') {
      const { sanitized, detected: stringDetected } = this.sanitizeString(obj);
      return { sanitized, detected: stringDetected };
    }

    if (Array.isArray(obj)) {
      const sanitized = obj.map((item) => {
        const result = this.sanitizeObject(item);
        if (result.detected) detected = true;
        return result.sanitized;
      });
      return { sanitized, detected };
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        // Use Object.prototype.hasOwnProperty to handle objects without prototype
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const result = this.sanitizeObject(obj[key]);
          if (result.detected) detected = true;
          sanitized[key] = result.sanitized;
        }
      }
      return { sanitized, detected };
    }

    return { sanitized: obj, detected };
  }

  /**
   * 清理字符串
   */
  private sanitizeString(str: string): { sanitized: string; detected: boolean } {
    let detected = false;

    // 检测 XSS 模式
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(str)) {
        detected = true;
        break;
      }
    }

    // 使用 sanitize-html 清理
    const sanitized = sanitizeHtml(str, {
      allowedTags: this.config.allowedTags,
      allowedAttributes: this.config.allowedAttributes,
      disallowedTagsMode: 'escape',
      allowedSchemes: ['http', 'https', 'mailto'],
      allowedSchemesByTag: {},
      allowedSchemesAppliedToAttributes: ['href', 'src'],
    });

    return { sanitized, detected: detected || sanitized !== str };
  }
}

/**
 * 严格 XSS 防护中间件
 *
 * 移除所有 HTML 标签
 */
@Injectable()
export class StrictXssProtectionMiddleware extends XssProtectionMiddleware {
  constructor(configService?: ConfigService) {
    super(configService);
    (this as any).config.allowedTags = [];
    (this as any).config.allowedAttributes = {};
  }
}

/**
 * 宽松 XSS 防护中间件
 *
 * 允许更多常见的 HTML 标签
 */
@Injectable()
export class LooseXssProtectionMiddleware extends XssProtectionMiddleware {
  constructor(configService?: ConfigService) {
    super(configService);
    (this as any).config.allowedTags = [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'hr',
      'b',
      'i',
      'em',
      'strong',
      'u',
      's',
      'strike',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'blockquote',
      'code',
      'pre',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'div',
      'span',
    ];
    (this as any).config.allowedAttributes = {
      a: ['href', 'title', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      '*': ['class', 'id'],
    };
  }
}
