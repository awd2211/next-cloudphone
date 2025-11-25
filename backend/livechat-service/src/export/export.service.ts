import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ExportTask,
  ExportTaskStatus,
  ReportType,
  ExportFormat,
  Conversation,
  Agent,
  SatisfactionRating,
  QualityReview,
  AgentSchedule,
  TrainingEnrollment,
  SlaAlert,
  VisitorProfile,
  BotConversation,
} from '../entities';
import {
  CreateExportTaskDto,
  QueryExportTasksDto,
  ReportTypeConfig,
  ExportTaskProgress,
  ExportStats,
} from './dto';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  // 报表类型配置
  private readonly reportConfigs: Record<ReportType, Partial<ReportTypeConfig>> = {
    [ReportType.CONVERSATIONS]: {
      name: '会话报表',
      description: '导出会话记录和详情',
      supportedFormats: [ExportFormat.XLSX, ExportFormat.CSV, ExportFormat.JSON],
      availableFields: [
        { key: 'id', label: 'ID', type: 'string', defaultSelected: true },
        { key: 'visitorName', label: '访客名称', type: 'string', defaultSelected: true },
        { key: 'agentName', label: '客服名称', type: 'string', defaultSelected: true },
        { key: 'status', label: '状态', type: 'string', defaultSelected: true },
        { key: 'channel', label: '渠道', type: 'string', defaultSelected: true },
        { key: 'messageCount', label: '消息数', type: 'number', defaultSelected: true },
        { key: 'duration', label: '时长(秒)', type: 'number', defaultSelected: true },
        { key: 'satisfactionScore', label: '满意度', type: 'number' },
        { key: 'createdAt', label: '创建时间', type: 'date', defaultSelected: true },
        { key: 'resolvedAt', label: '解决时间', type: 'date' },
      ],
    },
    [ReportType.AGENT_PERFORMANCE]: {
      name: '客服绩效报表',
      description: '导出客服工作绩效数据',
      supportedFormats: [ExportFormat.XLSX, ExportFormat.CSV, ExportFormat.PDF],
      availableFields: [
        { key: 'agentName', label: '客服名称', type: 'string', defaultSelected: true },
        { key: 'totalChats', label: '会话数', type: 'number', defaultSelected: true },
        { key: 'avgResponseTime', label: '平均响应时间(秒)', type: 'number', defaultSelected: true },
        { key: 'avgResolutionTime', label: '平均解决时间(秒)', type: 'number', defaultSelected: true },
        { key: 'avgSatisfaction', label: '平均满意度', type: 'number', defaultSelected: true },
        { key: 'totalMessages', label: '消息总数', type: 'number' },
        { key: 'onlineHours', label: '在线时长(小时)', type: 'number' },
      ],
    },
    [ReportType.SATISFACTION]: {
      name: '满意度报表',
      description: '导出客户满意度评价数据',
      supportedFormats: [ExportFormat.XLSX, ExportFormat.CSV],
      availableFields: [
        { key: 'conversationId', label: '会话ID', type: 'string' },
        { key: 'visitorName', label: '访客名称', type: 'string', defaultSelected: true },
        { key: 'agentName', label: '客服名称', type: 'string', defaultSelected: true },
        { key: 'score', label: '评分', type: 'number', defaultSelected: true },
        { key: 'comment', label: '评价内容', type: 'string', defaultSelected: true },
        { key: 'tags', label: '标签', type: 'array' },
        { key: 'createdAt', label: '评价时间', type: 'date', defaultSelected: true },
      ],
    },
    [ReportType.QUALITY_REVIEW]: {
      name: '质检报表',
      description: '导出会话质检评分数据',
      supportedFormats: [ExportFormat.XLSX, ExportFormat.CSV, ExportFormat.PDF],
      availableFields: [
        { key: 'conversationId', label: '会话ID', type: 'string' },
        { key: 'agentName', label: '客服名称', type: 'string', defaultSelected: true },
        { key: 'reviewerName', label: '质检员', type: 'string', defaultSelected: true },
        { key: 'score', label: '总分', type: 'number', defaultSelected: true },
        { key: 'categoryScores', label: '分项得分', type: 'string' },
        { key: 'comments', label: '评语', type: 'string' },
        { key: 'createdAt', label: '质检时间', type: 'date', defaultSelected: true },
      ],
    },
    [ReportType.QUEUE_STATS]: {
      name: '排队报表',
      description: '导出排队等待统计数据',
      supportedFormats: [ExportFormat.XLSX, ExportFormat.CSV],
      availableFields: [
        { key: 'date', label: '日期', type: 'date', defaultSelected: true },
        { key: 'hour', label: '小时', type: 'number' },
        { key: 'totalQueued', label: '排队总数', type: 'number', defaultSelected: true },
        { key: 'avgWaitTime', label: '平均等待时间(秒)', type: 'number', defaultSelected: true },
        { key: 'maxWaitTime', label: '最长等待时间(秒)', type: 'number' },
        { key: 'abandonedCount', label: '放弃数', type: 'number', defaultSelected: true },
        { key: 'abandonRate', label: '放弃率', type: 'number' },
      ],
    },
    [ReportType.TRAINING]: {
      name: '培训报表',
      description: '导出客服培训数据',
      supportedFormats: [ExportFormat.XLSX, ExportFormat.CSV],
      availableFields: [
        { key: 'agentName', label: '客服名称', type: 'string', defaultSelected: true },
        { key: 'courseName', label: '课程名称', type: 'string', defaultSelected: true },
        { key: 'progress', label: '进度(%)', type: 'number', defaultSelected: true },
        { key: 'examScore', label: '考试成绩', type: 'number', defaultSelected: true },
        { key: 'isPassed', label: '是否通过', type: 'boolean', defaultSelected: true },
        { key: 'totalStudyTime', label: '学习时长(分钟)', type: 'number' },
        { key: 'completedAt', label: '完成时间', type: 'date' },
      ],
    },
    [ReportType.SCHEDULING]: {
      name: '排班报表',
      description: '导出客服排班数据',
      supportedFormats: [ExportFormat.XLSX, ExportFormat.CSV],
      availableFields: [
        { key: 'agentName', label: '客服名称', type: 'string', defaultSelected: true },
        { key: 'date', label: '日期', type: 'date', defaultSelected: true },
        { key: 'shiftName', label: '班次', type: 'string', defaultSelected: true },
        { key: 'startTime', label: '开始时间', type: 'string', defaultSelected: true },
        { key: 'endTime', label: '结束时间', type: 'string', defaultSelected: true },
        { key: 'status', label: '状态', type: 'string', defaultSelected: true },
        { key: 'actualStartTime', label: '实际签到', type: 'date' },
        { key: 'actualEndTime', label: '实际签退', type: 'date' },
      ],
    },
    [ReportType.VISITOR_ANALYTICS]: {
      name: '访客分析报表',
      description: '导出访客画像和行为数据',
      supportedFormats: [ExportFormat.XLSX, ExportFormat.CSV, ExportFormat.JSON],
      availableFields: [
        { key: 'visitorId', label: '访客ID', type: 'string' },
        { key: 'displayName', label: '名称', type: 'string', defaultSelected: true },
        { key: 'source', label: '来源', type: 'string', defaultSelected: true },
        { key: 'totalVisits', label: '访问次数', type: 'number', defaultSelected: true },
        { key: 'totalConversations', label: '会话次数', type: 'number', defaultSelected: true },
        { key: 'valueLevel', label: '价值等级', type: 'string', defaultSelected: true },
        { key: 'tags', label: '标签', type: 'array' },
        { key: 'lastVisitAt', label: '最后访问', type: 'date' },
      ],
    },
    [ReportType.SLA]: {
      name: 'SLA报表',
      description: '导出SLA告警和达成率数据',
      supportedFormats: [ExportFormat.XLSX, ExportFormat.CSV, ExportFormat.PDF],
      availableFields: [
        { key: 'ruleName', label: '规则名称', type: 'string', defaultSelected: true },
        { key: 'metricType', label: '指标类型', type: 'string', defaultSelected: true },
        { key: 'severity', label: '严重程度', type: 'string', defaultSelected: true },
        { key: 'actualValue', label: '实际值', type: 'number', defaultSelected: true },
        { key: 'thresholdValue', label: '阈值', type: 'number', defaultSelected: true },
        { key: 'status', label: '状态', type: 'string', defaultSelected: true },
        { key: 'triggeredAt', label: '触发时间', type: 'date', defaultSelected: true },
      ],
    },
    [ReportType.KNOWLEDGE_USAGE]: {
      name: '知识库使用报表',
      description: '导出知识库文章使用统计',
      supportedFormats: [ExportFormat.XLSX, ExportFormat.CSV],
      availableFields: [
        { key: 'articleTitle', label: '文章标题', type: 'string', defaultSelected: true },
        { key: 'categoryName', label: '分类', type: 'string', defaultSelected: true },
        { key: 'viewCount', label: '查看次数', type: 'number', defaultSelected: true },
        { key: 'useCount', label: '使用次数', type: 'number', defaultSelected: true },
        { key: 'helpfulCount', label: '有帮助数', type: 'number' },
        { key: 'notHelpfulCount', label: '无帮助数', type: 'number' },
      ],
    },
    [ReportType.BOT_CONVERSATIONS]: {
      name: '机器人会话报表',
      description: '导出机器人会话数据',
      supportedFormats: [ExportFormat.XLSX, ExportFormat.CSV, ExportFormat.JSON],
      availableFields: [
        { key: 'botName', label: '机器人名称', type: 'string', defaultSelected: true },
        { key: 'visitorName', label: '访客名称', type: 'string', defaultSelected: true },
        { key: 'status', label: '状态', type: 'string', defaultSelected: true },
        { key: 'messageCount', label: '消息数', type: 'number', defaultSelected: true },
        { key: 'matchedIntents', label: '匹配意图数', type: 'number' },
        { key: 'transferReason', label: '转人工原因', type: 'string' },
        { key: 'createdAt', label: '开始时间', type: 'date', defaultSelected: true },
      ],
    },
    [ReportType.CUSTOM]: {
      name: '自定义报表',
      description: '自定义SQL查询导出',
      supportedFormats: [ExportFormat.XLSX, ExportFormat.CSV, ExportFormat.JSON],
      availableFields: [],
    },
  };

  constructor(
    @InjectRepository(ExportTask)
    private exportTaskRepository: Repository<ExportTask>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(SatisfactionRating)
    private ratingRepository: Repository<SatisfactionRating>,
    @InjectRepository(QualityReview)
    private reviewRepository: Repository<QualityReview>,
    @InjectRepository(AgentSchedule)
    private scheduleRepository: Repository<AgentSchedule>,
    @InjectRepository(TrainingEnrollment)
    private enrollmentRepository: Repository<TrainingEnrollment>,
    @InjectRepository(SlaAlert)
    private slaAlertRepository: Repository<SlaAlert>,
    @InjectRepository(VisitorProfile)
    private visitorRepository: Repository<VisitorProfile>,
    @InjectRepository(BotConversation)
    private botConversationRepository: Repository<BotConversation>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ========== Export Task Management ==========

  async createExportTask(
    tenantId: string,
    dto: CreateExportTaskDto,
    createdBy: string,
  ): Promise<ExportTask> {
    // Validate report type config
    const config = this.reportConfigs[dto.reportType];
    if (!config) {
      throw new BadRequestException('Invalid report type');
    }

    // Validate format
    if (dto.format && !config.supportedFormats?.includes(dto.format)) {
      throw new BadRequestException(`Format ${dto.format} is not supported for this report type`);
    }

    // Set file expiration (7 days)
    const fileExpiresAt = new Date();
    fileExpiresAt.setDate(fileExpiresAt.getDate() + 7);

    const task = this.exportTaskRepository.create({
      tenantId,
      name: dto.name,
      reportType: dto.reportType,
      format: dto.format || ExportFormat.XLSX,
      queryParams: dto.queryParams,
      fields: dto.fields || [],
      isScheduled: dto.isScheduled || false,
      scheduleRule: dto.scheduleRule,
      notificationSettings: dto.notificationSettings,
      fileExpiresAt,
      createdBy,
    });

    const saved = await this.exportTaskRepository.save(task);

    // Start processing asynchronously
    this.processExportTask(saved.id).catch((error) => {
      this.logger.error(`Failed to process export task ${saved.id}: ${error.message}`);
    });

    return saved;
  }

  async getExportTasks(
    tenantId: string,
    query: QueryExportTasksDto,
  ): Promise<{ items: ExportTask[]; total: number }> {
    const { reportType, status, startDate, endDate, page = 1, pageSize = 20 } = query;

    const qb = this.exportTaskRepository.createQueryBuilder('task')
      .where('task.tenantId = :tenantId', { tenantId });

    if (reportType) {
      qb.andWhere('task.reportType = :reportType', { reportType });
    }

    if (status) {
      qb.andWhere('task.status = :status', { status });
    }

    if (startDate) {
      qb.andWhere('task.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('task.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('task.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getExportTask(tenantId: string, id: string): Promise<ExportTask> {
    const task = await this.exportTaskRepository.findOne({
      where: { id, tenantId },
    });

    if (!task) {
      throw new NotFoundException('Export task not found');
    }

    return task;
  }

  async cancelExportTask(tenantId: string, id: string): Promise<void> {
    const task = await this.exportTaskRepository.findOne({
      where: { id, tenantId },
    });

    if (!task) {
      throw new NotFoundException('Export task not found');
    }

    if (task.status !== ExportTaskStatus.PENDING && task.status !== ExportTaskStatus.PROCESSING) {
      throw new BadRequestException('Cannot cancel task in current status');
    }

    task.status = ExportTaskStatus.FAILED;
    task.errorMessage = 'Cancelled by user';
    await this.exportTaskRepository.save(task);
  }

  async deleteExportTask(tenantId: string, id: string): Promise<void> {
    const task = await this.exportTaskRepository.findOne({
      where: { id, tenantId },
    });

    if (!task) {
      throw new NotFoundException('Export task not found');
    }

    // TODO: Delete file from MinIO if exists

    await this.exportTaskRepository.remove(task);
  }

  async getTaskProgress(tenantId: string, id: string): Promise<ExportTaskProgress> {
    const task = await this.getExportTask(tenantId, id);

    return {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      totalRecords: task.totalRecords,
      processedRecords: task.processedRecords,
      estimatedTimeRemaining: this.calculateEstimatedTime(task),
    };
  }

  // ========== Report Configuration ==========

  getReportTypes(): ReportTypeConfig[] {
    return Object.entries(this.reportConfigs).map(([type, config]) => ({
      type: type as ReportType,
      name: config.name || type,
      description: config.description || '',
      supportedFormats: config.supportedFormats || [ExportFormat.XLSX],
      availableFields: config.availableFields || [],
    }));
  }

  getReportTypeConfig(reportType: ReportType): ReportTypeConfig {
    const config = this.reportConfigs[reportType];
    if (!config) {
      throw new NotFoundException('Report type not found');
    }

    return {
      type: reportType,
      name: config.name || reportType,
      description: config.description || '',
      supportedFormats: config.supportedFormats || [ExportFormat.XLSX],
      availableFields: config.availableFields || [],
    };
  }

  // ========== Statistics ==========

  async getExportStats(tenantId: string): Promise<ExportStats> {
    const tasks = await this.exportTaskRepository.find({
      where: { tenantId },
    });

    const tasksByType = new Map<ReportType, number>();
    let totalFileSize = 0;

    for (const task of tasks) {
      tasksByType.set(
        task.reportType,
        (tasksByType.get(task.reportType) || 0) + 1,
      );
      totalFileSize += task.fileSize || 0;
    }

    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === ExportTaskStatus.COMPLETED).length,
      failedTasks: tasks.filter((t) => t.status === ExportTaskStatus.FAILED).length,
      pendingTasks: tasks.filter((t) =>
        t.status === ExportTaskStatus.PENDING || t.status === ExportTaskStatus.PROCESSING
      ).length,
      totalFileSize,
      tasksByType: Array.from(tasksByType.entries()).map(([reportType, count]) => ({
        reportType,
        count,
      })),
    };
  }

  // ========== Processing Logic ==========

  private async processExportTask(taskId: string): Promise<void> {
    const task = await this.exportTaskRepository.findOne({ where: { id: taskId } });
    if (!task) return;

    try {
      task.status = ExportTaskStatus.PROCESSING;
      task.startedAt = new Date();
      await this.exportTaskRepository.save(task);

      // Get data based on report type
      const data = await this.fetchReportData(task);
      task.totalRecords = data.length;

      // Simulate processing with progress updates
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        task.processedRecords = Math.min(i + batchSize, data.length);
        task.progress = Math.round((task.processedRecords / task.totalRecords) * 100);
        await this.exportTaskRepository.save(task);

        // Emit progress event
        this.eventEmitter.emit('export.progress', {
          taskId: task.id,
          progress: task.progress,
          processedRecords: task.processedRecords,
          totalRecords: task.totalRecords,
        });
      }

      // TODO: Generate file and upload to MinIO
      // For now, just simulate completion
      task.status = ExportTaskStatus.COMPLETED;
      task.completedAt = new Date();
      task.duration = Math.round(
        (task.completedAt.getTime() - task.startedAt.getTime()) / 1000,
      );
      task.progress = 100;
      task.filePath = `exports/${task.tenantId}/${task.id}.${task.format}`;
      task.fileSize = JSON.stringify(data).length;
      task.downloadUrl = `/api/livechat/export/download/${task.id}`;
      task.urlExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.exportTaskRepository.save(task);

      // Emit completion event
      this.eventEmitter.emit('export.completed', {
        task,
      });

      // Send notifications
      if (task.notificationSettings?.sendWebSocket) {
        this.eventEmitter.emit('export.notify', {
          taskId: task.id,
          userId: task.createdBy,
        });
      }

    } catch (error) {
      task.status = ExportTaskStatus.FAILED;
      task.errorMessage = error.message;
      task.completedAt = new Date();
      await this.exportTaskRepository.save(task);

      this.logger.error(`Export task ${taskId} failed: ${error.message}`);
    }
  }

  private async fetchReportData(task: ExportTask): Promise<any[]> {
    const { reportType, queryParams, tenantId } = task;

    switch (reportType) {
      case ReportType.CONVERSATIONS:
        return this.fetchConversationData(tenantId, queryParams);
      case ReportType.AGENT_PERFORMANCE:
        return this.fetchAgentPerformanceData(tenantId, queryParams);
      case ReportType.SATISFACTION:
        return this.fetchSatisfactionData(tenantId, queryParams);
      case ReportType.QUALITY_REVIEW:
        return this.fetchQualityReviewData(tenantId, queryParams);
      case ReportType.SCHEDULING:
        return this.fetchSchedulingData(tenantId, queryParams);
      case ReportType.TRAINING:
        return this.fetchTrainingData(tenantId, queryParams);
      case ReportType.VISITOR_ANALYTICS:
        return this.fetchVisitorData(tenantId, queryParams);
      case ReportType.SLA:
        return this.fetchSlaData(tenantId, queryParams);
      case ReportType.BOT_CONVERSATIONS:
        return this.fetchBotConversationData(tenantId, queryParams);
      default:
        return [];
    }
  }

  private async fetchConversationData(tenantId: string, params: any): Promise<any[]> {
    const qb = this.conversationRepository.createQueryBuilder('conv')
      .where('conv.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('conv.agent', 'agent');

    if (params.startDate) {
      qb.andWhere('conv.createdAt >= :startDate', { startDate: params.startDate });
    }
    if (params.endDate) {
      qb.andWhere('conv.createdAt <= :endDate', { endDate: params.endDate });
    }
    if (params.agentIds?.length) {
      qb.andWhere('conv.agentId IN (:...agentIds)', { agentIds: params.agentIds });
    }

    return qb.getMany();
  }

  private async fetchAgentPerformanceData(tenantId: string, params: any): Promise<any[]> {
    // Aggregate agent performance data
    const agents = await this.agentRepository.find({ where: { tenantId } });
    return agents.map((agent) => ({
      agentName: agent.displayName,
      totalChats: 0, // TODO: Calculate from conversations
      avgResponseTime: 0,
      avgResolutionTime: 0,
      avgSatisfaction: agent.rating,
    }));
  }

  private async fetchSatisfactionData(tenantId: string, params: any): Promise<any[]> {
    const qb = this.ratingRepository.createQueryBuilder('rating')
      .where('rating.tenantId = :tenantId', { tenantId });

    if (params.startDate) {
      qb.andWhere('rating.createdAt >= :startDate', { startDate: params.startDate });
    }
    if (params.endDate) {
      qb.andWhere('rating.createdAt <= :endDate', { endDate: params.endDate });
    }

    return qb.getMany();
  }

  private async fetchQualityReviewData(tenantId: string, params: any): Promise<any[]> {
    return this.reviewRepository.find({ where: { tenantId } });
  }

  private async fetchSchedulingData(tenantId: string, params: any): Promise<any[]> {
    const qb = this.scheduleRepository.createQueryBuilder('schedule')
      .where('schedule.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('schedule.agent', 'agent');

    if (params.startDate) {
      qb.andWhere('schedule.scheduleDate >= :startDate', { startDate: params.startDate });
    }
    if (params.endDate) {
      qb.andWhere('schedule.scheduleDate <= :endDate', { endDate: params.endDate });
    }

    return qb.getMany();
  }

  private async fetchTrainingData(tenantId: string, params: any): Promise<any[]> {
    return this.enrollmentRepository.find({
      where: { tenantId },
      relations: ['agent', 'course'],
    });
  }

  private async fetchVisitorData(tenantId: string, params: any): Promise<any[]> {
    return this.visitorRepository.find({ where: { tenantId } });
  }

  private async fetchSlaData(tenantId: string, params: any): Promise<any[]> {
    const qb = this.slaAlertRepository.createQueryBuilder('alert')
      .where('alert.tenantId = :tenantId', { tenantId });

    if (params.startDate) {
      qb.andWhere('alert.triggeredAt >= :startDate', { startDate: params.startDate });
    }
    if (params.endDate) {
      qb.andWhere('alert.triggeredAt <= :endDate', { endDate: params.endDate });
    }

    return qb.getMany();
  }

  private async fetchBotConversationData(tenantId: string, params: any): Promise<any[]> {
    return this.botConversationRepository.find({
      where: { tenantId },
      relations: ['bot'],
    });
  }

  // ========== Cron Jobs ==========

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredFiles(): Promise<void> {
    const expiredTasks = await this.exportTaskRepository.find({
      where: {
        status: ExportTaskStatus.COMPLETED,
        fileExpiresAt: LessThan(new Date()),
      },
    });

    for (const task of expiredTasks) {
      // TODO: Delete file from MinIO
      task.status = ExportTaskStatus.EXPIRED;
      task.filePath = '';
      task.downloadUrl = '';
      await this.exportTaskRepository.save(task);
    }

    if (expiredTasks.length > 0) {
      this.logger.log(`Cleaned up ${expiredTasks.length} expired export files`);
    }
  }

  // ========== Helper Methods ==========

  private calculateEstimatedTime(task: ExportTask): number | undefined {
    if (task.status !== ExportTaskStatus.PROCESSING || !task.totalRecords) {
      return undefined;
    }

    if (task.processedRecords === 0) {
      return undefined;
    }

    const elapsed = Date.now() - task.startedAt.getTime();
    const rate = task.processedRecords / elapsed;
    const remaining = task.totalRecords - task.processedRecords;

    return Math.round(remaining / rate / 1000); // seconds
  }
}
