import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProxyUsageSummary, ProxyReportExport } from '../entities';

/**
 * 代理使用报告服务
 *
 * 功能：
 * 1. 报告生成（按需生成和定时生成）
 * 2. 多格式导出（PDF, Excel, CSV, JSON）
 * 3. 定时报告管理
 * 4. 报告历史和统计
 */
@Injectable()
export class ProxyUsageReportService {
  private readonly logger = new Logger(ProxyUsageReportService.name);

  constructor(
    @InjectRepository(ProxyUsageSummary)
    private summaryRepo: Repository<ProxyUsageSummary>,
    @InjectRepository(ProxyReportExport)
    private reportRepo: Repository<ProxyReportExport>,
  ) {}

  // ==================== 报告创建和生成 ====================

  /**
   * 创建报告任务
   */
  async createReport(params: {
    userId: string;
    reportName: string;
    reportType: string;
    reportPeriod: string;
    startDate: Date;
    endDate: Date;
    dataScope?:
      | string
      | { deviceIds?: string[]; providers?: string[]; countries?: string[] };
    filters?: any;
    includedMetrics?: string[];
    exportFormat?: string;
    includeCharts?: boolean;
  }): Promise<ProxyReportExport> {
    const report = this.reportRepo.create({
      userId: params.userId,
      reportName: params.reportName,
      reportType: params.reportType,
      reportPeriod: params.reportPeriod,
      startDate: params.startDate,
      endDate: params.endDate,
      status: 'pending',
      exportFormat: params.exportFormat || 'pdf',
      // dataScope 如果传入字符串，则解析为对象；否则使用 null
      dataScope: params.dataScope
        ? typeof params.dataScope === 'string'
          ? { providers: [params.dataScope] }
          : params.dataScope
        : null,
      filters: params.filters,
    });

    await this.reportRepo.save(report);

    this.logger.log(`Created report task: ${report.reportName} (${report.reportType})`);

    // 异步生成报告
    this.generateReportAsync(report.id).catch((err) => {
      this.logger.error(`Failed to generate report ${report.id}`, err);
    });

    return report;
  }

