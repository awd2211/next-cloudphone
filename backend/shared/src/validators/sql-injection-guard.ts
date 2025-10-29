import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

/**
 * SQL 注入检测严格程度
 */
export enum SqlInjectionSeverity {
  LOW = 'low', // 仅记录警告
  MEDIUM = 'medium', // 记录警告并标记请求
  HIGH = 'high', // 直接拒绝请求
}

/**
 * SQL 注入检测装饰器的元数据键
 */
export const SQL_INJECTION_CHECK_KEY = 'sql_injection_check';

/**
 * SQL 注入检测装饰器
 *
 * 使用示例:
 * ```typescript
 * @Get()
 * @SqlInjectionCheck(SqlInjectionSeverity.HIGH)
 * async findAll(@Query() query: QueryDto) {
 *   return this.service.findAll(query);
 * }
 * ```
 */
export const SqlInjectionCheck = (severity: SqlInjectionSeverity = SqlInjectionSeverity.MEDIUM) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(SQL_INJECTION_CHECK_KEY, severity, descriptor.value);
    return descriptor;
  };
};

/**
 * SQL 注入模式定义
 */
interface SqlInjectionPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

/**
 * SQL 注入检测模式库
 */
const SQL_INJECTION_PATTERNS: SqlInjectionPattern[] = [
  // 关键 SQL 操作
  {
    name: 'sql_keywords_dml',
    pattern: /\b(SELECT|INSERT|UPDATE|DELETE|MERGE|UPSERT)\b.*\b(FROM|INTO|SET|WHERE)\b/gi,
    severity: 'critical',
    description: 'SQL DML 语句',
  },
  {
    name: 'sql_keywords_ddl',
    pattern: /\b(CREATE|DROP|ALTER|TRUNCATE|RENAME)\b.*\b(TABLE|DATABASE|SCHEMA|INDEX|VIEW)\b/gi,
    severity: 'critical',
    description: 'SQL DDL 语句',
  },
  {
    name: 'sql_keywords_dcl',
    pattern: /\b(GRANT|REVOKE|DENY)\b.*\b(ON|TO|FROM)\b/gi,
    severity: 'critical',
    description: 'SQL DCL 语句',
  },

  // UNION 注入
  {
    name: 'union_injection',
    pattern: /\bUNION\b.*\bSELECT\b/gi,
    severity: 'critical',
    description: 'UNION 注入攻击',
  },

  // 注释符号
  {
    name: 'sql_comments',
    pattern: /(--|\*\/|\/\*|#|;%00)/g,
    severity: 'high',
    description: 'SQL 注释符号',
  },

  // 布尔盲注
  {
    name: 'boolean_blind_sqli',
    pattern: /(\bOR\b|\bAND\b)\s+[\d\w]+\s*=\s*[\d\w]+/gi,
    severity: 'high',
    description: '布尔盲注 (OR/AND 1=1)',
  },
  {
    name: 'quoted_boolean_blind',
    pattern: /'(\s|%20)*(OR|AND)(\s|%20)*('|[\d\w])/gi,
    severity: 'high',
    description: '带引号的布尔盲注',
  },

  // 时间盲注
  {
    name: 'time_based_blind',
    pattern: /\b(SLEEP|BENCHMARK|WAITFOR|DELAY|pg_sleep)\b\s*\(/gi,
    severity: 'critical',
    description: '时间盲注',
  },

  // 堆叠查询
  {
    name: 'stacked_queries',
    pattern: /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)/gi,
    severity: 'critical',
    description: '堆叠查询',
  },

  // 存储过程和函数
  {
    name: 'stored_procedures',
    pattern: /\b(EXEC|EXECUTE|xp_|sp_)\b/gi,
    severity: 'critical',
    description: '存储过程执行',
  },

  // 信息泄露
  {
    name: 'information_schema',
    pattern: /\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS|mysql\.user)\b/gi,
    severity: 'high',
    description: '信息架构访问',
  },

  // 编码绕过
  {
    name: 'encoding_bypass',
    pattern: /(0x[0-9a-f]+|CHAR\(|CHR\(|CONCAT\(|LOAD_FILE\()/gi,
    severity: 'high',
    description: '编码绕过尝试',
  },

  // 逻辑操作符
  {
    name: 'logical_operators',
    pattern: /(\|\||&&|<>|!=)/g,
    severity: 'medium',
    description: '逻辑操作符',
  },

  // 十六进制编码
  {
    name: 'hex_encoding',
    pattern: /0x[0-9a-f]{2,}/gi,
    severity: 'medium',
    description: '十六进制编码',
  },

  // 引号尝试
  {
    name: 'quote_attempts',
    pattern: /['"`;]/g,
    severity: 'low',
    description: '引号字符',
  },
];

/**
 * SQL 注入检测结果
 */
export interface SqlInjectionDetectionResult {
  isSuspicious: boolean;
  matches: Array<{
    pattern: string;
    severity: string;
    description: string;
    matchedText: string;
  }>;
  riskScore: number; // 0-100
  recommendation: string;
}

/**
 * SQL 注入防护守卫
 *
 * 功能:
 * 1. 扫描请求参数中的 SQL 注入模式
 * 2. 根据严重程度决定是否拒绝请求
 * 3. 记录可疑请求日志
 * 4. 支持白名单机制
 *
 * 使用示例:
 * ```typescript
 * // 全局启用
 * app.useGlobalGuards(new SqlInjectionGuard(new Reflector()));
 *
 * // 在控制器上使用
 * @Controller('users')
 * @UseGuards(SqlInjectionGuard)
 * export class UsersController { }
 * ```
 */
@Injectable()
export class SqlInjectionGuard implements CanActivate {
  private readonly logger = new Logger(SqlInjectionGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // 获取装饰器配置的严重程度
    const severity = this.reflector.get<SqlInjectionSeverity>(
      SQL_INJECTION_CHECK_KEY,
      context.getHandler(),
    ) || SqlInjectionSeverity.MEDIUM;

    // 扫描所有输入
    const allInputs = this.extractAllInputs(request);
    const detectionResult = this.detectSqlInjection(allInputs);

    // 根据严重程度和检测结果决定是否允许通过
    if (detectionResult.isSuspicious) {
      this.logSuspiciousRequest(request, detectionResult);

      switch (severity) {
        case SqlInjectionSeverity.HIGH:
          // 直接拒绝
          throw new BadRequestException({
            message: 'SQL 注入检测: 请求已被拒绝',
            details: detectionResult.matches.map((m) => ({
              pattern: m.pattern,
              description: m.description,
            })),
            riskScore: detectionResult.riskScore,
          });

        case SqlInjectionSeverity.MEDIUM:
          // 记录并标记请求（但允许通过）
          (request as any).sqlInjectionWarning = detectionResult;
          this.logger.warn(
            `SQL 注入警告 [${request.method} ${request.url}]: 风险评分 ${detectionResult.riskScore}`,
          );
          break;

        case SqlInjectionSeverity.LOW:
          // 仅记录日志
          this.logger.log(
            `SQL 注入检测 [${request.method} ${request.url}]: 风险评分 ${detectionResult.riskScore}`,
          );
          break;
      }
    }

    return true;
  }

  /**
   * 提取请求中的所有输入
   */
  private extractAllInputs(request: Request): string[] {
    const inputs: string[] = [];

    // Query 参数
    if (request.query) {
      inputs.push(...this.flattenObject(request.query));
    }

    // Body 参数
    if (request.body) {
      inputs.push(...this.flattenObject(request.body));
    }

    // URL 参数
    if (request.params) {
      inputs.push(...this.flattenObject(request.params));
    }

    // Headers（选择性检查）
    const suspiciousHeaders = ['x-forwarded-for', 'user-agent', 'referer'];
    suspiciousHeaders.forEach((header) => {
      const value = request.headers[header];
      if (value) {
        inputs.push(String(value));
      }
    });

    return inputs;
  }

  /**
   * 展平对象为字符串数组
   */
  private flattenObject(obj: any, prefix = ''): string[] {
    const result: string[] = [];

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'string') {
          result.push(value);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          result.push(String(value));
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'string') {
              result.push(item);
            } else if (typeof item === 'object') {
              result.push(...this.flattenObject(item, `${newKey}[${index}]`));
            }
          });
        } else if (typeof value === 'object' && value !== null) {
          result.push(...this.flattenObject(value, newKey));
        }
      }
    }

    return result;
  }

  /**
   * 检测 SQL 注入
   */
  private detectSqlInjection(inputs: string[]): SqlInjectionDetectionResult {
    const matches: SqlInjectionDetectionResult['matches'] = [];
    let riskScore = 0;

    for (const input of inputs) {
      if (!input) continue;

      for (const patternDef of SQL_INJECTION_PATTERNS) {
        const match = input.match(patternDef.pattern);
        if (match) {
          matches.push({
            pattern: patternDef.name,
            severity: patternDef.severity,
            description: patternDef.description,
            matchedText: match[0],
          });

          // 计算风险评分
          switch (patternDef.severity) {
            case 'critical':
              riskScore += 40;
              break;
            case 'high':
              riskScore += 25;
              break;
            case 'medium':
              riskScore += 10;
              break;
            case 'low':
              riskScore += 5;
              break;
          }
        }
      }
    }

    // 风险评分上限 100
    riskScore = Math.min(riskScore, 100);

    const isSuspicious = matches.length > 0;
    const recommendation = this.getRecommendation(riskScore);

    return {
      isSuspicious,
      matches,
      riskScore,
      recommendation,
    };
  }

  /**
   * 根据风险评分提供建议
   */
  private getRecommendation(riskScore: number): string {
    if (riskScore >= 70) {
      return '高危: 强烈建议拒绝此请求并进行安全审计';
    } else if (riskScore >= 40) {
      return '中危: 建议记录并监控此请求';
    } else if (riskScore >= 20) {
      return '低危: 建议记录此请求以供后续分析';
    } else {
      return '极低风险: 可能是误报';
    }
  }

  /**
   * 记录可疑请求
   */
  private logSuspiciousRequest(
    request: Request,
    result: SqlInjectionDetectionResult,
  ): void {
    this.logger.warn({
      message: 'SQL 注入检测警告',
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      riskScore: result.riskScore,
      matches: result.matches,
      recommendation: result.recommendation,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 严格 SQL 注入守卫（直接拒绝可疑请求）
 */
@Injectable()
export class StrictSqlInjectionGuard extends SqlInjectionGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const allInputs = this['extractAllInputs'](request);
    const detectionResult = this['detectSqlInjection'](allInputs);

    if (detectionResult.isSuspicious && detectionResult.riskScore >= 20) {
      throw new BadRequestException({
        message: 'SQL 注入检测: 请求已被严格模式拒绝',
        riskScore: detectionResult.riskScore,
        recommendation: detectionResult.recommendation,
      });
    }

    return super.canActivate(context);
  }
}
