import { Logger } from '@nestjs/common';
import { DataSource, EntityManager, ObjectLiteral, QueryRunner, SelectQueryBuilder } from 'typeorm';

/**
 * 查询审计配置
 */
export interface QueryAuditConfig {
  /**
   * 是否启用查询审计
   */
  enabled: boolean;

  /**
   * 是否记录所有查询
   */
  logAllQueries: boolean;

  /**
   * 是否记录慢查询
   */
  logSlowQueries: boolean;

  /**
   * 慢查询阈值（毫秒）
   */
  slowQueryThreshold: number;

  /**
   * 是否检测危险操作
   */
  detectDangerousOperations: boolean;

  /**
   * 是否阻止危险操作
   */
  blockDangerousOperations: boolean;

  /**
   * 是否验证参数化查询
   */
  enforceParameterizedQueries: boolean;

  /**
   * 日志记录器
   */
  logger?: Logger;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: QueryAuditConfig = {
  enabled: true,
  logAllQueries: false,
  logSlowQueries: true,
  slowQueryThreshold: 1000, // 1秒
  detectDangerousOperations: true,
  blockDangerousOperations: false,
  enforceParameterizedQueries: true,
  logger: undefined,
};

/**
 * 查询审计结果
 */
export interface QueryAuditResult {
  query: string;
  parameters?: any[];
  executionTime?: number;
  isDangerous: boolean;
  isParameterized: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * 危险查询模式
 */
const DANGEROUS_PATTERNS = [
  {
    pattern: /DROP\s+(TABLE|DATABASE|SCHEMA)/gi,
    description: 'DROP 操作会删除数据',
    severity: 'critical',
  },
  {
    pattern: /TRUNCATE\s+TABLE/gi,
    description: 'TRUNCATE 操作会清空表数据',
    severity: 'critical',
  },
  {
    pattern: /DELETE\s+FROM\s+\w+\s*(?!WHERE)/gi,
    description: 'DELETE 操作缺少 WHERE 条件，可能删除所有数据',
    severity: 'high',
  },
  {
    pattern: /UPDATE\s+\w+\s+SET\s+.*(?!WHERE)/gi,
    description: 'UPDATE 操作缺少 WHERE 条件，可能更新所有数据',
    severity: 'high',
  },
  {
    pattern: /SELECT\s+.*\s+FROM\s+.*\s+(?!WHERE|LIMIT)/gi,
    description: 'SELECT 操作缺少 WHERE 或 LIMIT，可能查询大量数据',
    severity: 'medium',
  },
  {
    pattern: /;\s*(DROP|DELETE|UPDATE|INSERT)/gi,
    description: '检测到堆叠查询（可能是 SQL 注入）',
    severity: 'critical',
  },
  {
    pattern: /UNION\s+SELECT/gi,
    description: '检测到 UNION 查询（可能是 SQL 注入）',
    severity: 'high',
  },
  {
    pattern: /--|\*\/|\/\*/g,
    description: '检测到 SQL 注释符号（可能是 SQL 注入）',
    severity: 'medium',
  },
  {
    pattern: /xp_|sp_cmdshell/gi,
    description: '检测到存储过程调用',
    severity: 'high',
  },
];

/**
 * TypeORM 查询审计工具
 *
 * 功能:
 * 1. 记录所有数据库查询
 * 2. 检测慢查询
 * 3. 识别危险操作（DROP, TRUNCATE, DELETE/UPDATE 缺少 WHERE）
 * 4. 强制使用参数化查询
 * 5. SQL 注入防护
 *
 * 使用示例:
 * ```typescript
 * // 在 main.ts 中启用
 * const dataSource = app.get(DataSource);
 * QueryAudit.install(dataSource, {
 *   logSlowQueries: true,
 *   slowQueryThreshold: 1000,
 *   detectDangerousOperations: true,
 * });
 *
 * // 手动审计查询
 * const result = QueryAudit.auditQuery('SELECT * FROM users WHERE id = ?', [1]);
 * if (result.isDangerous) {
 *   throw new Error('Dangerous query detected');
 * }
 * ```
 */
export class QueryAudit {
  private static config: QueryAuditConfig = DEFAULT_CONFIG;
  private static logger: Logger = new Logger('QueryAudit');
  private static queryStats: Map<string, { count: number; totalTime: number }> = new Map();

  /**
   * 安装查询审计到 TypeORM DataSource
   */
  static install(dataSource: DataSource, config: Partial<QueryAuditConfig> = {}): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = config.logger || this.logger;

