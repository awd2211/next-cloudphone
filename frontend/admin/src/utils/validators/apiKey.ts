import type { CreateApiKeyDto } from '@/types';

/**
 * 验证 API Key scope 格式
 * 格式规则: resource:action (小写字母，允许复数形式如 devices)
 *
 * @example
 * validateScope('device:read')   // true
 * validateScope('devices:read')  // true
 * validateScope('Device:Read')   // false (大写)
 * validateScope('device-read')   // false (错误分隔符)
 */
export const validateScope = (scope: string): boolean => {
  // 允许字母和可选的s结尾（支持复数形式）
  return /^[a-z]+s?:[a-z]+$/.test(scope);
};

/**
 * 验证日期是否在未来
 *
 * @example
 * isDateInFuture(new Date('2026-01-01'))  // true
 * isDateInFuture(new Date('2020-01-01'))  // false
 */
export const isDateInFuture = (date: string | Date): boolean => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return targetDate.getTime() > Date.now();
};

/**
 * 验证 CreateApiKeyDto
 * 返回错误信息数组，空数组表示验证通过
 *
 * @example
 * const errors = validateCreateApiKeyDto({
 *   userId: 'user-123',
 *   name: 'Test Key',
 *   scopes: ['device:read', 'Device:Write'],  // 第二个格式错误
 *   expiresAt: '2020-01-01'  // 已过期
 * });
 * // errors = [
 * //   'scopes[1]: 格式必须为 "resource:action" (小写字母)',
 * //   'expiresAt: 过期时间必须是未来日期'
 * // ]
 */
export const validateCreateApiKeyDto = (dto: CreateApiKeyDto): string[] => {
  const errors: string[] = [];

  // 验证 scopes 格式
  if (dto.scopes && Array.isArray(dto.scopes)) {
    dto.scopes.forEach((scope, index) => {
      if (!validateScope(scope)) {
        errors.push(
          `scopes[${index}]: 格式必须为 "resource:action" (小写字母)`
        );
      }
    });
  }

  // 验证过期时间
  if (dto.expiresAt && !isDateInFuture(dto.expiresAt)) {
    errors.push('expiresAt: 过期时间必须是未来日期');
  }

  return errors;
};

/**
 * 生成友好的 scope 建议列表
 */
export const getScopeSuggestions = (): string[] => {
  return [
    'device:read',
    'device:write',
    'device:delete',
    'user:read',
    'user:write',
    'billing:read',
    'billing:write',
    'app:read',
    'app:write',
  ];
};
