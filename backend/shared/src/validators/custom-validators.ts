import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import validator from 'validator';

/**
 * 自定义验证装饰器集合
 *
 * 提供常见的业务验证规则:
 * - 手机号验证
 * - 身份证验证
 * - 用户名验证
 * - 强密码验证
 * - IP 地址验证
 * - MAC 地址验证
 * - 端口号验证
 * - URL 验证
 * - 文件路径验证
 * - JSON 验证
 * - 时间范围验证
 */

// ==================== 中国手机号验证 ====================

@ValidatorConstraint({ name: 'isChinesePhoneNumber', async: false })
export class IsChinesePhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phoneNumber: string, args: ValidationArguments) {
    if (!phoneNumber) return false;

    // 中国手机号: 1开头，第二位是3-9，共11位
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  }

  defaultMessage(args: ValidationArguments) {
    return '手机号格式不正确，必须是11位中国大陆手机号';
  }
}

export function IsChinesePhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsChinesePhoneNumberConstraint,
    });
  };
}

// ==================== 中国身份证号验证 ====================

@ValidatorConstraint({ name: 'isChineseIdCard', async: false })
export class IsChineseIdCardConstraint implements ValidatorConstraintInterface {
  validate(idCard: string, args: ValidationArguments) {
    if (!idCard) return false;

    // 18位身份证号（支持15位转18位的规则）
    const idCardRegex =
      /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;

    if (!idCardRegex.test(idCard)) {
      return false;
    }

    // 校验码验证
    return this.validateChecksum(idCard);
  }

  private validateChecksum(idCard: string): boolean {
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checksums = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(idCard[i]) * weights[i];
    }

    const checksum = checksums[sum % 11];
    return idCard[17].toUpperCase() === checksum;
  }

  defaultMessage(args: ValidationArguments) {
    return '身份证号格式不正确';
  }
}

export function IsChineseIdCard(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsChineseIdCardConstraint,
    });
  };
}

// ==================== 用户名验证 ====================

@ValidatorConstraint({ name: 'isUsername', async: false })
export class IsUsernameConstraint implements ValidatorConstraintInterface {
  validate(username: string, args: ValidationArguments) {
    if (!username) return false;

    // 用户名规则: 4-20位，字母、数字、下划线、连字符，必须以字母开头
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_-]{3,19}$/;
    return usernameRegex.test(username);
  }

  defaultMessage(args: ValidationArguments) {
    return '用户名必须是4-20位，以字母开头，只能包含字母、数字、下划线和连字符';
  }
}

export function IsUsername(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUsernameConstraint,
    });
  };
}

// ==================== 强密码验证 ====================

export interface StrongPasswordOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  specialChars?: string;
}

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments) {
    if (!password) return false;

    const options: StrongPasswordOptions = args.constraints[0] || {};
    const {
      minLength = 8,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true,
      specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?',
    } = options;

    // 长度检查
    if (password.length < minLength) {
      return false;
    }

    // 大写字母
    if (requireUppercase && !/[A-Z]/.test(password)) {
      return false;
    }

    // 小写字母
    if (requireLowercase && !/[a-z]/.test(password)) {
      return false;
    }

    // 数字
    if (requireNumbers && !/\d/.test(password)) {
      return false;
    }

    // 特殊字符
    if (requireSpecialChars) {
      const specialCharRegex = new RegExp(
        `[${specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`
      );
      if (!specialCharRegex.test(password)) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const options: StrongPasswordOptions = args.constraints[0] || {};
    const { minLength = 8 } = options;

    const requirements: string[] = [`至少${minLength}个字符`];
    if (options.requireUppercase !== false) requirements.push('至少一个大写字母');
    if (options.requireLowercase !== false) requirements.push('至少一个小写字母');
    if (options.requireNumbers !== false) requirements.push('至少一个数字');
    if (options.requireSpecialChars !== false) requirements.push('至少一个特殊字符');

    return `密码强度不足，需要: ${requirements.join('、')}`;
  }
}

export function IsStrongPassword(
  options?: StrongPasswordOptions,
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsStrongPasswordConstraint,
    });
  };
}

// ==================== 端口号验证 ====================

@ValidatorConstraint({ name: 'isPort', async: false })
export class IsPortConstraint implements ValidatorConstraintInterface {
  validate(port: any, args: ValidationArguments) {
    const portNumber = typeof port === 'string' ? parseInt(port, 10) : port;
    return Number.isInteger(portNumber) && portNumber >= 1 && portNumber <= 65535;
  }

  defaultMessage(args: ValidationArguments) {
    return '端口号必须是 1-65535 之间的整数';
  }
}

export function IsPort(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPortConstraint,
    });
  };
}

// ==================== MAC 地址验证 ====================

@ValidatorConstraint({ name: 'isMacAddress', async: false })
export class IsMacAddressConstraint implements ValidatorConstraintInterface {
  validate(mac: string, args: ValidationArguments) {
    if (!mac) return false;

    // 支持多种 MAC 地址格式:
    // - 00:1A:2B:3C:4D:5E
    // - 00-1A-2B-3C-4D-5E
    // - 001A.2B3C.4D5E
    const macRegex =
      /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{4}\.){2}([0-9A-Fa-f]{4})$/;
    return macRegex.test(mac);
  }

  defaultMessage(args: ValidationArguments) {
    return 'MAC 地址格式不正确';
  }
}

export function IsMacAddress(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMacAddressConstraint,
    });
  };
}

// ==================== 安全 URL 验证 ====================

@ValidatorConstraint({ name: 'isSafeUrl', async: false })
export class IsSafeUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string, args: ValidationArguments) {
    if (!url) return false;

