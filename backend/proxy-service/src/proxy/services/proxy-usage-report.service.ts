import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ClusterSafeCron, DistributedLockService } from '@cloudphone/shared';
import { ProxyUsageSummary, ProxyReportExport } from '../entities';
import * as ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import * as nodemailer from 'nodemailer';
import * as cronParser from 'cron-parser';

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
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(ProxyUsageSummary)
    private summaryRepo: Repository<ProxyUsageSummary>,
    @InjectRepository(ProxyReportExport)
    private reportRepo: Repository<ProxyReportExport>,
    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety: Required for @ClusterSafeCron
    private readonly configService: ConfigService,
  ) {
    this.initializeEmailTransporter();
  }

  /**
   * 初始化邮件传输器
   */
  private initializeEmailTransporter(): void {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      this.emailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log('Email transporter initialized for report service');
    } else {
      this.logger.warn('SMTP configuration incomplete, email reports disabled');
    }
  }

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
    // 确保报告目录存在
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const fileName = `${report.id}.${report.exportFormat}`;
    const filePath = path.join(reportsDir, fileName);
    let fileSize = 0;

    switch (report.exportFormat) {
      case 'excel':
        fileSize = await this.generateExcelReport(filePath, data, report);
        break;
      case 'csv':
        fileSize = await this.generateCsvReport(filePath, data);
        break;
      case 'json':
        fileSize = await this.generateJsonReport(filePath, data);
        break;
      case 'pdf':
        // PDF 生成需要额外依赖 (pdfkit/puppeteer)，暂时生成 JSON 替代
        this.logger.warn('PDF 格式暂不支持，生成 JSON 格式替代');
        fileSize = await this.generateJsonReport(filePath.replace('.pdf', '.json'), data);
        break;
      default:
        fileSize = await this.generateJsonReport(filePath, data);
    }

    // 生成下载 URL（实际生产环境应上传到对象存储如 MinIO）
    const downloadUrl = `/api/proxy/reports/${report.id}/download`;

    return {
      fileSize,
      filePath: `/reports/${fileName}`,
      downloadUrl,
      dataSummary: data.statistics,
    };
  }

  /**
   * 生成 Excel 报告
   */
  private async generateExcelReport(
    filePath: string,
    data: any,
    report: ProxyReportExport,
  ): Promise<number> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CloudPhone Proxy Service';
    workbook.created = new Date();

    // 汇总表
    const summarySheet = workbook.addWorksheet('汇总');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 30 },
      { header: '值', key: 'value', width: 20 },
    ];

    if (data.statistics) {
      const stats = data.statistics;
      summarySheet.addRows([
        { metric: '报告类型', value: report.reportType },
        { metric: '报告周期', value: report.reportPeriod },
        { metric: '总请求数', value: stats.totalRequests || 0 },
        { metric: '成功请求数', value: stats.successRequests || 0 },
        { metric: '失败请求数', value: stats.failedRequests || 0 },
        { metric: '总数据量 (MB)', value: ((stats.totalBytes || 0) / 1024 / 1024).toFixed(2) },
        { metric: '平均响应时间 (ms)', value: stats.avgResponseTime || 0 },
        { metric: '生成时间', value: new Date().toISOString() },
      ]);
    }

    // 样式设置
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' },
    };

    // 详细数据表
    if (data.details && Array.isArray(data.details) && data.details.length > 0) {
      const detailSheet = workbook.addWorksheet('详细数据');

      // 动态获取列
      const columns = Object.keys(data.details[0]).map((key) => ({
        header: key,
        key,
        width: 15,
      }));
      detailSheet.columns = columns;
      detailSheet.addRows(data.details);

      // 表头样式
      detailSheet.getRow(1).font = { bold: true };
      detailSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' },
      };
    }

    // 写入文件
    await workbook.xlsx.writeFile(filePath);
    const stats = fs.statSync(filePath);
    this.logger.log(`Excel 报告已生成: ${filePath}, 大小: ${stats.size} bytes`);

    return stats.size;
  }

  /**
   * 生成 CSV 报告
   */
  private async generateCsvReport(filePath: string, data: any): Promise<number> {
    let csvData: any[] = [];

    if (data.details && Array.isArray(data.details)) {
      csvData = data.details;
    } else if (data.statistics) {
      // 将统计数据转换为行格式
      csvData = Object.entries(data.statistics).map(([key, value]) => ({
        metric: key,
        value: value,
      }));
    }

    if (csvData.length === 0) {
      csvData = [{ message: 'No data available' }];
    }

    const csvContent = stringify(csvData, {
      header: true,
      columns: Object.keys(csvData[0]),
    });

    fs.writeFileSync(filePath, csvContent, 'utf8');
    const stats = fs.statSync(filePath);
    this.logger.log(`CSV 报告已生成: ${filePath}, 大小: ${stats.size} bytes`);

    return stats.size;
  }

  /**
   * 生成 JSON 报告
   */
  private async generateJsonReport(filePath: string, data: any): Promise<number> {
    const reportData = {
      generatedAt: new Date().toISOString(),
      statistics: data.statistics || {},
      details: data.details || [],
      metadata: data.metadata || {},
    };

    const jsonContent = JSON.stringify(reportData, null, 2);
    fs.writeFileSync(filePath, jsonContent, 'utf8');
    const stats = fs.statSync(filePath);
    this.logger.log(`JSON 报告已生成: ${filePath}, 大小: ${stats.size} bytes`);

    return stats.size;
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

    // 删除实际存储的文件
    if (report.filePath) {
      try {
        if (fs.existsSync(report.filePath)) {
          fs.unlinkSync(report.filePath);
          this.logger.log(`Deleted report file: ${report.filePath}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to delete report file ${report.filePath}: ${error.message}`);
        // 继续删除数据库记录，即使文件删除失败
      }
    }

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

    // 1. 确定输出目录和文件名
    const exportDir = path.join(process.cwd(), 'exports', 'batch');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipFileName = `batch-export-${timestamp}.zip`;
    const zipFilePath = path.join(exportDir, zipFileName);

    // 2. 创建 ZIP 文件（如果需要）或单独处理
    if (params.zipArchive !== false) {
      // 默认打包成 ZIP
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.pipe(output);

      // 3. 收集所有已生成报告的文件
      for (const report of reports) {
        if (report.filePath && fs.existsSync(report.filePath)) {
          const fileName = path.basename(report.filePath);
          archive.file(report.filePath, { name: fileName });
        } else {
          // 如果报告没有文件，生成 JSON 内容
          const content = JSON.stringify({
            id: report.id,
            name: report.reportName,
            type: report.reportType,
            period: report.reportPeriod,
            status: report.status,
            createdAt: report.createdAt,
            dataSummary: report.dataSummary,
          }, null, 2);
          archive.append(content, { name: `${report.reportName || report.id}.json` });
        }
      }

      await archive.finalize();

      // 等待写入完成
      await new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });

      const stats = fs.statSync(zipFilePath);
      const downloadUrl = `/api/reports/download/${zipFileName}`;

      this.logger.log(`Created batch export ZIP: ${zipFilePath}, size: ${stats.size}`);

      return {
        downloadUrl,
        fileSize: stats.size,
        reportCount: reports.length,
      };
    } else {
      // 不压缩，返回第一个文件的信息（简化处理）
      const firstReport = reports[0];
      if (firstReport.filePath && fs.existsSync(firstReport.filePath)) {
        const stats = fs.statSync(firstReport.filePath);
        return {
          downloadUrl: firstReport.downloadUrl || `/api/reports/download/${path.basename(firstReport.filePath)}`,
          fileSize: stats.size,
          reportCount: reports.length,
        };
      }

      // 如果没有实际文件，返回空结果
      return {
        downloadUrl: '',
        fileSize: 0,
        reportCount: reports.length,
      };
    }
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
   * 立即执行定时报告
   * 手动触发定时报告的生成，不影响定时计划
   */
  async executeScheduledReportNow(reportId: string): Promise<{
    success: boolean;
    newReport?: ProxyReportExport;
    error?: string;
  }> {
    const scheduledReport = await this.getReport(reportId);

    // 验证是否为定时报告
    if (!scheduledReport.isScheduled) {
      return {
        success: false,
        error: 'This is not a scheduled report',
      };
    }

    try {
      // 计算报告周期的日期范围
      const { startDate, endDate } = this.calculatePeriodRange(
        scheduledReport.reportPeriod,
      );

      // 创建新的报告任务（立即执行）
      const newReport = await this.createReport({
        userId: scheduledReport.userId,
        reportName: `${scheduledReport.reportName} - 手动执行 ${new Date().toISOString().split('T')[0]}`,
        reportType: scheduledReport.reportType,
        reportPeriod: scheduledReport.reportPeriod,
        startDate,
        endDate,
        dataScope: scheduledReport.dataScope,
        exportFormat: scheduledReport.exportFormat,
      });

      // 更新定时报告的手动执行信息（不更新 nextExecutionTime）
      scheduledReport.lastExecutionTime = new Date();
      scheduledReport.executionCount += 1;
      await this.reportRepo.save(scheduledReport);

      this.logger.log(`Manually executed scheduled report: ${reportId}, new report: ${newReport.id}`);

      // 如果启用自动发送，发送报告
      if (scheduledReport.autoSend && scheduledReport.recipients && scheduledReport.recipients.length > 0) {
        // 异步发送邮件，不阻塞返回
        this.sendReportEmail(newReport, scheduledReport.recipients).catch((err) => {
          this.logger.warn(`Failed to send report email: ${err.message}`);
        });
      }

      return {
        success: true,
        newReport,
      };
    } catch (error) {
      this.logger.error(`Failed to execute scheduled report ${reportId}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 计算下次执行时间
   *
   * ✅ 使用 cron-parser 库解析 cron 表达式
   * 支持标准 5/6 位 cron 格式：
   * - 5 位：分 时 日 月 周
   * - 6 位：秒 分 时 日 月 周
   */
  private calculateNextExecutionTime(cronExpression: string): Date {
    try {
      const interval = cronParser.parseExpression(cronExpression, {
        currentDate: new Date(),
        tz: 'Asia/Shanghai', // 使用中国时区
      });

      return interval.next().toDate();
    } catch (error) {
      this.logger.warn(
        `Invalid cron expression "${cronExpression}": ${error.message}, using fallback`,
      );
      // 解析失败时返回 24 小时后作为回退
      const fallback = new Date();
      fallback.setHours(fallback.getHours() + 24);
      return fallback;
    }
  }

  /**
   * 定时任务：执行定时报告
   * 每小时检查一次是否有需要执行的定时报告
   */
  @ClusterSafeCron(CronExpression.EVERY_HOUR)
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
    if (!this.emailTransporter) {
      this.logger.warn('Email transporter not configured, skipping email notification');
      return;
    }

    if (!recipients || recipients.length === 0) {
      this.logger.warn('No recipients specified for report email');
      return;
    }

    const smtpFrom = this.configService.get<string>('SMTP_FROM', 'noreply@cloudphone.com');
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:5173');

    // 构建邮件内容
    const subject = `📊 代理使用报告 - ${report.reportName}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">📊 代理使用报告</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${report.reportName}</p>
        </div>

        <div style="border: 1px solid #e1e4e8; border-top: none; padding: 25px; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>报告类型</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${report.reportType}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>报告周期</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${report.reportPeriod}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>数据范围</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                ${report.startDate?.toLocaleDateString()} - ${report.endDate?.toLocaleDateString()}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>导出格式</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${report.exportFormat?.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>生成状态</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                <span style="background: ${report.status === 'completed' ? '#28a745' : '#ffc107'}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px;">
                  ${report.status === 'completed' ? '已完成' : '处理中'}
                </span>
              </td>
            </tr>
            ${report.fileSize ? `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>文件大小</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${(report.fileSize / 1024).toFixed(2)} KB</td>
            </tr>
            ` : ''}
          </table>

          ${report.status === 'completed' && report.downloadUrl ? `
          <div style="margin-top: 25px; text-align: center;">
            <a href="${appUrl}${report.downloadUrl}"
               style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              📥 下载报告
            </a>
          </div>
          ` : `
          <div style="margin-top: 25px; padding: 15px; background: #fff3cd; border-radius: 6px; text-align: center;">
            <p style="margin: 0; color: #856404;">报告正在生成中，完成后将可以下载</p>
          </div>
          `}

          <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">

          <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
            此邮件由 CloudPhone 代理服务自动发送<br>
            生成时间: ${new Date().toLocaleString('zh-CN')}
          </p>
        </div>
      </div>
    `;

    try {
      await this.emailTransporter.sendMail({
        from: smtpFrom,
        to: recipients.join(','),
        subject,
        html: htmlContent,
      });

      this.logger.log(`Report email sent to ${recipients.length} recipients for report ${report.id}`);
    } catch (error) {
      this.logger.error(`Failed to send report email: ${error.message}`);
      throw error;
    }
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
