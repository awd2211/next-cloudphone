import { HttpException, HttpStatus } from '@nestjs/common';

export enum BusinessErrorCode {
  // 通用错误 (1xxx)
  UNKNOWN_ERROR = 1000,
  INVALID_PARAMETER = 1001,
  OPERATION_FAILED = 1002,
  OPERATION_NOT_SUPPORTED = 1003,

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
  DEVICE_CREATION_FAILED = 3006,
  DEVICE_START_FAILED = 3007,
  DEVICE_STOP_FAILED = 3008,
  DEVICE_RESTART_FAILED = 3009,
  DEVICE_DELETE_FAILED = 3010,

  // 快照相关 (3xxx)
  SNAPSHOT_NOT_FOUND = 3011,
  SNAPSHOT_CREATION_FAILED = 3012,
  SNAPSHOT_RESTORE_FAILED = 3013,
  SNAPSHOT_NOT_READY = 3014,

  // 模板相关 (3xxx)
  TEMPLATE_NOT_FOUND = 3015,
  TEMPLATE_OPERATION_DENIED = 3016,

  // Docker 相关 (3xxx)
  DOCKER_CONTAINER_ERROR = 3020,
  DOCKER_IMAGE_PULL_FAILED = 3021,
  DOCKER_NETWORK_ERROR = 3022,
  DOCKER_OPERATION_FAILED = 3023,

  // ADB 相关 (3xxx)
  ADB_COMMAND_FAILED = 3030,
  ADB_TIMEOUT = 3031,
  ADB_DEVICE_OFFLINE = 3032,
  ADB_FILE_NOT_FOUND = 3033,
  ADB_OPERATION_FAILED = 3034,

  // 调度器相关 (3xxx)
  NODE_NOT_FOUND = 3040,
  NODE_ALREADY_EXISTS = 3041,
  NODE_NOT_AVAILABLE = 3042,
  NO_AVAILABLE_NODES = 3043,

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

/**
 * 恢复建议
 */
export interface RecoverySuggestion {
  /** 操作名称（如"升级套餐"、"清理资源"） */
  action: string;
  /** 操作描述 */
  description: string;
  /** 操作链接（前端路由或外部URL） */
  actionUrl?: string;
}

export interface BusinessExceptionResponse {
  success: false;
  errorCode: BusinessErrorCode;
  /** 技术消息（原有的message，用于日志） */
  message: string;
  /** 用户友好的错误消息 */
  userMessage?: string;
  /** 技术详情消息 */
  technicalMessage?: string;
  requestId?: string;
  timestamp?: string;
  path?: string;
  details?: any;
  /** 恢复建议列表 */
  recoverySuggestions?: RecoverySuggestion[];
  /** 文档链接 */
  documentationUrl?: string;
  /** 技术支持链接 */
  supportUrl?: string;
  /** 是否可重试 */
  retryable?: boolean;
}

export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: BusinessErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly requestId?: string,
    options?: {
      details?: any;
      userMessage?: string;
      technicalMessage?: string;
      recoverySuggestions?: RecoverySuggestion[];
      documentationUrl?: string;
      supportUrl?: string;
      retryable?: boolean;
    }
  ) {
    const response: BusinessExceptionResponse = {
      success: false,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
    };

    if (requestId) {
      response.requestId = requestId;
    }

    if (options) {
      if (options.details) response.details = options.details;
      if (options.userMessage) response.userMessage = options.userMessage;
      if (options.technicalMessage) response.technicalMessage = options.technicalMessage;
      if (options.recoverySuggestions) response.recoverySuggestions = options.recoverySuggestions;
      if (options.documentationUrl) response.documentationUrl = options.documentationUrl;
      if (options.supportUrl) response.supportUrl = options.supportUrl;
      if (options.retryable !== undefined) response.retryable = options.retryable;
    }

    // 如果没有设置userMessage，使用message作为默认值
    if (!response.userMessage) {
      response.userMessage = message;
    }

    // 如果没有设置technicalMessage，使用message作为默认值
    if (!response.technicalMessage) {
      response.technicalMessage = message;
    }

    super(response, statusCode);
  }

  /**
   * 设置请求路径（由过滤器设置）
   */
  setPath(path: string): void {
    const response = this.getResponse() as BusinessExceptionResponse;
    response.path = path;
  }
}