    if (!this.config.enabled) {
      this.logger.log('Query audit is disabled');
      return;
    }

    // 拦截 QueryRunner 的 query 方法
    this.interceptQueryRunner(dataSource);

    this.logger.log('Query audit installed successfully');
  }

  /**
   * 拦截 QueryRunner
   */
  private static interceptQueryRunner(dataSource: DataSource): void {
    const originalCreateQueryRunner = dataSource.createQueryRunner.bind(dataSource);

    dataSource.createQueryRunner = (): QueryRunner => {
      const queryRunner = originalCreateQueryRunner();
      const originalQuery = queryRunner.query.bind(queryRunner);

      // 拦截 query 方法
      queryRunner.query = async (query: string, parameters?: any[]): Promise<any> => {
        const startTime = Date.now();

        // 审计查询
        const auditResult = this.auditQuery(query, parameters);

        // 如果配置了阻止危险操作且检测到危险查询
        if (
          this.config.blockDangerousOperations &&
          auditResult.isDangerous &&
          auditResult.errors.length > 0
        ) {
          this.logger.error('Dangerous query blocked:', {
            query,
            errors: auditResult.errors,
          });
          throw new Error(`Dangerous query blocked: ${auditResult.errors.join('; ')}`);
        }

        // 执行查询
        let result: any;
        let error: Error | undefined;

        try {
          result = await originalQuery(query, parameters);
        } catch (err) {
          error = err as Error;
          throw err;
        } finally {
          const executionTime = Date.now() - startTime;
          auditResult.executionTime = executionTime;

          // 记录查询
          this.logQuery(query, parameters, executionTime, error, auditResult);

          // 更新统计
          this.updateStats(query, executionTime);
        }

        return result;
      };

      return queryRunner;
    };
  }

  /**
   * 审计单个查询
   */
  static auditQuery(query: string, parameters?: any[]): QueryAuditResult {
    const result: QueryAuditResult = {
      query,
      parameters,
      isDangerous: false,
      isParameterized: this.isParameterized(query, parameters),
      warnings: [],
      errors: [],
    };

    // 检测危险模式
    if (this.config.detectDangerousOperations) {
      for (const { pattern, description, severity } of DANGEROUS_PATTERNS) {
        if (pattern.test(query)) {
          result.isDangerous = true;

          if (severity === 'critical') {
            result.errors.push(`[${severity.toUpperCase()}] ${description}`);
          } else {
            result.warnings.push(`[${severity.toUpperCase()}] ${description}`);
          }
        }
      }
    }

    // 检查是否使用参数化查询
    if (this.config.enforceParameterizedQueries && !result.isParameterized) {
      result.warnings.push('查询未使用参数化，可能存在 SQL 注入风险');
    }

    return result;
  }

  /**
   * 检查是否是参数化查询
   */
  private static isParameterized(query: string, parameters?: any[]): boolean {
    // 如果有参数且查询中包含占位符，则认为是参数化查询
    if (!parameters || parameters.length === 0) {
      // 没有参数，检查查询是否包含占位符
      return /\$\d+|\?/.test(query);
    }

    // 有参数，检查查询是否包含足够的占位符
    const placeholderCount = (query.match(/\$\d+|\?/g) || []).length;
    return placeholderCount >= parameters.length;
  }

