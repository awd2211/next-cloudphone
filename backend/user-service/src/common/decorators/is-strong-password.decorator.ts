import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * 强密码验证装饰器
 * 要求：至少8个字符，包含大小写字母、数字和特殊字符
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: '密码强度不足：必须至少8个字符，包含大小写字母、数字和特殊字符（@$!%*?&）',
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          // 最少8个字符
          if (value.length < 8) {
            return false;
          }

          // 包含至少一个小写字母
          if (!/[a-z]/.test(value)) {
            return false;
          }

          // 包含至少一个大写字母
          if (!/[A-Z]/.test(value)) {
            return false;
          }

          // 包含至少一个数字
          if (!/\d/.test(value)) {
            return false;
          }

          // 包含至少一个特殊字符
          if (!/[@$!%*?&]/.test(value)) {
            return false;
          }

          return true;
        },
      },
    });
  };
}

/**
 * 密码强度等级检查（可选的额外功能）
 */
export enum PasswordStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

export function checkPasswordStrength(password: string): PasswordStrength {
  let score = 0;

  // 长度分数
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // 字符类型分数
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[@$!%*?&]/.test(password)) score += 1;

  // 复杂度分数
  if (/[^a-zA-Z0-9@$!%*?&]/.test(password)) score += 1; // 包含其他特殊字符

  if (score <= 3) return PasswordStrength.WEAK;
  if (score <= 5) return PasswordStrength.MEDIUM;
  if (score <= 7) return PasswordStrength.STRONG;
  return PasswordStrength.VERY_STRONG;
}
