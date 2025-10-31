/**
 * 输入清理工具
 *
 * 功能：
 * - 清理和转义用户输入
 * - 防止 SQL 注入
 * - 防止 XSS 攻击
 * - 规范化数据格式
 */

/**
 * SQL 特殊字符转义
 *
 * 转义 SQL 中的特殊字符，防止注入
 * 注意：TypeORM 已经自动处理参数化查询，此函数用于额外的安全层
 */
export function escapeSql(input: string): string {
  if (!input) return input;

  return input
    .replace(/\'/g, "''") // 单引号转义
    .replace(/\\/g, '\\\\') // 反斜杠转义
    .replace(/\x00/g, '\\0') // NULL 字符
    .replace(/\n/g, '\\n') // 换行符
    .replace(/\r/g, '\\r') // 回车符
    .replace(/\x1a/g, '\\Z'); // Ctrl+Z
}

/**
 * HTML 实体编码
 *
 * 防止 XSS 攻击
 */
export function escapeHtml(input: string): string {
  if (!input) return input;

  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'\/]/g, (char) => htmlEntities[char] || char);
}

/**
 * 移除 HTML 标签
 */
export function stripHtml(input: string): string {
  if (!input) return input;

  return input.replace(/<[^>]*>/g, '');
}

/**
 * 清理用户名
 *
 * 只保留字母、数字、下划线、中划线
 */
export function sanitizeUsername(username: string): string {
  if (!username) return username;

  return username
    .trim()
    .replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '') // 保留中文字符
    .substring(0, 50); // 限制长度
}

/**
 * 清理邮箱地址
 */
export function sanitizeEmail(email: string): string {
  if (!email) return email;

  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._\-]/g, '') // 只保留邮箱合法字符
    .substring(0, 100); // 限制长度
}

/**
 * 清理手机号
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return phone;

  return phone
    .trim()
    .replace(/[^0-9+\-\s()]/g, '') // 只保留数字和常见分隔符
    .replace(/\s+/g, '') // 移除所有空格
    .substring(0, 20); // 限制长度
}

/**
 * 清理 URL
 */
export function sanitizeUrl(url: string): string {
  if (!url) return url;

  // 移除危险协议
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = url.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }

  return url.trim().substring(0, 2000);
}

/**
 * 清理文本内容
 *
 * 保留大部分字符，但移除控制字符和特殊符号
 */
export function sanitizeText(text: string): string {
  if (!text) return text;

  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // 移除控制字符
    .replace(/[\uFFF0-\uFFFF]/g, '') // 移除特殊 Unicode
    .trim();
}

/**
 * 清理搜索关键词
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return query;

  return query
    .trim()
    .replace(/['"`;\\]/g, '') // 移除危险字符
    .substring(0, 100); // 限制长度
}

/**
 * 验证和清理 UUID
 */
export function sanitizeUuid(uuid: string): string | null {
  if (!uuid) return null;

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const cleanUuid = uuid.trim().toLowerCase();

  if (!uuidPattern.test(cleanUuid)) {
    return null;
  }

  return cleanUuid;
}

/**
 * 批量清理对象
 *
 * 遍历对象的所有字符串属性并清理
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  sanitizer: (value: string) => string = sanitizeText
): T {
  const result: any = { ...obj };

  for (const key in result) {
    if (result.hasOwnProperty(key)) {
      const value = result[key];

      if (typeof value === 'string') {
        result[key] = sanitizer(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = sanitizeObject(value, sanitizer);
      }
    }
  }

  return result;
}

/**
 * 验证输入长度
 */
export function validateLength(
  input: string,
  min: number,
  max: number,
  fieldName: string = 'input'
): void {
  if (!input) {
    throw new Error(`${fieldName} 不能为空`);
  }

  if (input.length < min) {
    throw new Error(`${fieldName} 长度不能少于 ${min} 个字符`);
  }

  if (input.length > max) {
    throw new Error(`${fieldName} 长度不能超过 ${max} 个字符`);
  }
}

/**
 * 验证和清理整数
 */
export function sanitizeInteger(value: any, min?: number, max?: number): number | null {
  const num = parseInt(value, 10);

  if (isNaN(num)) {
    return null;
  }

  if (min !== undefined && num < min) {
    return min;
  }

  if (max !== undefined && num > max) {
    return max;
  }

  return num;
}

/**
 * 防止路径遍历攻击
 *
 * 清理文件路径，防止 ../ 等路径遍历
 */
export function sanitizeFilePath(filePath: string): string {
  if (!filePath) return filePath;

  return filePath
    .replace(/\.\./g, '') // 移除 ..
    .replace(/[\/\\]{2,}/g, '/') // 合并多个斜杠
    .replace(/^[\/\\]+/, '') // 移除开头的斜杠
    .trim();
}

/**
 * 清理文件名
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return fileName;

  return fileName
    .replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, '_') // 只保留安全字符
    .replace(/\.{2,}/g, '.') // 合并多个点
    .substring(0, 255); // 限制长度
}
