import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { AuditLog, AuditAction, AuditLevel } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';

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
  method?: string;
  requestPath?: string;
  success?: boolean;
  errorMessage?: string;
}

// 前端期望的审计日志格式
export interface AuditLogResponseDto {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceType: string;
  resourceId?: string;
  method: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failed' | 'warning';
  details: string;
  changes?: {
    oldValue?: Record<string, any>;
    newValue?: Record<string, any>;
  };
  createdAt: string;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  /**
   * 获取用户名映射
   */
  private async getUserNameMap(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();

    const uniqueIds = [...new Set(userIds.filter(id => id))];
    const users = await this.userRepository.find({
      where: { id: In(uniqueIds) },
      select: ['id', 'username'],
    });

    const map = new Map<string, string>();
    users.forEach(user => map.set(user.id, user.username));
    return map;
  }

  /**
   * 将数据库实体转换为前端期望的格式
   */
  private convertToResponseDto(
    log: AuditLog,
    userNameMap: Map<string, string>
  ): AuditLogResponseDto {
    // 确定状态：success=true -> 'success', success=false -> 'failed', level=WARNING -> 'warning'
    let status: 'success' | 'failed' | 'warning' = 'success';
    if (!log.success) {
      status = 'failed';
    } else if (log.level === AuditLevel.WARNING) {
      status = 'warning';
    }

    // 生成资源名称（基于资源类型和ID）
    const resourceNames: Record<string, string> = {
      user: '用户',
      device: '设备',
      quota: '配额',
      balance: '余额',
      plan: '套餐',
      billing: '账单',
      ticket: '工单',
      apikey: 'API密钥',
      'api-key': 'API密钥',
      system: '系统',
      role: '角色',
      permission: '权限',
      auth: '认证',
      password: '密码',
    };
    const resource = log.resourceId
      ? `${resourceNames[log.resourceType] || log.resourceType} #${log.resourceId.substring(0, 8)}`
      : resourceNames[log.resourceType] || log.resourceType;

    // 处理占位符用户ID (登录前的操作)
    const placeholderUserId = '00000000-0000-0000-0000-000000000000';
    const isAnonymousAction = log.userId === placeholderUserId;
    const userName = isAnonymousAction
      ? '匿名用户'
      : (userNameMap.get(log.userId) || '未知用户');

    return {
      id: log.id,
      userId: log.userId,
      userName,
      action: log.action,
      resource,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      method: log.method || 'GET',
      ipAddress: log.ipAddress || '',
      userAgent: log.userAgent || '',
      status,
      details: log.description,
      changes: (log.oldValue || log.newValue) ? {
        oldValue: log.oldValue,
        newValue: log.newValue,
      } : undefined,
      createdAt: log.createdAt.toISOString(),
    };
  }

  /**
   * 批量转换审计日志
   */
  private async convertLogsToResponseDto(logs: AuditLog[]): Promise<AuditLogResponseDto[]> {
    const userIds = logs.map(log => log.userId);
    const userNameMap = await this.getUserNameMap(userIds);
    return logs.map(log => this.convertToResponseDto(log, userNameMap));
  }

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
      method: dto.method,
      requestPath: dto.requestPath,
      success: dto.success !== undefined ? dto.success : true,
      errorMessage: dto.errorMessage,
    });

    const savedLog = await this.auditLogRepository.save(log);

    // 如果是严重级别，记录到日志文件
    if (dto.level === AuditLevel.CRITICAL || dto.level === AuditLevel.ERROR) {
      this.logger.error(`[审计] ${dto.action} - ${dto.description} - 用户: ${dto.userId}`);
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
    }
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
    limit: number = 50
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
   * 搜索审计日志（返回前端期望的格式）
   */
  async searchLogsFormatted(options: {
    userId?: string;
    action?: AuditAction;
    level?: AuditLevel;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    status?: string;
    method?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogResponseDto[]; total: number }> {
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

    // 支持前端的 status 过滤
    if (options.status) {
      if (options.status === 'success') {
        queryBuilder.andWhere('log.success = :success AND log.level != :warningLevel', {
          success: true,
          warningLevel: AuditLevel.WARNING,
        });
      } else if (options.status === 'failed') {
        queryBuilder.andWhere('log.success = :success', { success: false });
      } else if (options.status === 'warning') {
        queryBuilder.andWhere('log.level = :level', { level: AuditLevel.WARNING });
      }
    } else if (options.success !== undefined) {
      queryBuilder.andWhere('log.success = :success', {
        success: options.success,
      });
    }

    // 支持 HTTP 方法过滤
    if (options.method) {
      queryBuilder.andWhere('log.method = :method', { method: options.method });
    }

    // 支持全文搜索（描述、操作）
    if (options.search) {
      queryBuilder.andWhere(
        '(log.description ILIKE :search OR log.action ILIKE :search)',
        { search: `%${options.search}%` }
      );
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

    // 转换为前端期望的格式
    const formattedLogs = await this.convertLogsToResponseDto(logs);

    return { logs: formattedLogs, total };
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

  /**
   * 导出审计日志为 CSV
   */
  async exportLogs(options: {
    userId?: string;
    action?: AuditAction;
    level?: AuditLevel;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
  }): Promise<string> {
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

    const logs = await queryBuilder.getMany();

    // 构建 CSV 头部
    const csvHeaders = [
      'ID',
      'User ID',
      'Action',
      'Level',
      'Resource Type',
      'Resource ID',
      'Description',
      'Success',
      'IP Address',
      'Created At',
    ];

    // 构建 CSV 行
    const csvRows = logs.map((log) => [
      log.id,
      log.userId,
      log.action,
      log.level,
      log.resourceType || '',
      log.resourceId || '',
      `"${log.description.replace(/"/g, '""')}"`, // 转义引号
      log.success ? 'Yes' : 'No',
      log.ipAddress || '',
      log.createdAt.toISOString(),
    ]);

    // 组合成 CSV 字符串
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row) => row.join(',')),
    ].join('\n');

    this.logger.log(`导出了 ${logs.length} 条审计日志`);
    return csvContent;
  }

  /**
   * 清理旧的审计日志
   */
  async cleanupOldLogs(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditLogRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    const deletedCount = result.affected || 0;
    this.logger.log(`清理了 ${deletedCount} 条审计日志（保留 ${daysToKeep} 天）`);

    return deletedCount;
  }

  /**
   * 获取单条审计日志详情
   */
  async getLogById(id: string): Promise<AuditLog> {
    const log = await this.auditLogRepository.findOne({ where: { id } });

    if (!log) {
      throw new NotFoundException(`审计日志 ${id} 未找到`);
    }

    return log;
  }
}
