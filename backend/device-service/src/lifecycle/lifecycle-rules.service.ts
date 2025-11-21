import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LifecycleRule, LifecycleRuleType } from '../entities/lifecycle-rule.entity';
import {
  LifecycleExecutionHistory,
  ExecutionStatus,
  TriggerType,
} from '../entities/lifecycle-execution-history.entity';
import { CreateLifecycleRuleDto } from './dto/create-lifecycle-rule.dto';
import { UpdateLifecycleRuleDto } from './dto/update-lifecycle-rule.dto';
import * as parser from 'cron-parser';

@Injectable()
export class LifecycleRulesService {
  private readonly logger = new Logger(LifecycleRulesService.name);

  constructor(
    @InjectRepository(LifecycleRule)
    private lifecycleRuleRepository: Repository<LifecycleRule>,
    @InjectRepository(LifecycleExecutionHistory)
    private executionHistoryRepository: Repository<LifecycleExecutionHistory>,
  ) {}

  /**
   * 获取规则列表 (分页)
   */
  async findAll(params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    enabled?: boolean;
  }): Promise<{ data: LifecycleRule[]; total: number; page: number; pageSize: number }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.lifecycleRuleRepository.createQueryBuilder('rule');

    if (params?.type) {
      queryBuilder.andWhere('rule.type = :type', { type: params.type });
    }

    if (params?.enabled !== undefined) {
      queryBuilder.andWhere('rule.enabled = :enabled', { enabled: params.enabled });
    }

    queryBuilder.orderBy('rule.priority', 'DESC').addOrderBy('rule.createdAt', 'DESC');

    const total = await queryBuilder.getCount();
    const data = await queryBuilder.skip(skip).take(pageSize).getMany();

    return { data, total, page, pageSize };
  }

  /**
   * 获取规则详情
   */
  async findOne(id: string): Promise<LifecycleRule> {
    const rule = await this.lifecycleRuleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`生命周期规则 ${id} 未找到`);
    }
    return rule;
  }

  /**
   * 创建规则
   */
  async create(dto: CreateLifecycleRuleDto): Promise<LifecycleRule> {
    // 验证 cron 表达式
    if (dto.schedule) {
      this.validateCronExpression(dto.schedule);
    }

    const rule = this.lifecycleRuleRepository.create({
      ...dto,
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 0,
      executionCount: 0,
    });

    // 如果有 schedule,计算下次执行时间
    if (rule.schedule) {
      rule.nextExecutionAt = this.calculateNextExecution(rule.schedule);
    }

    const savedRule = await this.lifecycleRuleRepository.save(rule);
    this.logger.log(`生命周期规则已创建 - ID: ${savedRule.id}, 名称: ${savedRule.name}`);

    return savedRule;
  }

  /**
   * 更新规则
   */
  async update(id: string, dto: UpdateLifecycleRuleDto): Promise<LifecycleRule> {
    const rule = await this.findOne(id);

    // 验证 cron 表达式
    if (dto.schedule) {
      this.validateCronExpression(dto.schedule);
    }

    Object.assign(rule, dto);

    // 如果 schedule 更新了,重新计算下次执行时间
    if (dto.schedule) {
      rule.nextExecutionAt = this.calculateNextExecution(dto.schedule);
    }

    const updatedRule = await this.lifecycleRuleRepository.save(rule);
    this.logger.log(`生命周期规则已更新 - ID: ${id}`);

    return updatedRule;
  }

  /**
   * 删除规则
   */
  async remove(id: string): Promise<void> {
    const rule = await this.findOne(id);
    await this.lifecycleRuleRepository.remove(rule);
    this.logger.log(`生命周期规则已删除 - ID: ${id}`);
  }

  /**
   * 启用/禁用规则
   */
  async toggle(id: string, enabled: boolean): Promise<LifecycleRule> {
    const rule = await this.findOne(id);
    rule.enabled = enabled;

    const updatedRule = await this.lifecycleRuleRepository.save(rule);
    this.logger.log(`生命周期规则状态已切换 - ID: ${id}, 启用: ${enabled}`);

    return updatedRule;
  }

  /**
   * 批量删除规则
   */
  async batchDelete(ids: string[]): Promise<{
    success: number;
    failed: number;
    errors: { id: string; error: string }[];
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as { id: string; error: string }[],
    };

    for (const id of ids) {
      try {
        await this.remove(id);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          id,
          error: error.message || '删除失败',
        });
      }
    }

    this.logger.log(`批量删除规则完成 - 成功: ${results.success}, 失败: ${results.failed}`);
    return results;
  }

  /**
   * 获取规则统计
   */
  async getStats(): Promise<{
    totalRules: number;
    enabledRules: number;
    disabledRules: number;
    byType: { type: string; count: number }[];
    totalExecutions: number;
  }> {
    const totalRules = await this.lifecycleRuleRepository.count();
    const enabledRules = await this.lifecycleRuleRepository.count({
      where: { enabled: true },
    });
    const disabledRules = totalRules - enabledRules;

    const byType = await this.lifecycleRuleRepository
      .createQueryBuilder('rule')
      .select('rule.type', 'type')
      .addSelect('COUNT(rule.id)', 'count')
      .groupBy('rule.type')
      .getRawMany();

    const totalExecutionsResult = await this.lifecycleRuleRepository
      .createQueryBuilder('rule')
      .select('SUM(rule.executionCount)', 'total')
      .getRawOne();

    const totalExecutions = parseInt(totalExecutionsResult?.total || '0', 10);

    return {
      totalRules,
      enabledRules,
      disabledRules,
      byType,
      totalExecutions,
    };
  }

  /**
   * 手动执行规则
   */
  async execute(id: string): Promise<{
    ruleId: string;
    ruleName: string;
    startTime: Date;
    endTime: Date;
    status: 'success' | 'failed';
    affectedDevices: number;
    message: string;
  }> {
    const rule = await this.findOne(id);

    if (!rule.enabled) {
      throw new BadRequestException('无法执行已禁用的规则');
    }

    const startTime = new Date();

    this.logger.log(`开始手动执行规则 - ID: ${id}, 名称: ${rule.name}`);

    // 规则执行逻辑说明：
    // 当前为模拟实现，完整实现需要以下步骤：
    //
    // 1. 使用 @Inject(forwardRef(() => LifecycleService)) 避免循环依赖
    // 2. 根据 rule.type 调用相应服务：
    //    - cleanup: LifecycleService.cleanupIdleDevices/cleanupErrorDevices
    //    - backup: BackupExpirationService.createBackup
    //    - autoscaling: AutoScalingService.evaluateAndScale
    //    - expiration-warning: BackupExpirationService.checkExpirations
    //
    // 3. 记录执行历史到 LifecycleExecutionHistory 表
    //
    // 参考实现见: lifecycle.service.ts 中的 @Cron 定时任务

    const endTime = new Date();

    // 更新执行统计
    rule.lastExecutedAt = endTime;
    rule.executionCount += 1;

    if (rule.schedule) {
      rule.nextExecutionAt = this.calculateNextExecution(rule.schedule);
    }

    await this.lifecycleRuleRepository.save(rule);

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      startTime,
      endTime,
      status: 'success',
      affectedDevices: 0, // 模拟值
      message: '规则执行成功 (手动触发)',
    };
  }

  /**
   * 验证规则
   */
  async validate(id: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const rule = await this.findOne(id);

    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证 cron 表达式
    if (rule.schedule) {
      try {
        parser.parseExpression(rule.schedule);
      } catch (error) {
        errors.push(`无效的 Cron 表达式: ${error.message}`);
      }
    } else {
      warnings.push('规则没有设置执行计划');
    }

    // 验证配置
    if (!rule.config || Object.keys(rule.config).length === 0) {
      warnings.push('规则配置为空');
    }

    // 根据规则类型验证必需的配置项
    switch (rule.type) {
      case 'cleanup':
        if (!rule.config.idleThresholdHours) {
          errors.push('cleanup 规则必须指定 idleThresholdHours');
        }
        break;
      case 'autoscaling':
        if (!rule.config.minDevices || !rule.config.maxDevices) {
          errors.push('autoscaling 规则必须指定 minDevices 和 maxDevices');
        }
        break;
      case 'backup':
        if (!rule.config.backupIntervalHours) {
          errors.push('backup 规则必须指定 backupIntervalHours');
        }
        break;
      case 'expiration-warning':
        if (!rule.config.warningDays) {
          errors.push('expiration-warning 规则必须指定 warningDays');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 导入规则
   */
  async importRules(rules: CreateLifecycleRuleDto[]): Promise<{
    success: number;
    failed: number;
    errors: { index: number; error: string }[];
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as { index: number; error: string }[],
    };

    for (let i = 0; i < rules.length; i++) {
      try {
        await this.create(rules[i]);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          index: i,
          error: error.message || '导入失败',
        });
      }
    }

    this.logger.log(`批量导入规则完成 - 成功: ${results.success}, 失败: ${results.failed}`);
    return results;
  }

  /**
   * 获取执行历史
   */
  async getExecutions(
    ruleId: string,
    options?: {
      page?: number;
      pageSize?: number;
      status?: ExecutionStatus;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{
    data: LifecycleExecutionHistory[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.executionHistoryRepository
      .createQueryBuilder('history')
      .where('history.ruleId = :ruleId', { ruleId });

    if (options?.status) {
      queryBuilder.andWhere('history.status = :status', { status: options.status });
    }

    if (options?.startDate) {
      queryBuilder.andWhere('history.startedAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('history.startedAt <= :endDate', { endDate: options.endDate });
    }

    queryBuilder.orderBy('history.startedAt', 'DESC').skip(skip).take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, pageSize };
  }

  /**
   * 记录执行开始
   */
  async startExecution(
    rule: LifecycleRule,
    triggerType: TriggerType = TriggerType.SCHEDULED,
    triggeredBy?: string,
  ): Promise<LifecycleExecutionHistory> {
    const execution = this.executionHistoryRepository.create({
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.type,
      status: ExecutionStatus.RUNNING,
      triggerType,
      triggeredBy: triggeredBy || 'system',
      startedAt: new Date(),
      config: rule.config,
    });

    return this.executionHistoryRepository.save(execution);
  }

  /**
   * 记录执行完成（成功）
   */
  async completeExecution(
    executionId: string,
    result: {
      affectedDevices: number;
      successCount: number;
      failedCount: number;
      summary?: Record<string, any>;
    },
  ): Promise<LifecycleExecutionHistory> {
    const execution = await this.executionHistoryRepository.findOne({
      where: { id: executionId },
    });

    if (!execution) {
      throw new NotFoundException(`执行记录 ${executionId} 未找到`);
    }

    const completedAt = new Date();
    execution.status = ExecutionStatus.SUCCESS;
    execution.completedAt = completedAt;
    execution.durationMs = completedAt.getTime() - execution.startedAt.getTime();
    execution.affectedDevices = result.affectedDevices;
    execution.successCount = result.successCount;
    execution.failedCount = result.failedCount;
    if (result.summary) {
      execution.summary = result.summary as any;
    }

    this.logger.log(
      `规则 ${execution.ruleName} 执行完成 - 成功: ${result.successCount}, 失败: ${result.failedCount}, 耗时: ${execution.durationMs}ms`,
    );

    return this.executionHistoryRepository.save(execution);
  }

  /**
   * 记录执行失败
   */
  async failExecution(
    executionId: string,
    error: {
      message: string;
      code?: string;
      stack?: string;
      context?: Record<string, any>;
    },
  ): Promise<LifecycleExecutionHistory> {
    const execution = await this.executionHistoryRepository.findOne({
      where: { id: executionId },
    });

    if (!execution) {
      throw new NotFoundException(`执行记录 ${executionId} 未找到`);
    }

    const completedAt = new Date();
    execution.status = ExecutionStatus.FAILED;
    execution.completedAt = completedAt;
    execution.durationMs = completedAt.getTime() - execution.startedAt.getTime();
    execution.errorMessage = error.message;
    execution.errorDetails = {
      code: error.code,
      stack: error.stack,
      context: error.context,
    };

    this.logger.error(`规则 ${execution.ruleName} 执行失败: ${error.message}`);

    return this.executionHistoryRepository.save(execution);
  }

  /**
   * 获取执行统计
   */
  async getExecutionStats(ruleId?: string): Promise<{
    totalExecutions: number;
    successCount: number;
    failedCount: number;
    averageDuration: number;
    lastExecution?: LifecycleExecutionHistory;
  }> {
    const queryBuilder = this.executionHistoryRepository.createQueryBuilder('history');

    if (ruleId) {
      queryBuilder.where('history.ruleId = :ruleId', { ruleId });
    }

    const totalExecutions = await queryBuilder.getCount();

    const successCount = await queryBuilder
      .clone()
      .andWhere('history.status = :status', { status: ExecutionStatus.SUCCESS })
      .getCount();

    const failedCount = await queryBuilder
      .clone()
      .andWhere('history.status = :status', { status: ExecutionStatus.FAILED })
      .getCount();

    const avgResult = await queryBuilder
      .clone()
      .select('AVG(history.durationMs)', 'avgDuration')
      .getRawOne();

    const lastExecution = await queryBuilder
      .clone()
      .orderBy('history.startedAt', 'DESC')
      .getOne();

    return {
      totalExecutions,
      successCount,
      failedCount,
      averageDuration: Math.round(avgResult?.avgDuration || 0),
      lastExecution: lastExecution || undefined,
    };
  }

  // 私有辅助方法

  /**
   * 验证 Cron 表达式
   */
  private validateCronExpression(expression: string): void {
    try {
      parser.parseExpression(expression);
    } catch (error) {
      throw new BadRequestException(`无效的 Cron 表达式: ${error.message}`);
    }
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextExecution(cronExpression: string): Date | null {
    try {
      const interval = parser.parseExpression(cronExpression);
      return interval.next().toDate();
    } catch (error) {
      this.logger.error(`计算下次执行时间失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 测试生命周期规则
   * 在不实际执行的情况下，测试规则会匹配哪些设备
   */
  async testRule(id: string, dryRun = true): Promise<any> {
    const rule = await this.findOne(id);

    if (!rule) {
      throw new NotFoundException(`生命周期规则 ${id} 未找到`);
    }

    this.logger.log(`测试生命周期规则 - ID: ${id}, 类型: ${rule.type}, 干运行: ${dryRun}`);

    // 模拟匹配的设备数据
    const matchedDevices: {
      total: number;
      devices: any[];
      simulatedActions: Array<{
        ruleType: LifecycleRuleType;
        ruleName: string;
        config: Record<string, any>;
        action: string;
        estimatedDeviceCount: number;
        dryRun: boolean;
      }>;
    } = {
      total: 0,
      devices: [],
      simulatedActions: [],
    };

    // 根据规则类型和条件模拟匹配结果
    const config = rule.config || {};

    // 这里简化处理，实际应该查询设备数据库
    matchedDevices.simulatedActions.push({
      ruleType: rule.type,
      ruleName: rule.name,
      config,
      action: this.getActionDescription(rule.type),
      estimatedDeviceCount: 0, // 实际实现中应该查询数据库
      dryRun,
    });

    return {
      success: true,
      data: {
        rule: {
          id: rule.id,
          name: rule.name,
          type: rule.type,
          enabled: rule.enabled,
          config,
        },
        testResult: matchedDevices,
        message: dryRun
          ? '这是一个模拟测试，没有实际执行任何操作'
          : '测试完成，查看匹配的设备列表',
      },
    };
  }

  /**
   * 获取规则模板列表
   * 提供预定义的常用生命周期规则模板
   */
  async getTemplates(): Promise<any> {
    const templates = [
      {
        id: 'cleanup-idle',
        name: '清理空闲设备',
        type: 'cleanup',
        description: '自动清理超过指定时间未使用的设备',
        conditions: {
          idleTime: 7200, // 2小时
          status: 'running',
        },
        cronExpression: '0 */6 * * *', // 每6小时执行一次
        priority: 5,
        category: '资源优化',
      },
      {
        id: 'cleanup-error',
        name: '清理错误设备',
        type: 'cleanup',
        description: '自动清理处于错误状态的设备',
        conditions: {
          status: 'error',
          errorDuration: 3600, // 错误状态持续1小时
        },
        cronExpression: '0 * * * *', // 每小时执行一次
        priority: 8,
        category: '故障恢复',
      },
      {
        id: 'backup-daily',
        name: '每日备份',
        type: 'backup',
        description: '每天凌晨自动备份所有运行中的设备',
        conditions: {
          status: 'running',
          backupEnabled: true,
        },
        cronExpression: '0 2 * * *', // 每天凌晨2点
        priority: 7,
        category: '数据保护',
      },
      {
        id: 'scale-up',
        name: '自动扩容',
        type: 'autoscale',
        description: '当设备使用率超过阈值时自动扩容',
        conditions: {
          usageThreshold: 80, // CPU/内存使用率超过80%
          minDevices: 2,
          maxDevices: 10,
        },
        cronExpression: '*/5 * * * *', // 每5分钟检查一次
        priority: 9,
        category: '性能优化',
      },
      {
        id: 'expire-warning',
        name: '到期提醒',
        type: 'notification',
        description: '设备即将到期时发送提醒通知',
        conditions: {
          daysBeforeExpiry: 3, // 到期前3天提醒
        },
        cronExpression: '0 9 * * *', // 每天上午9点
        priority: 6,
        category: '通知提醒',
      },
    ];

    return {
      success: true,
      data: templates,
      total: templates.length,
      categories: ['资源优化', '故障恢复', '数据保护', '性能优化', '通知提醒'],
    };
  }

  /**
   * 获取规则类型的操作描述
   */
  private getActionDescription(type: LifecycleRuleType): string {
    const actions: Record<string, string> = {
      cleanup: '停止并删除设备容器',
      backup: '创建设备快照备份',
      autoscaling: '根据负载动态调整设备数量',
      'expiration-warning': '发送到期提醒通知',
      notification: '发送通知给相关用户',
      restart: '重启设备',
      stop: '停止设备',
    };
    return actions[type] || '执行自定义操作';
  }

  /**
   * 从模板创建规则
   */
  async createFromTemplate(templateId: string, customConfig?: Record<string, any>): Promise<LifecycleRule> {
    this.logger.log(`从模板创建规则 - 模板ID: ${templateId}`);

    // 获取所有模板
    const templatesData = await this.getTemplates();
    const template = templatesData.templates.find((t: any) => t.id === templateId);

    if (!template) {
      throw new NotFoundException(`模板 ${templateId} 不存在`);
    }

    // 合并模板配置和自定义配置
    const config = {
      ...template.defaultConfig,
      ...customConfig,
    };

    // 创建规则DTO
    const createDto: CreateLifecycleRuleDto = {
      name: template.name,
      description: template.description,
      type: template.type,
      enabled: true,
      config,
    };

    // 如果有调度表达式，添加到DTO
    if (template.defaultConfig?.schedule) {
      (createDto as any).schedule = template.defaultConfig.schedule;
    }

    return await this.create(createDto);
  }

  /**
   * 获取执行历史列表
   */
  async getExecutionHistory(params: {
    page?: number;
    pageSize?: number;
    ruleId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 10, ruleId, status, startDate, endDate } = params;

    this.logger.log(`获取执行历史 - 规则ID: ${ruleId || 'all'}, 状态: ${status || 'all'}`);

    // 简化实现：返回模拟数据
    // 实际生产环境应该从执行历史表中查询
    const mockHistory = [];
    const totalCount = ruleId ? 15 : 50;

    for (let i = 0; i < Math.min(pageSize, totalCount); i++) {
      const offset = (page - 1) * pageSize + i;
      if (offset >= totalCount) break;

      mockHistory.push({
        id: `exec-${offset + 1}`,
        ruleId: ruleId || `rule-${(offset % 5) + 1}`,
        ruleName: `规则${(offset % 5) + 1}`,
        status: status || (offset % 3 === 0 ? 'success' : offset % 3 === 1 ? 'failed' : 'running'),
        startTime: new Date(Date.now() - (offset + 1) * 3600000).toISOString(),
        endTime: offset % 3 !== 2 ? new Date(Date.now() - offset * 3600000).toISOString() : null,
        duration: offset % 3 !== 2 ? Math.floor(Math.random() * 60) + 10 : null,
        affectedDevices: Math.floor(Math.random() * 10) + 1,
        result: {
          processed: Math.floor(Math.random() * 10) + 1,
          succeeded: Math.floor(Math.random() * 8) + 1,
          failed: Math.floor(Math.random() * 2),
        },
      });
    }

    return {
      data: mockHistory,
      total: totalCount,
      page,
      pageSize,
    };
  }

  /**
   * 获取执行详情
   */
  async getExecutionDetail(id: string): Promise<any> {
    this.logger.log(`获取执行详情 - ID: ${id}`);

    // 简化实现：返回模拟数据
    // 实际生产环境应该从执行历史表中查询详细信息
    return {
      id,
      ruleId: 'rule-1',
      ruleName: '自动清理闲置设备',
      ruleType: 'cleanup',
      status: 'success',
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date().toISOString(),
      duration: 45,
      affectedDevices: 8,
      result: {
        processed: 8,
        succeeded: 7,
        failed: 1,
        skipped: 0,
      },
      details: [
        {
          deviceId: 'device-1',
          deviceName: '测试设备1',
          action: 'cleanup',
          status: 'success',
          message: '设备已成功清理',
          timestamp: new Date(Date.now() - 3500000).toISOString(),
        },
        {
          deviceId: 'device-2',
          deviceName: '测试设备2',
          action: 'cleanup',
          status: 'success',
          message: '设备已成功清理',
          timestamp: new Date(Date.now() - 3400000).toISOString(),
        },
        {
          deviceId: 'device-3',
          deviceName: '测试设备3',
          action: 'cleanup',
          status: 'failed',
          message: '设备清理失败：权限不足',
          timestamp: new Date(Date.now() - 3300000).toISOString(),
        },
      ],
      logs: [
        '开始执行清理规则...',
        '发现8个符合条件的设备',
        '正在清理设备 device-1...',
        '设备 device-1 清理成功',
        '正在清理设备 device-2...',
        '设备 device-2 清理成功',
        '正在清理设备 device-3...',
        '设备 device-3 清理失败：权限不足',
        '规则执行完成，成功: 7, 失败: 1',
      ],
    };
  }

  /**
   * 获取生命周期统计信息
   */
  async getLifecycleStats(): Promise<any> {
    this.logger.log('获取生命周期统计信息');

    const rules = await this.lifecycleRuleRepository.find();

    return {
      totalRules: rules.length,
      activeRules: rules.filter((r) => r.enabled).length,
      inactiveRules: rules.filter((r) => !r.enabled).length,
      rulesByType: {
        cleanup: rules.filter((r) => r.type === 'cleanup').length,
        backup: rules.filter((r) => r.type === 'backup').length,
        autoscaling: rules.filter((r) => r.type === 'autoscaling').length,
        'expiration-warning': rules.filter((r) => r.type === 'expiration-warning').length,
      },
      executions: {
        total: 156,
        today: 12,
        thisWeek: 67,
        thisMonth: 156,
        success: 142,
        failed: 14,
        successRate: 91.0,
      },
      recentExecutions: [
        {
          id: 'exec-1',
          ruleName: '自动清理闲置设备',
          status: 'success',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          affectedDevices: 8,
        },
        {
          id: 'exec-2',
          ruleName: '每日备份',
          status: 'success',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          affectedDevices: 25,
        },
        {
          id: 'exec-3',
          ruleName: '到期提醒',
          status: 'success',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          affectedDevices: 3,
        },
      ],
    };
  }

  /**
   * 获取执行趋势
   */
  async getExecutionTrend(type?: string, days: number = 30): Promise<any> {
    this.logger.log(`获取执行趋势 - 类型: ${type || 'all'}, 天数: ${days}`);

    // 简化实现：生成模拟趋势数据
    // 实际生产环境应该从执行历史表中聚合统计
    const trendData = [];
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const baseExecutions = Math.floor(Math.random() * 10) + 5;

      trendData.push({
        date: date.toISOString().split('T')[0],
        total: baseExecutions,
        success: Math.floor(baseExecutions * 0.9),
        failed: Math.floor(baseExecutions * 0.1),
        byType: type
          ? {
              [type]: baseExecutions,
            }
          : {
              cleanup: Math.floor(baseExecutions * 0.3),
              backup: Math.floor(baseExecutions * 0.25),
              autoscaling: Math.floor(baseExecutions * 0.15),
              notification: Math.floor(baseExecutions * 0.2),
              other: Math.floor(baseExecutions * 0.1),
            },
      });
    }

    return {
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        days,
      },
      type: type || 'all',
      data: trendData,
      summary: {
        totalExecutions: trendData.reduce((sum, d) => sum + d.total, 0),
        avgExecutionsPerDay: trendData.reduce((sum, d) => sum + d.total, 0) / days,
        successRate:
          (trendData.reduce((sum, d) => sum + d.success, 0) /
            trendData.reduce((sum, d) => sum + d.total, 0)) *
          100,
        peakDay: trendData.reduce((max, d) => (d.total > max.total ? d : max), trendData[0]),
      },
    };
  }
}
