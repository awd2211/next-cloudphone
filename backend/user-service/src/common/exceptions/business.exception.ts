import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 业务错误码枚举
 */
export enum BusinessErrorCode {
  // 通用错误 (1000-1999)
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  OPERATION_FAILED = 'OPERATION_FAILED',

  // 用户相关错误 (2000-2999)
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  USER_INACTIVE = 'USER_INACTIVE',
  USER_DELETED = 'USER_DELETED',
  USER_LOCKED = 'USER_LOCKED',

  // 认证相关错误 (3000-3999)
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  UNAUTHORIZED = 'UNAUTHORIZED',
  PASSWORD_INCORRECT = 'PASSWORD_INCORRECT',
  PASSWORD_WEAK = 'PASSWORD_WEAK',

  // 权限相关错误 (4000-4999)
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // 业务逻辑错误 (5000-5999)
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS',
  PHONE_ALREADY_EXISTS = 'PHONE_ALREADY_EXISTS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',

  // 外部服务错误 (6000-6999)
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  QUEUE_ERROR = 'QUEUE_ERROR',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
}

/**
 * 错误码到 HTTP 状态码的映射
 */
const errorCodeToHttpStatus: Record<BusinessErrorCode, HttpStatus> = {
  // 通用错误
  [BusinessErrorCode.UNKNOWN_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [BusinessErrorCode.INVALID_PARAMETER]: HttpStatus.BAD_REQUEST,
  [BusinessErrorCode.RESOURCE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [BusinessErrorCode.OPERATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // 用户相关错误
  [BusinessErrorCode.USER_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [BusinessErrorCode.USER_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [BusinessErrorCode.USER_INACTIVE]: HttpStatus.FORBIDDEN,
  [BusinessErrorCode.USER_DELETED]: HttpStatus.GONE,
  [BusinessErrorCode.USER_LOCKED]: HttpStatus.LOCKED,

  // 认证相关错误
  [BusinessErrorCode.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
  [BusinessErrorCode.TOKEN_EXPIRED]: HttpStatus.UNAUTHORIZED,
  [BusinessErrorCode.TOKEN_INVALID]: HttpStatus.UNAUTHORIZED,
  [BusinessErrorCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [BusinessErrorCode.PASSWORD_INCORRECT]: HttpStatus.UNAUTHORIZED,
  [BusinessErrorCode.PASSWORD_WEAK]: HttpStatus.BAD_REQUEST,

  // 权限相关错误
  [BusinessErrorCode.PERMISSION_DENIED]: HttpStatus.FORBIDDEN,
  [BusinessErrorCode.ROLE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [BusinessErrorCode.INSUFFICIENT_PERMISSIONS]: HttpStatus.FORBIDDEN,

  // 业务逻辑错误
  [BusinessErrorCode.EMAIL_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [BusinessErrorCode.USERNAME_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [BusinessErrorCode.PHONE_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [BusinessErrorCode.ACCOUNT_LOCKED]: HttpStatus.LOCKED,
  [BusinessErrorCode.TOO_MANY_ATTEMPTS]: HttpStatus.TOO_MANY_REQUESTS,

  // 外部服务错误
  [BusinessErrorCode.DATABASE_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [BusinessErrorCode.CACHE_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [BusinessErrorCode.QUEUE_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [BusinessErrorCode.EMAIL_SEND_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
};

/**
 * 业务异常类
 * 用于统一处理业务逻辑中的错误
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly code: BusinessErrorCode,
    message: string,
    public readonly details?: any
  ) {
    const httpStatus = errorCodeToHttpStatus[code] || HttpStatus.INTERNAL_SERVER_ERROR;

    super(
      {
        success: false,
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      httpStatus
    );
  }

  /**
   * 便捷工厂方法
   */
  static userNotFound(userId?: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.USER_NOT_FOUND,
      `用户不存在${userId ? `: ${userId}` : ''}`,
      { userId }
    );
  }

  static userAlreadyExists(
    field: 'username' | 'email' | 'phone',
    value: string
  ): BusinessException {
    return new BusinessException(
      BusinessErrorCode.USER_ALREADY_EXISTS,
      `${field === 'username' ? '用户名' : field === 'email' ? '邮箱' : '手机号'}已存在`,
      { field, value }
    );
  }

  static accountLocked(lockedUntil: Date): BusinessException {
    const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
    return new BusinessException(
      BusinessErrorCode.ACCOUNT_LOCKED,
      `账户已被锁定，请在 ${minutes} 分钟后重试`,
      { lockedUntil: lockedUntil.toISOString(), remainingMinutes: minutes }
    );
  }

  static invalidCredentials(): BusinessException {
    return new BusinessException(BusinessErrorCode.INVALID_CREDENTIALS, '用户名或密码错误');
  }

  static permissionDenied(permission?: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.PERMISSION_DENIED,
      `权限不足${permission ? `: 需要 ${permission} 权限` : ''}`,
      { requiredPermission: permission }
    );
  }
}