// 便捷工厂函数
export class BusinessErrors {
  static userNotFound(userId: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.USER_NOT_FOUND,
      `用户不存在: ${userId}`,
      HttpStatus.NOT_FOUND
    );
  }

  static deviceNotFound(deviceId: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.DEVICE_NOT_FOUND,
      `设备不存在: ${deviceId}`,
      HttpStatus.NOT_FOUND,
      undefined,
      {
        userMessage: '设备不存在或已被删除',
        technicalMessage: `Device not found: ${deviceId}`,
        recoverySuggestions: [
          {
            action: '刷新列表',
            description: '刷新设备列表查看最新状态',
            actionUrl: '/devices',
          },
          {
            action: '创建新设备',
            description: '如果设备已删除，可以创建新设备',
            actionUrl: '/devices/create',
          },
        ],
        retryable: false,
      }
    );
  }

  static deviceNotAvailable(deviceId: string, reason?: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.DEVICE_NOT_AVAILABLE,
      `设备不可用: ${deviceId}`,
      HttpStatus.CONFLICT,
      undefined,
      {
        userMessage: '设备当前不可用',
        technicalMessage: `Device unavailable: ${deviceId}${reason ? ` - ${reason}` : ''}`,
        recoverySuggestions: [
          {
            action: '稍后重试',
            description: '设备可能正在处理其他操作，请稍后再试',
          },
          {
            action: '查看设备详情',
            description: '查看设备详细状态了解具体原因',
            actionUrl: `/devices/${deviceId}`,
          },
        ],
        retryable: true,
      }
    );
  }

  static appNotFound(appId: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.APP_NOT_FOUND,
      `应用不存在: ${appId}`,
      HttpStatus.NOT_FOUND
    );
  }

  static insufficientBalance(
    userId: string,
    required?: number,
    current?: number
  ): BusinessException {
    const detailMsg = required && current ? ` (需要: ¥${required}, 当前: ¥${current})` : '';
    return new BusinessException(
      BusinessErrorCode.INSUFFICIENT_BALANCE,
      `账户余额不足: ${userId}${detailMsg}`,
      HttpStatus.PAYMENT_REQUIRED,
      undefined,
      {
        userMessage: '账户余额不足，无法完成操作',
        technicalMessage: `Insufficient balance for user ${userId}${detailMsg}`,
        recoverySuggestions: [
          {
            action: '立即充值',
            description: '前往充值页面为账户充值',
            actionUrl: '/billing/recharge',
          },
          {
            action: '查看账单',
            description: '查看账单明细了解余额使用情况',
            actionUrl: '/billing/invoices',
          },
          {
            action: '联系客服',
            description: '如有疑问请联系客服',
            actionUrl: '/support',
          },
        ],
        documentationUrl: 'https://docs.cloudphone.run/billing',
        supportUrl: '/support/tickets/new',
        retryable: false,
      }
    );
  }

  static quotaExceeded(resource: string, userId?: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.QUOTA_EXCEEDED,
      `资源配额已超限: ${resource}`,
      HttpStatus.FORBIDDEN,
      undefined,
      {
        userMessage: `您的${resource}配额已用完`,
        technicalMessage: `User ${userId || 'unknown'} exceeded ${resource} quota`,
        recoverySuggestions: [
          {
            action: '升级套餐',
            description: '升级到更高级的套餐以获得更多配额',
            actionUrl: '/plans/upgrade',
          },
          {
            action: '清理资源',
            description: '删除不需要的设备以释放配额',
            actionUrl: '/devices',
          },
          {
            action: '联系支持',
            description: '联系客服申请临时配额提升',
            actionUrl: '/support/tickets/new',
          },
        ],
        documentationUrl: 'https://docs.cloudphone.run/quotas',
        supportUrl: '/support/tickets/new',
        retryable: false,
      }
    );
  }

  static serviceUnavailable(service: string, estimatedRecoveryTime?: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.SERVICE_UNAVAILABLE,
      `服务不可用: ${service}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      undefined,
      {
        userMessage: `${service}服务暂时不可用，请稍后重试`,
        technicalMessage: `Service unavailable: ${service}${estimatedRecoveryTime ? ` (estimated recovery: ${estimatedRecoveryTime})` : ''}`,
        recoverySuggestions: [
          {
            action: '稍后重试',
            description: '服务可能正在维护或重启，请稍后重试',
          },
          {
            action: '查看状态页',
            description: '查看系统状态页了解服务情况',
            actionUrl: '/system/status',
          },
          {
            action: '联系技术支持',
            description: '如果问题持续存在，请联系技术支持',
            actionUrl: '/support/tickets/new',
          },
        ],
        documentationUrl: 'https://docs.cloudphone.run/troubleshooting',
        supportUrl: '/support/tickets/new',
        retryable: true,
      }
    );
  }

  // 快照相关
  static snapshotNotFound(snapshotId: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.SNAPSHOT_NOT_FOUND,
      `快照不存在: ${snapshotId}`,
      HttpStatus.NOT_FOUND
    );
  }

  static snapshotNotReady(snapshotId: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.SNAPSHOT_NOT_READY,
      `快照未就绪: ${snapshotId}`,
      HttpStatus.BAD_REQUEST
    );
  }

  // 模板相关
  static templateNotFound(templateId: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.TEMPLATE_NOT_FOUND,
      `模板不存在: ${templateId}`,
      HttpStatus.NOT_FOUND
    );
  }

  static templateOperationDenied(reason: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.TEMPLATE_OPERATION_DENIED,
      reason,
      HttpStatus.FORBIDDEN
    );
  }

  // ADB 相关
  static adbOperationFailed(message: string, details?: any): BusinessException {
    return new BusinessException(
      BusinessErrorCode.ADB_OPERATION_FAILED,
      `ADB 操作失败: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      details
    );
  }

  static adbDeviceOffline(deviceId: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.ADB_DEVICE_OFFLINE,
      `设备离线: ${deviceId}`,
      HttpStatus.NOT_FOUND
    );
  }

  static adbFileNotFound(path: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.ADB_FILE_NOT_FOUND,
      `文件不存在: ${path}`,
      HttpStatus.NOT_FOUND
    );
  }

  // 调度器相关
  static nodeNotFound(nodeId: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.NODE_NOT_FOUND,
      `节点不存在: ${nodeId}`,
      HttpStatus.NOT_FOUND
    );
  }

  static nodeAlreadyExists(nodeName: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.NODE_ALREADY_EXISTS,
      `节点已存在: ${nodeName}`,
      HttpStatus.BAD_REQUEST
    );
  }

  static noAvailableNodes(): BusinessException {
    return new BusinessException(
      BusinessErrorCode.NO_AVAILABLE_NODES,
      '没有可用的节点',
      HttpStatus.BAD_REQUEST
    );
  }

  static nodeNotAvailable(nodeId: string, reason: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.NODE_NOT_AVAILABLE,
      `节点不可用 ${nodeId}: ${reason}`,
      HttpStatus.BAD_REQUEST
    );
  }

  // Docker 相关
  static dockerOperationFailed(message: string, details?: any): BusinessException {
    return new BusinessException(
      BusinessErrorCode.DOCKER_OPERATION_FAILED,
      `Docker 操作失败: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      details
    );
  }
}
