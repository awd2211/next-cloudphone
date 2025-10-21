import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

/**
 * SQL 注入防护管道
 *
 * 功能：
 * - 检测常见的 SQL 注入攻击模式
 * - 验证和清理用户输入
 * - 阻止危险字符和关键词
 */
@Injectable()
export class SqlInjectionValidationPipe implements PipeTransform {
  /**
   * SQL 注入危险关键词
   * 这些关键词如果出现在用户输入中可能是攻击尝试
   */
  private readonly dangerousKeywords = [
    // SQL 命令
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'EXEC', 'EXECUTE', 'UNION', 'DECLARE', 'CAST', 'CONVERT',

    // SQL 函数
    'CHAR', 'NCHAR', 'VARCHAR', 'NVARCHAR', 'ASCII', 'CHR',
    'CONCAT', 'SUBSTRING', 'LEN', 'LENGTH', 'SLEEP', 'BENCHMARK',

    // SQL 注释符号
    '--', '/*', '*/', '#',

    // SQL 特殊操作
    'XP_', 'SP_', 'UTL_', 'DBMS_',

    // 危险操作
    'SHUTDOWN', 'GRANT', 'REVOKE', 'TRUNCATE',
  ];

  /**
   * SQL 注入危险字符
   */
  private readonly dangerousPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,  // SQL 注释和引号
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,  // SQL 注入模式
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,  // 'OR' 模式
    /((\%27)|(\'))union/i,  // UNION 注入
    /exec(\s|\+)+(s|x)p\w+/i,  // 存储过程执行
  ];

  /**
   * 转换值（验证和清理）
   */
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) {
      return value;
    }

    // 只处理字符串类型
    if (typeof value === 'string') {
      this.validateString(value, metadata.data || 'input');
      return value;
    }

    // 处理对象（递归检查所有字段）
    if (typeof value === 'object') {
      this.validateObject(value);
      return value;
    }

    return value;
  }

  /**
   * 验证字符串
   */
  private validateString(str: string, fieldName: string): void {
    // 1. 检查危险关键词
    const upperStr = str.toUpperCase();
    for (const keyword of this.dangerousKeywords) {
      if (upperStr.includes(keyword)) {
        throw new BadRequestException({
          success: false,
          code: 400,
          message: `检测到潜在的 SQL 注入攻击`,
          field: fieldName,
          reason: `包含危险关键词: ${keyword}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 2. 检查危险模式
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(str)) {
        throw new BadRequestException({
          success: false,
          code: 400,
          message: `检测到潜在的 SQL 注入攻击`,
          field: fieldName,
          reason: `匹配到危险模式`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 3. 检查连续的特殊字符
    if (/[';\"]{2,}/.test(str)) {
      throw new BadRequestException({
        success: false,
        code: 400,
        message: `输入包含异常字符组合`,
        field: fieldName,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 验证对象（递归）
   */
  private validateObject(obj: any): void {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (typeof value === 'string') {
          this.validateString(value, key);
        } else if (typeof value === 'object' && value !== null) {
          this.validateObject(value);
        }
      }
    }
  }
}

/**
 * SQL 安全验证管道（宽松模式）
 *
 * 只检查最危险的模式，允许更多合法输入
 * 适用于需要接受特殊字符的场景（如文章内容、代码片段等）
 */
@Injectable()
export class SqlInjectionValidationPipeLoose implements PipeTransform {
  private readonly criticalPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,  // SQL 注释和引号
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,  // SQL 注入模式
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,  // 'OR' 模式
  ];

  transform(value: any, metadata: ArgumentMetadata) {
    if (!value || typeof value !== 'string') {
      return value;
    }

    // 只检查最关键的模式
    for (const pattern of this.criticalPatterns) {
      if (pattern.test(value)) {
        throw new BadRequestException({
          success: false,
          code: 400,
          message: `检测到潜在的 SQL 注入攻击`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return value;
  }
}
