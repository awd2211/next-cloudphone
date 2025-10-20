import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditLevel } from '../entities/audit-log.entity';

export interface CreateAuditLogDto {
  userId: string;
  targetUserId?: string;
  action: AuditAction;
  level?: AuditLevel;
  resourceType: string;
  resourceId?: string;
  description: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  success?: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * 创建审计日志
   */
  async createLog(dto: CreateAuditLogDto): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      userId: dto.userId,
      targetUserId: dto.targetUserId,
      action: dto.action,
      level: dto.level || AuditLevel.INFO,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      description: dto.description,
      oldValue: dto.oldValue,
      newValue: dto.newValue,
      metadata: dto.metadata,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      requestId: dto.requestId,
      success: dto.success !== undefined ? dto.success : true,
      errorMessage: dto.errorMessage,
    });

    const savedLog = await this.auditLogRepository.save(log);

    // 如果是严重级别，记录到日志文件
    if (dto.level === AuditLevel.CRITICAL || dto.level === AuditLevel.ERROR) {
      this.logger.error(
        `[审计] ${dto.action} - ${dto.description} - 用户: ${dto.userId}`,
      );
    }

    return savedLog;
  }

  /**
   * 获取用户审计日志
   */
  async getUserLogs(
    userId: string,
    options?: {
      action?: AuditAction;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId });

    if (options?.action) {
      queryBuilder.andWhere('log.action = :action', { action: options.action });
    }

    if (options?.resourceType) {
      queryBuilder.andWhere('log.resourceType = :resourceType', {
        resourceType: options.resourceType,
      });
    }

    if (options?.startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', {
        endDate: options.endDate,
      });
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');

    const total = await queryBuilder.getCount();

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    const logs = await queryBuilder.getMany();

    return { logs, total };
  }

  /**
   * 获取资源的审计日志
   */
  async getResourceLogs(
    resourceType: string,
    resourceId: string,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    return await this.auditLogRepository.find({
      where: { resourceType, resourceId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 搜索审计日志（管理员）
   */
  async searchLogs(options: {
    userId?: string;
    action?: AuditAction;
    level?: AuditLevel;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('log');

    if (options.userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId: options.userId });
    }

    if (options.action) {
      queryBuilder.andWhere('log.action = :action', { action: options.action });
    }

    if (options.level) {
      queryBuilder.andWhere('log.level = :level', { level: options.level });
    }

    if (options.resourceType) {
      queryBuilder.andWhere('log.resourceType = :resourceType', {
        resourceType: options.resourceType,
      });
    }

    if (options.resourceId) {
      queryBuilder.andWhere('log.resourceId = :resourceId', {
        resourceId: options.resourceId,
      });
    }

    if (options.ipAddress) {
      queryBuilder.andWhere('log.ipAddress = :ipAddress', {
        ipAddress: options.ipAddress,
      });
    }

    if (options.startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options.endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', {
        endDate: options.endDate,
      });
    }

    if (options.success !== undefined) {
      queryBuilder.andWhere('log.success = :success', {
        success: options.success,
      });
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');

    const total = await queryBuilder.getCount();

    if (options.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options.offset) {
      queryBuilder.offset(options.offset);
    }

    const logs = await queryBuilder.getMany();

    return { logs, total };
  }

  /**
   * 获取统计信息
   */
  async getStatistics(userId?: string): Promise<{
    totalLogs: number;
    byAction: Record<string, number>;
    byLevel: Record<string, number>;
    successRate: number;
    recentFailures: AuditLog[];
  }> {
    const where = userId ? { userId } : {};

    const totalLogs = await this.auditLogRepository.count({ where });

    // 按操作类型统计
    const byAction: Record<string, number> = {};
    for (const action of Object.values(AuditAction)) {
      const count = await this.auditLogRepository.count({
        where: { ...where, action },
      });
      if (count > 0) {
        byAction[action] = count;
      }
    }

    // 按级别统计
    const byLevel: Record<string, number> = {};
    for (const level of Object.values(AuditLevel)) {
      byLevel[level] = await this.auditLogRepository.count({
        where: { ...where, level },
      });
    }

    // 成功率
    const successCount = await this.auditLogRepository.count({
      where: { ...where, success: true },
    });
    const successRate = totalLogs > 0 ? (successCount / totalLogs) * 100 : 0;

    // 最近失败的日志
    const recentFailures = await this.auditLogRepository.find({
      where: { ...where, success: false },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      totalLogs,
      byAction,
      byLevel,
      successRate,
      recentFailures,
    };
  }
}
