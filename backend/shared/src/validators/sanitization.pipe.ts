import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';
import validator from 'validator';

// 创建共享的 Logger 实例
const logger = new Logger('SanitizationPipe');

/**
 * 输入清理配置
 */
export interface SanitizationOptions {
  /**
   * 是否启用 HTML 清理
   */
  enableHtmlSanitization?: boolean;

  /**
   * 是否启用 SQL 关键字检测
   */
  enableSqlKeywordDetection?: boolean;

  /**
   * 是否启用 NoSQL 注入检测
   */
  enableNoSqlInjectionDetection?: boolean;

  /**
   * 是否移除空白字符
   */
  trimWhitespace?: boolean;

  /**
   * 是否转义特殊字符
   */
  escapeSpecialChars?: boolean;

  /**
   * 自定义黑名单关键字
   */
  customBlacklist?: string[];

  /**
   * 最大字符串长度
   */
  maxStringLength?: number;

  /**
   * 允许的 HTML 标签（仅在 enableHtmlSanitization=true 时有效）
   */
  allowedTags?: string[];

  /**
   * 是否启用严格模式（检测到可疑内容直接拒绝）
   */
  strictMode?: boolean;
}

/**
 * 默认清理配置
 */
const DEFAULT_OPTIONS: SanitizationOptions = {
  enableHtmlSanitization: true,
  enableSqlKeywordDetection: true,
  enableNoSqlInjectionDetection: true,
  trimWhitespace: true,
  escapeSpecialChars: false,
  customBlacklist: [],
  maxStringLength: 10000,
  allowedTags: [],
  strictMode: false,
};

/**
 * SQL 注入常见关键字模式
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
  /(--|\*\/|\/\*)/g, // SQL 注释
  /(\bOR\b\s+\d+\s*=\s*\d+)/gi, // OR 1=1
  /(\bAND\b\s+\d+\s*=\s*\d+)/gi, // AND 1=1
  /('(\s|%20)*(OR|AND)(\s|%20)*')/gi, // ' OR ', ' AND '
  /(;|\|{2})/g, // 命令分隔符
  /(xp_|sp_|0x)/gi, // 存储过程和十六进制
];

/**
 * NoSQL 注入模式
 */
