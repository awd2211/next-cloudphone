import { SetMetadata } from '@nestjs/common';

/**
 * 标记方法需要进行 SQL 安全审计
 *
 * 使用此装饰器的方法会在执行前后进行日志记录
 * 帮助识别潜在的 SQL 注入风险
 */
export const SAFE_QUERY_KEY = 'safe_query';

export interface SafeQueryOptions {
  /**
   * 查询描述
   */
  description?: string;

  /**
   * 是否记录查询参数
   */
  logParameters?: boolean;

  /**
   * 是否记录查询结果
   */
  logResult?: boolean;

  /**
   * 是否验证参数
   */
  validateParameters?: boolean;
}

/**
 * 安全查询装饰器
 *
 * @example
 * ```typescript
 * @SafeQuery({ description: '查询用户信息', logParameters: true })
 * async findUserByEmail(email: string) {
 *   return this.userRepository.findOne({ where: { email } });
 * }
 * ```
 */
export const SafeQuery = (options: SafeQueryOptions = {}) =>
  SetMetadata(SAFE_QUERY_KEY, {
    description: options.description || 'Database query',
    logParameters: options.logParameters !== false,  // 默认记录参数
    logResult: options.logResult !== false,          // 默认记录结果
    validateParameters: options.validateParameters !== false,  // 默认验证
  });

/**
 * 标记使用原生 SQL 查询
 *
 * 使用原生 SQL 时需要特别注意 SQL 注入风险
 */
export const RAW_QUERY_KEY = 'raw_query';

export interface RawQueryOptions {
  /**
   * 查询描述
   */
  description: string;

  /**
   * 是否已经过安全审查
   */
  reviewed?: boolean;

  /**
   * 审查人员
   */
  reviewedBy?: string;

  /**
   * 审查日期
   */
  reviewDate?: string;
}

/**
 * 原生 SQL 查询装饰器
 *
 * 用于标记使用原生 SQL 的方法，需要额外的安全审查
 *
 * @example
 * ```typescript
 * @RawQuery({
 *   description: '统计用户数量',
 *   reviewed: true,
 *   reviewedBy: 'security-team',
 *   reviewDate: '2025-10-21'
 * })
 * async countUsers() {
 *   return this.dataSource.query('SELECT COUNT(*) FROM users');
 * }
 * ```
 */
export const RawQuery = (options: RawQueryOptions) =>
  SetMetadata(RAW_QUERY_KEY, {
    description: options.description,
    reviewed: options.reviewed || false,
    reviewedBy: options.reviewedBy,
    reviewDate: options.reviewDate,
  });