    // 基本 URL 验证
    if (!validator.isURL(url, { require_protocol: true })) {
      return false;
    }

    // 禁止危险协议
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerUrl = url.toLowerCase();
    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        return false;
      }
    }

    // 禁止本地回环地址（可选，根据需求）
    if (args.constraints[0]?.blockLocalhost) {
      if (/localhost|127\.0\.0\.1|0\.0\.0\.0|::1/.test(lowerUrl)) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'URL 不安全或格式不正确';
  }
}

export function IsSafeUrl(
  options?: { blockLocalhost?: boolean },
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsSafeUrlConstraint,
    });
  };
}

// ==================== Unix 文件路径验证 ====================

@ValidatorConstraint({ name: 'isUnixPath', async: false })
export class IsUnixPathConstraint implements ValidatorConstraintInterface {
  validate(path: string, args: ValidationArguments) {
    if (!path) return false;

    // Unix 文件路径规则:
    // - 以 / 开头（绝对路径）或不以 / 开头（相对路径）
    // - 不包含危险字符串: .., ../../, etc.
    // - 不包含空字符
    const unixPathRegex = /^[a-zA-Z0-9\/_.-]+$/;

    if (!unixPathRegex.test(path)) {
      return false;
    }

    // 禁止路径遍历
    if (path.includes('..')) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return '文件路径格式不正确或包含危险字符';
  }
}

export function IsUnixPath(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUnixPathConstraint,
    });
  };
}

// ==================== JSON 字符串验证 ====================

@ValidatorConstraint({ name: 'isJsonString', async: false })
export class IsJsonStringConstraint implements ValidatorConstraintInterface {
  validate(jsonString: string, args: ValidationArguments) {
    if (!jsonString) return false;

    try {
      JSON.parse(jsonString);
      return true;
    } catch (error) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return '必须是有效的 JSON 字符串';
  }
}

export function IsJsonString(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsJsonStringConstraint,
    });
  };
}

// ==================== 时间范围验证 ====================

@ValidatorConstraint({ name: 'isDateInRange', async: false })
export class IsDateInRangeConstraint implements ValidatorConstraintInterface {
  validate(dateValue: any, args: ValidationArguments) {
    if (!dateValue) return false;

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return false;
    }

    const { minDate, maxDate } = args.constraints[0] || {};

    if (minDate) {
      const min = new Date(minDate);
      if (date < min) {
        return false;
      }
    }

    if (maxDate) {
      const max = new Date(maxDate);
      if (date > max) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const { minDate, maxDate } = args.constraints[0] || {};
    if (minDate && maxDate) {
      return `日期必须在 ${minDate} 和 ${maxDate} 之间`;
    } else if (minDate) {
      return `日期必须晚于 ${minDate}`;
    } else if (maxDate) {
      return `日期必须早于 ${maxDate}`;
    }
    return '日期不在有效范围内';
  }
}

export function IsDateInRange(
  options?: { minDate?: string | Date; maxDate?: string | Date },
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsDateInRangeConstraint,
    });
  };
}

// ==================== 数组长度验证 ====================

@ValidatorConstraint({ name: 'arrayLength', async: false })
export class ArrayLengthConstraint implements ValidatorConstraintInterface {
  validate(array: any[], args: ValidationArguments) {
    if (!Array.isArray(array)) return false;

    const { min, max } = args.constraints[0] || {};

    if (min !== undefined && array.length < min) {
      return false;
    }

    if (max !== undefined && array.length > max) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const { min, max } = args.constraints[0] || {};
    if (min !== undefined && max !== undefined) {
      return `数组长度必须在 ${min} 到 ${max} 之间`;
    } else if (min !== undefined) {
      return `数组长度至少为 ${min}`;
    } else if (max !== undefined) {
      return `数组长度最多为 ${max}`;
    }
    return '数组长度不符合要求';
  }
}

export function ArrayLength(
  options?: { min?: number; max?: number },
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: ArrayLengthConstraint,
    });
  };
}

// ==================== UUID 版本验证 ====================

@ValidatorConstraint({ name: 'isUuidVersion', async: false })
export class IsUuidVersionConstraint implements ValidatorConstraintInterface {
  validate(uuid: string, args: ValidationArguments) {
    if (!uuid) return false;

    const version = args.constraints[0] || 4;

    if (version === 4) {
      return validator.isUUID(uuid, 4);
    } else if (version === 3) {
      return validator.isUUID(uuid, 3);
    } else if (version === 5) {
      return validator.isUUID(uuid, 5);
    }

    return validator.isUUID(uuid);
  }

  defaultMessage(args: ValidationArguments) {
    const version = args.constraints[0] || 4;
    return `必须是有效的 UUID v${version}`;
  }
}

export function IsUuidVersion(version?: 3 | 4 | 5, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [version],
      validator: IsUuidVersionConstraint,
    });
  };
}

// ==================== 枚举值验证（大小写不敏感）====================

@ValidatorConstraint({ name: 'isEnumCaseInsensitive', async: false })
export class IsEnumCaseInsensitiveConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    if (!value) return false;

    const enumObj = args.constraints[0];
    const enumValues = Object.values(enumObj).map((v) => String(v).toLowerCase());

    return enumValues.includes(value.toLowerCase());
  }

  defaultMessage(args: ValidationArguments) {
    const enumObj = args.constraints[0];
    const values = Object.values(enumObj).join(', ');
    return `值必须是以下之一: ${values}`;
  }
}

export function IsEnumCaseInsensitive(enumType: object, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [enumType],
      validator: IsEnumCaseInsensitiveConstraint,
    });
  };
}
