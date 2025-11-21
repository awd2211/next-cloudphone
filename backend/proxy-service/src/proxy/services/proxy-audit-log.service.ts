import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, MoreThan } from 'typeorm';
import { ProxyAuditLog, ProxySensitiveAuditLog } from '../entities';
import * as crypto from 'crypto';
import * as ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 代理审计日志服务
 *
 * 功能：
 * 1. 审计日志记录和查询
 * 2. 敏感数据审计（加密存储）
 * 3. 用户活动分析
 * 4. 审计统计和合规性报告
 */
@Injectable()
export class ProxyAuditLogService {
  private readonly logger = new Logger(ProxyAuditLogService.name);
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(ProxyAuditLog)
    private auditLogRepo: Repository<ProxyAuditLog>,
    @InjectRepository(ProxySensitiveAuditLog)
    private sensitiveLogRepo: Repository<ProxySensitiveAuditLog>,
  ) {
    // 从环境变量获取加密密钥
    this.encryptionKey = process.env.AUDIT_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  // ==================== 审计日志记录 ====================

  /**
   * 记录审计日志
   */
  async createAuditLog(params: {
    userId: string;
    deviceId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: any;
    requestData?: any;
    responseData?: any;
    ipAddress?: string;
    userAgent?: string;
    riskLevel?: string;
    success?: boolean;
    errorMessage?: string;
  }): Promise<ProxyAuditLog> {
    const log = this.auditLogRepo.create({
      ...params,
      riskLevel: params.riskLevel || 'low',
      success: params.success ?? true,
    });

    await this.auditLogRepo.save(log);

    // 如果是高风险操作，额外记录告警
    if (params.riskLevel === 'high' || params.riskLevel === 'critical') {
      this.logger.warn(
        `High-risk operation detected: ${params.action} by user ${params.userId}`,
      );
    }

    return log;
  }

  /**
   * 记录敏感数据审计日志
   */
  async createSensitiveAuditLog(params: {
    userId: string;
    action: string;
    dataType: string;
    dataId?: string;
    accessPurpose: string;
    sensitiveData?: any;
    ipAddress?: string;
    requiresApproval?: boolean;
    approvalStatus?: string;
  }): Promise<ProxySensitiveAuditLog> {
    // 加密敏感数据
    const encryptedData = params.sensitiveData
      ? this.encryptData(JSON.stringify(params.sensitiveData))
      : null;

    const log = this.sensitiveLogRepo.create({
      ...params,
      encryptedData,
      encryptionAlgorithm: 'AES-256-GCM',
      requiresApproval: params.requiresApproval ?? false,
      approvalStatus: params.approvalStatus || 'pending',
    });

    await this.sensitiveLogRepo.save(log);

    this.logger.log(`Sensitive data access logged: ${params.action} by user ${params.userId}`);

    return log;
  }

  /**
   * 加密数据 (AES-256-GCM)
   */
  private encryptData(data: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 返回 iv:authTag:encrypted 格式
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * 解密数据
   */
  private decryptData(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt data', error);
      throw new Error('Decryption failed');
    }
  }

  // ==================== 审计日志查询 ====================

  /**
   * 查询审计日志
   */
  async queryAuditLogs(params: {
    userId?: string;
    deviceId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    riskLevel?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ logs: ProxyAuditLog[]; total: number }> {
    const whereConditions: any = {};

    if (params.userId) whereConditions.userId = params.userId;
    if (params.deviceId) whereConditions.deviceId = params.deviceId;
    if (params.action) whereConditions.action = params.action;
    if (params.resourceType) whereConditions.resourceType = params.resourceType;
    if (params.resourceId) whereConditions.resourceId = params.resourceId;
    if (params.riskLevel) whereConditions.riskLevel = params.riskLevel;
    if (params.success !== undefined) whereConditions.success = params.success;

    if (params.startDate && params.endDate) {
      whereConditions.createdAt = Between(params.startDate, params.endDate);
    }

    const page = params.page || 1;
    const limit = params.limit || 50;
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'DESC';

    const [logs, total] = await this.auditLogRepo.findAndCount({
      where: whereConditions,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { logs, total };
  }

  /**
   * 获取审计日志详情
   */
  async getAuditLog(logId: string): Promise<ProxyAuditLog> {
    const log = await this.auditLogRepo.findOne({ where: { id: logId } });

    if (!log) {
      throw new NotFoundException(`Audit log ${logId} not found`);
    }

    return log;
  }

  /**
   * 查询敏感审计日志
   */
  async querySensitiveAuditLogs(
    requestUserId: string,
    params: {
      userId?: string;
      action?: string;
      dataType?: string;
      accessPurpose?: string;
      requiresApproval?: boolean;
      approvalStatus?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{ logs: ProxySensitiveAuditLog[]; total: number }> {
    // 权限检查：只有管理员或审计员可以查看敏感日志
    // 这里简单检查用户ID是否有审计权限（实际应通过 user-service 验证）
    const hasAuditPermission = await this.checkAuditPermission(requestUserId);
    if (!hasAuditPermission) {
      this.logger.warn(`User ${requestUserId} attempted to access sensitive audit logs without permission`);
      throw new ForbiddenException('Access to sensitive audit logs denied. Requires auditor or admin role.');
    }

    const whereConditions: any = {};

    if (params.userId) whereConditions.userId = params.userId;
    if (params.action) whereConditions.action = params.action;
    if (params.dataType) whereConditions.dataType = params.dataType;
    if (params.accessPurpose) whereConditions.accessPurpose = params.accessPurpose;
    if (params.requiresApproval !== undefined) whereConditions.requiresApproval = params.requiresApproval;
    if (params.approvalStatus) whereConditions.approvalStatus = params.approvalStatus;

    if (params.startDate && params.endDate) {
      whereConditions.accessedAt = Between(params.startDate, params.endDate);
    }

    const page = params.page || 1;
    const limit = params.limit || 50;

    const [logs, total] = await this.sensitiveLogRepo.findAndCount({
      where: whereConditions,
      order: { accessedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 记录敏感日志的查询操作
    await this.createAuditLog({
      userId: requestUserId,
      action: 'sensitive_audit_log.query',
      resourceType: 'audit_log',
      details: { queryParams: params },
      riskLevel: 'high',
    });

    return { logs, total };
  }

  /**
   * 解密并获取敏感日志详情
   */
  async getSensitiveAuditLogDetails(
    requestUserId: string,
    logId: string,
  ): Promise<ProxySensitiveAuditLog & { decryptedData?: any }> {
    const log = await this.sensitiveLogRepo.findOne({ where: { id: logId } });

    if (!log) {
      throw new NotFoundException(`Sensitive audit log ${logId} not found`);
    }

    // 解密敏感数据
    let decryptedData: any = null;
    if (log.encryptedData) {
      try {
        const decrypted = this.decryptData(log.encryptedData);
        decryptedData = JSON.parse(decrypted);
      } catch (error) {
        this.logger.error(`Failed to decrypt sensitive log ${logId}`, error);
      }
    }

    // 记录敏感数据访问
    await this.createSensitiveAuditLog({
      userId: requestUserId,
      action: 'sensitive_audit_log.view',
      dataType: 'audit_log',
      dataId: logId,
      accessPurpose: 'audit_review',
      ipAddress: '', // 需要从请求中获取
      requiresApproval: true,
    });

    return { ...log, decryptedData };
  }

  /**
   * 审批敏感日志访问
   */
  async approveSensitiveAccess(
    approverId: string,
    logId: string,
    decision: 'approve' | 'reject',
    approvalNote?: string,
  ): Promise<ProxySensitiveAuditLog> {
    const log = await this.sensitiveLogRepo.findOne({ where: { id: logId } });

    if (!log) {
      throw new NotFoundException(`Sensitive audit log ${logId} not found`);
    }

    log.approvalStatus = decision === 'approve' ? 'approved' : 'rejected';
    log.approvedBy = approverId;
    log.approvedAt = new Date();
    log.approvalNote = approvalNote || '';

    await this.sensitiveLogRepo.save(log);

    this.logger.log(`Sensitive access ${decision}d: ${logId} by ${approverId}`);

    return log;
  }

  // ==================== 统计分析 ====================

  /**
   * 获取审计日志统计
   */
  async getAuditLogStatistics(
    userId?: string,
    days: number = 7,
  ): Promise<{
    totalLogs: number;
    todayLogs: number;
    byAction: Record<string, number>;
    byResourceType: Record<string, number>;
    byRiskLevel: { low: number; medium: number; high: number; critical: number };
    failedOperations: number;
    successRate: number;
    recentTrend: Array<{ date: string; count: number; failedCount: number }>;
    highRiskUsers: Array<{ userId: string; riskScore: number; recentHighRiskActions: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const whereConditions: any = {
      createdAt: Between(startDate, new Date()),
    };

    if (userId) {
      whereConditions.userId = userId;
    }

    const logs = await this.auditLogRepo.find({ where: whereConditions });

    // 今日日志
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter((log) => log.createdAt >= todayStart).length;

    // 按操作类型统计
    const byAction = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 按资源类型统计
    const byResourceType = logs.reduce((acc, log) => {
      acc[log.resourceType] = (acc[log.resourceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 按风险级别统计
    const byRiskLevel = {
      low: logs.filter((l) => l.riskLevel === 'low').length,
      medium: logs.filter((l) => l.riskLevel === 'medium').length,
      high: logs.filter((l) => l.riskLevel === 'high').length,
      critical: logs.filter((l) => l.riskLevel === 'critical').length,
    };

    // 失败操作统计
    const failedOperations = logs.filter((l) => !l.success).length;
    const successRate = logs.length > 0
      ? ((logs.length - failedOperations) / logs.length) * 100
      : 100;

    // 趋势分析
    const trendMap = new Map<string, { count: number; failedCount: number }>();
    logs.forEach((log) => {
      const date = log.createdAt.toISOString().split('T')[0];
      const current = trendMap.get(date) || { count: 0, failedCount: 0 };
      current.count++;
      if (!log.success) current.failedCount++;
      trendMap.set(date, current);
    });

    const recentTrend = Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 高风险用户分析
    const userRiskMap = new Map<string, { highRiskCount: number; totalCount: number }>();
    logs.forEach((log) => {
      if (!log.userId) return;
      const current = userRiskMap.get(log.userId) || { highRiskCount: 0, totalCount: 0 };
      current.totalCount++;
      if (log.riskLevel === 'high' || log.riskLevel === 'critical') {
        current.highRiskCount++;
      }
      userRiskMap.set(log.userId, current);
    });

    const highRiskUsers = Array.from(userRiskMap.entries())
      .map(([userId, data]) => ({
        userId,
        riskScore: (data.highRiskCount / data.totalCount) * 100,
        recentHighRiskActions: data.highRiskCount,
      }))
      .filter((user) => user.riskScore > 20)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    return {
      totalLogs: logs.length,
      todayLogs,
      byAction,
      byResourceType,
      byRiskLevel,
      failedOperations,
      successRate,
      recentTrend,
      highRiskUsers,
    };
  }

  /**
   * 用户活动分析
   */
  async analyzeUserActivity(
    userId: string,
    days: number = 30,
  ): Promise<{
    userId: string;
    totalActions: number;
    lastActiveAt: Date;
    topActions: Array<{ action: string; count: number; percentage: number }>;
    riskScore: number;
    anomalies: Array<{ type: string; description: string; detectedAt: Date; severity: string }>;
    activityDistribution: { byHour: Record<number, number>; byDayOfWeek: Record<string, number> };
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.auditLogRepo.find({
      where: {
        userId,
        createdAt: Between(startDate, new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (logs.length === 0) {
      return {
        userId,
        totalActions: 0,
        lastActiveAt: new Date(),
        topActions: [],
        riskScore: 0,
        anomalies: [],
        activityDistribution: { byHour: {}, byDayOfWeek: {} },
      };
    }

    // 最后活跃时间
    const lastActiveAt = logs[0].createdAt;

    // 按操作统计
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({
        action,
        count,
        percentage: (count / logs.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 风险评分
    const highRiskCount = logs.filter((l) => l.riskLevel === 'high' || l.riskLevel === 'critical').length;
    const failedCount = logs.filter((l) => !l.success).length;
    const riskScore = ((highRiskCount + failedCount) / logs.length) * 100;

    // 异常检测
    const anomalies: Array<{ type: string; description: string; detectedAt: Date; severity: string }> = [];

    // 检测短时间内大量失败操作
    const recentFailed = logs.filter((l) => !l.success && new Date().getTime() - l.createdAt.getTime() < 3600000);
    if (recentFailed.length > 10) {
      anomalies.push({
        type: 'excessive_failures',
        description: `${recentFailed.length} failed operations in the last hour`,
        detectedAt: new Date(),
        severity: 'high',
      });
    }

    // 活动时间分布
    const byHour: Record<number, number> = {};
    const byDayOfWeek: Record<string, number> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    logs.forEach((log) => {
      const hour = log.createdAt.getHours();
      const day = dayNames[log.createdAt.getDay()];
      byHour[hour] = (byHour[hour] || 0) + 1;
      byDayOfWeek[day] = (byDayOfWeek[day] || 0) + 1;
    });

    return {
      userId,
      totalActions: logs.length,
      lastActiveAt,
      topActions,
      riskScore,
      anomalies,
      activityDistribution: { byHour, byDayOfWeek },
    };
  }

  /**
   * 系统审计摘要
   */
  async getSystemAuditSummary(days: number = 7): Promise<{
    activeUsers: number;
    totalOperations: number;
    highRiskOperations: number;
    failedOperations: number;
    byResourceType: Record<string, number>;
    byAction: Record<string, number>;
    peakHours: Array<{ hour: number; operationCount: number }>;
    complianceMetrics: {
      auditCoverage: number;
      sensitiveDataAccess: number;
      approvalComplianceRate: number;
    };
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [logs, sensitiveLogs] = await Promise.all([
      this.auditLogRepo.find({
        where: { createdAt: Between(startDate, new Date()) },
      }),
      this.sensitiveLogRepo.find({
        where: { accessedAt: Between(startDate, new Date()) },
      }),
    ]);

    // 活跃用户数
    const activeUsers = new Set(logs.map((l) => l.userId).filter(Boolean)).size;

    // 高风险操作数
    const highRiskOperations = logs.filter(
      (l) => l.riskLevel === 'high' || l.riskLevel === 'critical',
    ).length;

    // 失败操作数
    const failedOperations = logs.filter((l) => !l.success).length;

    // 按资源类型统计
    const byResourceType = logs.reduce((acc, log) => {
      acc[log.resourceType] = (acc[log.resourceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 按操作类型统计
    const byAction = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 峰值时段分析
    const hourCounts: Record<number, number> = {};
    logs.forEach((log) => {
      const hour = log.createdAt.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), operationCount: count }))
      .sort((a, b) => b.operationCount - a.operationCount)
      .slice(0, 5);

    // 合规性指标
    const approvedCount = sensitiveLogs.filter((l) => l.approvalStatus === 'approved').length;
    const requiresApprovalCount = sensitiveLogs.filter((l) => l.requiresApproval).length;

    const complianceMetrics = {
      auditCoverage: logs.length > 0 ? 100 : 0, // 简化计算
      sensitiveDataAccess: sensitiveLogs.length,
      approvalComplianceRate: requiresApprovalCount > 0
        ? (approvedCount / requiresApprovalCount) * 100
        : 100,
    };

    return {
      activeUsers,
      totalOperations: logs.length,
      highRiskOperations,
      failedOperations,
      byResourceType,
      byAction,
      peakHours,
      complianceMetrics,
    };
  }

  /**
   * 导出审计日志
   */
  async exportAuditLogs(params: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    exportFormat: string;
    includeFields?: string[];
  }): Promise<{
    downloadUrl: string;
    fileSize: number;
    recordCount: number;
  }> {
    const whereConditions: any = {};

    if (params.userId) whereConditions.userId = params.userId;
    if (params.action) whereConditions.action = params.action;
    if (params.startDate && params.endDate) {
      whereConditions.createdAt = Between(params.startDate, params.endDate);
    }

    const logs = await this.auditLogRepo.find({ where: whereConditions });

    // 确保导出目录存在
    const exportDir = path.join(process.cwd(), 'exports', 'audit-logs');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `audit-logs-${timestamp}.${params.exportFormat}`;
    const filePath = path.join(exportDir, fileName);

    // 准备导出数据
    const exportData = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      details: JSON.stringify(log.details || {}),
      riskLevel: log.riskLevel,
      success: log.success,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt?.toISOString(),
    }));

    let fileSize = 0;

    switch (params.exportFormat.toLowerCase()) {
      case 'excel':
      case 'xlsx':
        await this.generateExcelExport(filePath, exportData);
        break;
      case 'csv':
        this.generateCsvExport(filePath, exportData);
        break;
      case 'json':
      default:
        this.generateJsonExport(filePath, exportData);
        break;
    }

    // 获取文件大小
    const stats = fs.statSync(filePath);
    fileSize = stats.size;

    const downloadUrl = `/api/audit-logs/download/${fileName}`;

    this.logger.log(`Exported ${logs.length} audit logs to ${filePath}`);

    return {
      downloadUrl,
      fileSize,
      recordCount: logs.length,
    };
  }

  /**
   * 生成 Excel 导出文件
   */
  private async generateExcelExport(filePath: string, data: any[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CloudPhone Audit System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Audit Logs');

    // 设置列头
    sheet.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: 'User ID', key: 'userId', width: 40 },
      { header: 'Action', key: 'action', width: 25 },
      { header: 'Resource Type', key: 'resourceType', width: 20 },
      { header: 'Resource ID', key: 'resourceId', width: 40 },
      { header: 'Details', key: 'details', width: 50 },
      { header: 'Risk Level', key: 'riskLevel', width: 12 },
      { header: 'Success', key: 'success', width: 10 },
      { header: 'IP Address', key: 'ipAddress', width: 15 },
      { header: 'User Agent', key: 'userAgent', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 25 },
    ];

    // 设置表头样式
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // 添加数据
    data.forEach((row) => sheet.addRow(row));

    await workbook.xlsx.writeFile(filePath);
  }

  /**
   * 生成 CSV 导出文件
   */
  private generateCsvExport(filePath: string, data: any[]): void {
    const csvContent = stringify(data, {
      header: true,
      columns: [
        'id', 'userId', 'action', 'resourceType', 'resourceId',
        'details', 'riskLevel', 'success', 'ipAddress', 'userAgent', 'createdAt',
      ],
    });
    fs.writeFileSync(filePath, csvContent);
  }

  /**
   * 生成 JSON 导出文件
   */
  private generateJsonExport(filePath: string, data: any[]): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * 检查用户是否有审计权限
   * 简单实现：检查用户最近的操作记录是否包含管理员操作
   * 实际生产环境应通过 user-service API 验证用户角色
   */
  private async checkAuditPermission(userId: string): Promise<boolean> {
    // 检查用户是否有最近的管理员操作记录
    // 这是一个简化的检查，实际应该调用 user-service 验证角色
    const recentAdminAction = await this.auditLogRepo.findOne({
      where: {
        userId,
        action: In([
          'admin.login',
          'user.manage',
          'system.config',
          'audit.view',
          'audit.export',
          'sensitive_audit_log.query',
        ]),
        createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 24小时内
      },
      order: { createdAt: 'DESC' },
    });

    // 如果有最近的管理员操作，允许访问
    // 如果没有，检查用户ID格式是否为管理员（临时方案）
    if (recentAdminAction) {
      return true;
    }

    // 临时方案：检查用户ID是否包含 'admin' 或为系统用户
    // 实际应通过 user-service 的 /users/:id/roles API 验证
    const isAdminUser = userId.includes('admin') || userId === 'system';

    return isAdminUser;
  }
}