const NOSQL_INJECTION_PATTERNS = [
  /(\$where|\$regex|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin)/gi,
  /({\s*\$|\[\s*\$)/g, // MongoDB 操作符
  /(javascript:|eval\(|function\s*\()/gi, // JavaScript 代码注入
];

/**
 * XSS 攻击模式
 */
const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /on\w+\s*=\s*["']?[^"']*["']?/gi, // 事件处理器
  /javascript:/gi,
  /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
  /<embed[\s\S]*?>/gi,
];

/**
 * 全局输入清理管道
 *
 * 功能:
 * 1. HTML/XSS 清理
 * 2. SQL 注入检测
 * 3. NoSQL 注入检测
 * 4. 特殊字符转义
 * 5. 字符串长度限制
 * 6. class-validator 验证
 *
 * 使用示例:
 * ```typescript
 * @Post()
 * async create(@Body(new SanitizationPipe()) dto: CreateUserDto) {
 *   return this.service.create(dto);
 * }
 *
 * // 或在全局启用
 * app.useGlobalPipes(new SanitizationPipe());
 * ```
 */
@Injectable()
export class SanitizationPipe implements PipeTransform<any> {
  private options: SanitizationOptions;

  constructor(options: Partial<SanitizationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    // 如果没有 metatype 或是原生类型，直接返回
    if (!metadata.metatype || !this.toValidate(metadata.metatype)) {
      return value;
    }

    // 递归清理所有字符串字段
    const sanitizedValue = this.sanitizeValue(value);

    // 转换为类实例
    const object = plainToClass(metadata.metatype, sanitizedValue);

    // 使用 class-validator 验证
    const errors = await validate(object, {
      whitelist: true, // 移除未装饰的属性
      forbidNonWhitelisted: true, // 拒绝未知属性
      forbidUnknownValues: true, // 拒绝未知值
    });

    if (errors.length > 0) {
      throw new BadRequestException(this.formatErrors(errors));
    }

    return object;
  }

  /**
   * 递归清理值
   */
  private sanitizeValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (typeof value === 'object') {
      const sanitized: any = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          // 也清理键名
          const sanitizedKey = this.sanitizeString(key);
          sanitized[sanitizedKey] = this.sanitizeValue(value[key]);
        }
      }
      return sanitized;
    }

    return value;
  }

  /**
   * 清理字符串
   */
  private sanitizeString(str: string): string {
    let sanitized = str;

    // 1. 长度限制
    if (this.options.maxStringLength && sanitized.length > this.options.maxStringLength) {
      throw new BadRequestException(`输入长度超过限制 (最大 ${this.options.maxStringLength} 字符)`);
    }

    // 2. 去除空白字符
    if (this.options.trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // 3. SQL 注入检测
    if (this.options.enableSqlKeywordDetection) {
      this.detectSqlInjection(sanitized);
    }

    // 4. NoSQL 注入检测
    if (this.options.enableNoSqlInjectionDetection) {
      this.detectNoSqlInjection(sanitized);
    }

    // 5. XSS 检测
    this.detectXss(sanitized);

    // 6. HTML 清理
    if (this.options.enableHtmlSanitization) {
      sanitized = sanitizeHtml(sanitized, {
        allowedTags: this.options.allowedTags || [],
        allowedAttributes: {},
        disallowedTagsMode: 'escape',
      });
    }

    // 7. 自定义黑名单检测
    if (this.options.customBlacklist && this.options.customBlacklist.length > 0) {
      this.detectCustomBlacklist(sanitized);
    }

    // 8. 转义特殊字符
    if (this.options.escapeSpecialChars) {
      sanitized = validator.escape(sanitized);
    }

    return sanitized;
  }

  /**
   * SQL 注入检测
   */
  private detectSqlInjection(str: string): void {
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(str)) {
        if (this.options.strictMode) {
          throw new BadRequestException('检测到可疑的 SQL 注入模式，请求已被拒绝');
        }
        // 非严格模式下记录日志但不拒绝
        logger.warn('[Security] Potential SQL injection detected:', str);
      }
    }
  }

  /**
   * NoSQL 注入检测
   */
  private detectNoSqlInjection(str: string): void {
    for (const pattern of NOSQL_INJECTION_PATTERNS) {
      if (pattern.test(str)) {
        if (this.options.strictMode) {
          throw new BadRequestException('检测到可疑的 NoSQL 注入模式，请求已被拒绝');
        }
        logger.warn('[Security] Potential NoSQL injection detected:', str);
      }
    }
  }

  /**
   * XSS 检测
   */
  private detectXss(str: string): void {
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(str)) {
        if (this.options.strictMode) {
          throw new BadRequestException('检测到可疑的 XSS 攻击模式，请求已被拒绝');
        }
        logger.warn('[Security] Potential XSS attack detected:', str);
      }
    }
  }

  /**
   * 自定义黑名单检测
   */
  private detectCustomBlacklist(str: string): void {
    const lowerStr = str.toLowerCase();
    for (const keyword of this.options.customBlacklist!) {
      if (lowerStr.includes(keyword.toLowerCase())) {
        throw new BadRequestException(`输入包含禁止的关键字: ${keyword}`);
      }
    }
  }

  /**
   * 检查是否需要验证
   */
  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  /**
   * 格式化验证错误
   */
  private formatErrors(errors: ValidationError[]): string {
    const messages: string[] = [];

    const extractMessages = (error: ValidationError, path = '') => {
      const currentPath = path ? `${path}.${error.property}` : error.property;

      if (error.constraints) {
        for (const key in error.constraints) {
          messages.push(`${currentPath}: ${error.constraints[key]}`);
        }
      }

      if (error.children && error.children.length > 0) {
        error.children.forEach((child) => extractMessages(child, currentPath));
      }
    };

    errors.forEach((error) => extractMessages(error));

    return messages.join('; ');
  }
}

/**
 * 严格模式清理管道（检测到可疑内容直接拒绝）
 */
@Injectable()
export class StrictSanitizationPipe extends SanitizationPipe {
  constructor(options: Partial<SanitizationOptions> = {}) {
    super({ ...options, strictMode: true });
  }
}

/**
 * 宽松模式清理管道（仅清理不拒绝）
 */
@Injectable()
export class LooseSanitizationPipe extends SanitizationPipe {
  constructor(options: Partial<SanitizationOptions> = {}) {
    super({
      ...options,
      strictMode: false,
      enableSqlKeywordDetection: false,
      enableNoSqlInjectionDetection: false,
    });
  }
}