  /**
   * 记录查询
   */
  private static logQuery(
    query: string,
    parameters: any[] | undefined,
    executionTime: number,
    error: Error | undefined,
    auditResult: QueryAuditResult
  ): void {
    const isSlowQuery = executionTime >= this.config.slowQueryThreshold;

    // 记录所有查询
    if (this.config.logAllQueries) {
      this.logger.debug({
        query: this.sanitizeQuery(query),
        parameters: parameters ? this.sanitizeParameters(parameters) : undefined,
        executionTime: `${executionTime}ms`,
        isDangerous: auditResult.isDangerous,
        warnings: auditResult.warnings,
      });
    }

    // 记录慢查询
    if (this.config.logSlowQueries && isSlowQuery) {
      this.logger.warn({
        message: 'Slow query detected',
        query: this.sanitizeQuery(query),
        executionTime: `${executionTime}ms`,
        threshold: `${this.config.slowQueryThreshold}ms`,
      });
    }

    // 记录危险查询
    if (auditResult.isDangerous) {
      this.logger.warn({
        message: 'Dangerous query detected',
        query: this.sanitizeQuery(query),
        warnings: auditResult.warnings,
        errors: auditResult.errors,
      });
    }

    // 记录查询错误
    if (error) {
      this.logger.error({
        message: 'Query execution failed',
        query: this.sanitizeQuery(query),
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * 清理查询（隐藏敏感信息）
   */
  private static sanitizeQuery(query: string): string {
    // 替换可能的敏感信息
    let sanitized = query;

    // 替换邮箱
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***');

    // 替换电话号码
    sanitized = sanitized.replace(/\b\d{11}\b/g, '***********');

    // 替换身份证号
    sanitized = sanitized.replace(/\b\d{17}[\dXx]\b/g, '******************');

    return sanitized;
  }

  /**
   * 清理参数（隐藏敏感信息）
   */
  private static sanitizeParameters(parameters: any[]): any[] {
    return parameters.map((param) => {
      if (typeof param === 'string') {
        // 检查是否是敏感字段
        if (param.includes('@')) return '***@***.***';
        if (/^\d{11}$/.test(param)) return '***********';
        if (/^\d{17}[\dXx]$/.test(param)) return '******************';
      }
      return param;
    });
  }

  /**
   * 更新查询统计
   */
  private static updateStats(query: string, executionTime: number): void {
    // 标准化查询（移除参数值）
    const normalizedQuery = this.normalizeQuery(query);

    const stats = this.queryStats.get(normalizedQuery) || { count: 0, totalTime: 0 };
    stats.count++;
    stats.totalTime += executionTime;

    this.queryStats.set(normalizedQuery, stats);
  }

  /**
   * 标准化查询（用于统计）
   */
  private static normalizeQuery(query: string): string {
    // 移除多余空白
    let normalized = query.replace(/\s+/g, ' ').trim();

    // 替换数字为占位符
    normalized = normalized.replace(/\d+/g, '?');

    // 替换字符串为占位符
    normalized = normalized.replace(/'[^']*'/g, '?');

    return normalized;
  }

  /**
   * 获取查询统计
   */
  static getStats(): Array<{
    query: string;
    count: number;
    totalTime: number;
    avgTime: number;
  }> {
    const stats: Array<any> = [];

    this.queryStats.forEach((value, key) => {
      stats.push({
        query: key,
        count: value.count,
        totalTime: value.totalTime,
        avgTime: Math.round(value.totalTime / value.count),
      });
    });

    // 按总时间排序
    return stats.sort((a, b) => b.totalTime - a.totalTime);
  }

  /**
   * 清除统计数据
   */
  static clearStats(): void {
    this.queryStats.clear();
  }

  /**
   * 获取慢查询统计
   */
  static getSlowQueries(limit = 10): Array<{
    query: string;
    count: number;
    avgTime: number;
  }> {
    return this.getStats()
      .filter((stat) => stat.avgTime >= this.config.slowQueryThreshold)
      .slice(0, limit);
  }

  /**
   * 获取最频繁的查询
   */
  static getTopQueries(limit = 10): Array<{
    query: string;
    count: number;
    avgTime: number;
  }> {
    return this.getStats()
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

/**
 * QueryBuilder 包装器，添加审计功能
 */
export class AuditedQueryBuilder<Entity extends ObjectLiteral> {
  constructor(private queryBuilder: SelectQueryBuilder<Entity>) {}

  /**
   * 执行查询并审计
   */
  async getMany(): Promise<Entity[]> {
    const [query, parameters] = this.queryBuilder.getQueryAndParameters();
    const auditResult = QueryAudit.auditQuery(query, parameters);

    if (auditResult.warnings.length > 0) {
      QueryAudit['logger'].warn({
        message: 'Query warnings',
        warnings: auditResult.warnings,
        query,
      });
    }

    return this.queryBuilder.getMany();
  }

  async getOne(): Promise<Entity | null> {
    const [query, parameters] = this.queryBuilder.getQueryAndParameters();
    const auditResult = QueryAudit.auditQuery(query, parameters);

    if (auditResult.warnings.length > 0) {
      QueryAudit['logger'].warn({
        message: 'Query warnings',
        warnings: auditResult.warnings,
        query,
      });
    }

    return this.queryBuilder.getOne();
  }

  /**
   * 获取原始 QueryBuilder
   */
  getQueryBuilder(): SelectQueryBuilder<Entity> {
    return this.queryBuilder;
  }
}

/**
 * 创建审计 QueryBuilder
 */
export function createAuditedQueryBuilder<Entity extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<Entity>
): AuditedQueryBuilder<Entity> {
  return new AuditedQueryBuilder(queryBuilder);
}
