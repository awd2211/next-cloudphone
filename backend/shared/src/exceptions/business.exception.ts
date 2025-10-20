import { HttpException, HttpStatus } from '@nestjs/common';

export enum BusinessErrorCode {
  // 通用错误 (1xxx)
  UNKNOWN_ERROR = 1000,
  INVALID_PARAMETER = 1001,
  OPERATION_FAILED = 1002,

  // 用户相关 (2xxx)
  USER_NOT_FOUND = 2001,
  USER_ALREADY_EXISTS = 2002,
  USER_DISABLED = 2003,
  INVALID_CREDENTIALS = 2004,
  INSUFFICIENT_PERMISSIONS = 2005,

  // 设备相关 (3xxx)
  DEVICE_NOT_FOUND = 3001,
  DEVICE_NOT_AVAILABLE = 3002,
  DEVICE_OFFLINE = 3003,
  DEVICE_LIMIT_EXCEEDED = 3004,
  ADB_CONNECTION_FAILED = 3005,

  // 应用相关 (4xxx)
  APP_NOT_FOUND = 4001,
  APP_ALREADY_INSTALLED = 4002,
  APP_INSTALL_FAILED = 4003,
  APP_UNINSTALL_FAILED = 4004,
  INVALID_APK = 4005,

  // 计费相关 (5xxx)
  ORDER_NOT_FOUND = 5001,
  PAYMENT_FAILED = 5002,
  INSUFFICIENT_BALANCE = 5003,
  PLAN_NOT_FOUND = 5004,
  QUOTA_EXCEEDED = 5005,

  // 系统相关 (9xxx)
  SERVICE_UNAVAILABLE = 9001,
  DATABASE_ERROR = 9002,
  NETWORK_ERROR = 9003,
  FILE_SYSTEM_ERROR = 9004,
}

export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: BusinessErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        success: false,
        errorCode,
        message,
      },
      statusCode,
    );
  }
}

// 便捷工厂函数
export class BusinessErrors {
  static userNotFound(userId: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.USER_NOT_FOUND,
      `用户不存在: ${userId}`,
      HttpStatus.NOT_FOUND,
    );
  }

  static deviceNotFound(deviceId: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.DEVICE_NOT_FOUND,
      `设备不存在: ${deviceId}`,
      HttpStatus.NOT_FOUND,
    );
  }

  static deviceNotAvailable(deviceId: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.DEVICE_NOT_AVAILABLE,
      `设备不可用: ${deviceId}`,
      HttpStatus.CONFLICT,
    );
  }

  static appNotFound(appId: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.APP_NOT_FOUND,
      `应用不存在: ${appId}`,
      HttpStatus.NOT_FOUND,
    );
  }

  static insufficientBalance(userId: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.INSUFFICIENT_BALANCE,
      `账户余额不足: ${userId}`,
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  static quotaExceeded(resource: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.QUOTA_EXCEEDED,
      `资源配额已超限: ${resource}`,
      HttpStatus.FORBIDDEN,
    );
  }

  static serviceUnavailable(service: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.SERVICE_UNAVAILABLE,
      `服务不可用: ${service}`,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
