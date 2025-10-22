import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { QuotaClientService } from './quota-client.service';

/**
 * 配额守卫装饰器的元数据键
 */
export const QUOTA_CHECK_KEY = 'quotaCheck';

/**
 * 配额检查类型
 */
export enum QuotaCheckType {
  DEVICE_CREATION = 'device_creation', // 设备创建配额检查
  CONCURRENT_DEVICES = 'concurrent_devices', // 并发设备配额检查
  SKIP = 'skip', // 跳过配额检查
}

/**
 * 配额检查装饰器
 *
 * 用法:
 * @QuotaCheck(QuotaCheckType.DEVICE_CREATION)
 * async create(@Body() dto: CreateDeviceDto) { ... }
 */
export const QuotaCheck = (checkType: QuotaCheckType) =>
  SetMetadata(QUOTA_CHECK_KEY, checkType);

/**
 * QuotaGuard - 配额检查守卫
 *
 * 在设备创建等操作前检查用户配额是否充足
 */
@Injectable()
export class QuotaGuard implements CanActivate {
  private readonly logger = new Logger(QuotaGuard.name);

  constructor(
    private reflector: Reflector,
    private quotaClient: QuotaClientService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取方法上的配额检查类型
    const checkType = this.reflector.get(QuotaCheck, context.getHandler());

    // 如果没有配额检查装饰器，或者标记为跳过，则放行
    if (!checkType || checkType === QuotaCheckType.SKIP) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = this.extractUserId(request);

    if (!userId) {
      this.logger.warn('No userId found in request, skipping quota check');
      return true; // 如果无法获取用户ID，放行（由认证守卫处理）
    }

    try {
      switch (checkType) {
        case QuotaCheckType.DEVICE_CREATION:
          return await this.checkDeviceCreationQuota(request, userId);

        case QuotaCheckType.CONCURRENT_DEVICES:
          return await this.checkConcurrentQuota(userId);

        default:
          this.logger.warn(`Unknown quota check type: ${checkType}`);
          return true;
      }
    } catch (error) {
      this.logger.error(`Quota check failed: ${error.message}`, error.stack);
      throw new ForbiddenException(
        `配额检查失败: ${error.message}`,
      );
    }
  }

  /**
   * 从请求中提取用户 ID
   */
  private extractUserId(request: any): string | null {
    // 优先从 JWT token 中获取（假设经过 JWT 认证）
    if (request.user?.userId) {
      return request.user.userId;
    }

    // 从请求体中获取
    if (request.body?.userId) {
      return request.body.userId;
    }

    // 从查询参数中获取
    if (request.query?.userId) {
      return request.query.userId;
    }

    return null;
  }

  /**
   * 检查设备创建配额
   */
  private async checkDeviceCreationQuota(
    request: any,
    userId: string,
  ): Promise<boolean> {
    const deviceSpecs = {
      cpuCores: request.body?.cpuCores || 2,
      memoryMB: request.body?.memoryMB || 2048,
      storageMB: request.body?.storageMB || 8192,
    };

    this.logger.debug(
      `Checking device creation quota for user ${userId}: ${JSON.stringify(deviceSpecs)}`,
    );

    const result = await this.quotaClient.checkDeviceCreationQuota(
      userId,
      deviceSpecs,
    );

    if (!result.allowed) {
      this.logger.warn(
        `Device creation blocked for user ${userId}: ${result.reason}`,
      );
      throw new ForbiddenException(
        `设备创建失败: ${result.reason}`,
      );
    }

    // 将配额检查结果附加到请求对象，供后续使用
    request.quotaCheckResult = result;

    this.logger.log(
      `Device creation allowed for user ${userId}. Remaining: ${result.remainingDevices} devices`,
    );

    return true;
  }

  /**
   * 检查并发设备配额
   */
  private async checkConcurrentQuota(userId: string): Promise<boolean> {
    this.logger.debug(`Checking concurrent quota for user ${userId}`);

    const result = await this.quotaClient.checkConcurrentQuota(userId);

    if (!result.allowed) {
      this.logger.warn(
        `Concurrent device limit reached for user ${userId}: ${result.reason}`,
      );
      throw new ForbiddenException(
        `并发设备数已达上限: ${result.reason}`,
      );
    }

    return true;
  }
}