  /**
   * 异步生成报告
   */
  private async generateReportAsync(reportId: string): Promise<void> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) return;

    try {
      // 更新状态为生成中
      report.status = 'generating';
      report.generationStartedAt = new Date();
      await this.reportRepo.save(report);

      // 收集数据
      const data = await this.collectReportData(report);

      // 生成文件
      const fileResult = await this.generateReportFile(report, data);

      // 更新报告信息
      report.status = 'completed';
      report.generationCompletedAt = new Date();
      report.fileSize = fileResult.fileSize;
      report.filePath = fileResult.filePath;
      report.downloadUrl = fileResult.downloadUrl;
      report.dataSummary = fileResult.dataSummary;

      await this.reportRepo.save(report);

      this.logger.log(`Report generated successfully: ${reportId}`);
    } catch (error) {
      report.status = 'failed';
      report.errorMessage = error.message;
      await this.reportRepo.save(report);

      throw error;
    }
  }

  /**
   * 收集报告数据
   */
  private async collectReportData(report: ProxyReportExport): Promise<any> {
    const whereConditions: any = {
      userId: report.userId,
      date: Between(report.startDate, report.endDate),
    };

    // 应用过滤条件
    if (report.filters) {
      if (report.filters.deviceIds) {
        whereConditions.deviceId = In(report.filters.deviceIds);
      }
      // 可以添加更多过滤条件
    }

    const summaries = await this.summaryRepo.find({
      where: whereConditions,
      order: { date: 'ASC' },
    });

    // 计算汇总统计
    const totalUsage = summaries.reduce((sum, s) => sum + s.totalUsage, 0);
    const totalCost = summaries.reduce((sum, s) => sum + s.totalCost, 0);
    const avgSuccessRate = summaries.length > 0
      ? summaries.reduce((sum, s) => sum + s.avgSuccessRate, 0) / summaries.length
      : 0;

    return {
      summaries,
      statistics: {
        totalUsage,
        totalCost,
        avgSuccessRate,
        deviceCount: new Set(summaries.map(s => s.deviceId)).size,
        dateRange: {
          start: report.startDate,
          end: report.endDate,
        },
      },
    };
  }

  /**
   * 生成报告文件
   */
  private async generateReportFile(
    report: ProxyReportExport,
    data: any,
  ): Promise<{
    fileSize: number;
    filePath: string;
    downloadUrl: string;
    dataSummary: any;
  }> {
    // TODO: 实现实际的文件生成逻辑
    // 根据 report.exportFormat 生成不同格式：
    // - PDF: 使用 pdfkit 或 puppeteer
    // - Excel: 使用 exceljs
    // - CSV: 使用 csv-stringify
    // - JSON: 直接序列化

    const mockFilePath = `/reports/${report.id}.${report.exportFormat}`;
    const mockDownloadUrl = `https://storage.example.com${mockFilePath}`;
    const mockFileSize = 1024 * 100; // 100KB

    return {
      fileSize: mockFileSize,
      filePath: mockFilePath,
      downloadUrl: mockDownloadUrl,
      dataSummary: data.statistics,
    };
  }

  /**
   * 获取报告详情
   */
  async getReport(reportId: string): Promise<ProxyReportExport> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    return report;
  }

  /**
   * 查询报告列表
   */
  async queryReports(params: {
    userId: string;
    reportType?: string;
    reportPeriod?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ reports: ProxyReportExport[]; total: number }> {
    const whereConditions: any = { userId: params.userId };

    if (params.reportType) {
      whereConditions.reportType = params.reportType;
    }

    if (params.reportPeriod) {
      whereConditions.reportPeriod = params.reportPeriod;
    }

    if (params.status) {
      whereConditions.status = params.status;
    }

    if (params.startDate && params.endDate) {
      whereConditions.createdAt = Between(params.startDate, params.endDate);
    }

    const page = params.page || 1;
    const limit = params.limit || 20;

    const [reports, total] = await this.reportRepo.findAndCount({
      where: whereConditions,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { reports, total };
  }

  /**
   * 删除报告
   */
  async deleteReport(reportId: string): Promise<void> {
    const report = await this.getReport(reportId);

    // TODO: 删除实际存储的文件
    // 例如从MinIO或本地文件系统删除

    await this.reportRepo.remove(report);

    this.logger.log(`Deleted report: ${reportId}`);
  }

  /**
   * 批量导出报告
   */
  async batchExport(params: {
    reportIds: string[];
    exportFormat: string;
    zipArchive?: boolean;
  }): Promise<{
    downloadUrl: string;
    fileSize: number;
    reportCount: number;
  }> {
    const reports = await this.reportRepo.findByIds(params.reportIds);

    if (reports.length === 0) {
      throw new NotFoundException('No reports found for export');
    }

    // TODO: 实现批量导出逻辑
    // 1. 收集所有报告数据
    // 2. 如果 zipArchive = true，打包成ZIP
    // 3. 上传到存储服务
    // 4. 返回下载链接

    const mockDownloadUrl = `https://storage.example.com/batch-export/${Date.now()}.zip`;

    return {
      downloadUrl: mockDownloadUrl,
      fileSize: 1024 * 1024 * 5, // 5MB
      reportCount: reports.length,
    };
  }

  // ==================== 定时报告管理 ====================

  /**
   * 创建定时报告
   */
  async createScheduledReport(params: {
    userId: string;
    reportName: string;
    reportType: string;
    reportPeriod: string;
    cronExpression: string;
    recipients?: string[];
    dataScope?:
      | string
      | { deviceIds?: string[]; providers?: string[]; countries?: string[] };
    exportFormat?: string;
    autoSend?: boolean;
  }): Promise<ProxyReportExport> {
    const scheduledReport = this.reportRepo.create({
      userId: params.userId,
      reportName: params.reportName,
      reportType: params.reportType,
      reportPeriod: params.reportPeriod,
      cronExpression: params.cronExpression,
      recipients: params.recipients,
      isScheduled: true,
      // dataScope 如果传入字符串，则解析为对象；否则使用 null
      dataScope: params.dataScope
        ? typeof params.dataScope === 'string'
          ? { providers: [params.dataScope] }
          : params.dataScope
        : null,
      exportFormat: params.exportFormat || 'pdf',
      autoSend: params.autoSend ?? true,
      status: 'scheduled',
      // 计算下次执行时间
      nextExecutionTime: this.calculateNextExecutionTime(params.cronExpression),
    });

    await this.reportRepo.save(scheduledReport);

    this.logger.log(`Created scheduled report: ${scheduledReport.reportName}`);

    return scheduledReport;
  }

  /**
   * 更新定时报告
   */
  async updateScheduledReport(
    reportId: string,
    updates: Partial<ProxyReportExport>,
  ): Promise<ProxyReportExport> {
    const report = await this.getReport(reportId);

    Object.assign(report, updates, { updatedAt: new Date() });

    // 如果更新了cron表达式，重新计算下次执行时间
    if (updates.cronExpression) {
      report.nextExecutionTime = this.calculateNextExecutionTime(updates.cronExpression);
    }

    await this.reportRepo.save(report);

    this.logger.log(`Updated scheduled report: ${reportId}`);

    return report;
  }

  /**
   * 获取用户的定时报告列表
   */
  async getUserScheduledReports(userId: string): Promise<ProxyReportExport[]> {
    return this.reportRepo.find({
      where: {
        userId,
        isScheduled: true,
      },
      order: { nextExecutionTime: 'ASC' },
    });
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextExecutionTime(cronExpression: string): Date {
    // TODO: 使用 cron-parser 库解析cron表达式并计算下次执行时间
    // 这里返回一个简单的示例
    const nextTime = new Date();
    nextTime.setHours(nextTime.getHours() + 24); // 简单示例：24小时后
    return nextTime;
  }

  /**
   * 定时任务：执行定时报告
   * 每小时检查一次是否有需要执行的定时报告
   */
  @Cron(CronExpression.EVERY_HOUR)
  async executeScheduledReports(): Promise<void> {
    this.logger.log('Checking for scheduled reports to execute');

    const now = new Date();

    const dueReports = await this.reportRepo.find({
      where: {
        isScheduled: true,
        nextExecutionTime: Between(new Date(now.getTime() - 3600000), now),
      },
    });

    for (const scheduledReport of dueReports) {
      try {
        // 计算报告周期的日期范围
        const { startDate, endDate } = this.calculatePeriodRange(
          scheduledReport.reportPeriod,
        );

        // 创建新的报告任务
        const newReport = await this.createReport({
          userId: scheduledReport.userId,
          reportName: `${scheduledReport.reportName} - ${startDate.toISOString().split('T')[0]}`,
          reportType: scheduledReport.reportType,
          reportPeriod: scheduledReport.reportPeriod,
          startDate,
          endDate,
          dataScope: scheduledReport.dataScope,
          exportFormat: scheduledReport.exportFormat,
        });

        // 如果启用自动发送，发送报告
        if (scheduledReport.autoSend && scheduledReport.recipients) {
          await this.sendReportEmail(newReport, scheduledReport.recipients);
        }

        // 更新定时报告的执行信息
        scheduledReport.lastExecutionTime = now;
        scheduledReport.executionCount += 1;
        scheduledReport.nextExecutionTime = this.calculateNextExecutionTime(
          scheduledReport.cronExpression,
        );
        await this.reportRepo.save(scheduledReport);

        this.logger.log(`Executed scheduled report: ${scheduledReport.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to execute scheduled report ${scheduledReport.id}`,
          error,
        );
      }
    }
  }

  /**
   * 计算报告周期的日期范围
   */
  private calculatePeriodRange(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(now);

    switch (period) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarterly':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    return { startDate, endDate };
  }

  /**
   * 发送报告邮件
   */
  private async sendReportEmail(
    report: ProxyReportExport,
    recipients: string[],
  ): Promise<void> {
    // TODO: 集成邮件服务发送报告
    // 可以使用 nodemailer 或者调用 notification-service
    this.logger.log(`Sending report ${report.id} to ${recipients.join(', ')}`);
  }

  // ==================== 报告统计 ====================

  /**
   * 获取报告统计
   */
  async getReportStatistics(
    userId: string,
    days: number = 30,
  ): Promise<{
    totalReports: number;
    pendingReports: number;
    completedReports: number;
    failedReports: number;
    byType: Record<string, number>;
    byFormat: Record<string, number>;
    recentTrend: Array<{ date: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const reports = await this.reportRepo.find({
      where: {
        userId,
        createdAt: Between(startDate, new Date()),
      },
    });

    const pendingReports = reports.filter((r) => r.status === 'pending' || r.status === 'generating').length;
    const completedReports = reports.filter((r) => r.status === 'completed').length;
    const failedReports = reports.filter((r) => r.status === 'failed').length;

    // 按类型统计
    const byType = reports.reduce((acc, report) => {
      acc[report.reportType] = (acc[report.reportType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 按格式统计
    const byFormat = reports.reduce((acc, report) => {
      acc[report.exportFormat] = (acc[report.exportFormat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 趋势分析
    const trendMap = new Map<string, number>();
    reports.forEach((report) => {
      const date = report.createdAt.toISOString().split('T')[0];
      trendMap.set(date, (trendMap.get(date) || 0) + 1);
    });

    const recentTrend = Array.from(trendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalReports: reports.length,
      pendingReports,
      completedReports,
      failedReports,
      byType,
      byFormat,
      recentTrend,
    };
  }
}
