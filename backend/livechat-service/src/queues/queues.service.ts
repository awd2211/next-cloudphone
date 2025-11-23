import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { EventBusService } from '@cloudphone/shared';
import { QueueConfig, RoutingStrategy } from '../entities/queue-config.entity';
import { QueueItem, QueueItemStatus } from '../entities/queue-item.entity';
import { AgentsService } from '../agents/agents.service';
import { Agent } from '../entities/agent.entity';

@Injectable()
export class QueuesService {
  private readonly logger = new Logger(QueuesService.name);

  constructor(
    @InjectRepository(QueueConfig)
    private queueConfigRepo: Repository<QueueConfig>,
    @InjectRepository(QueueItem)
    private queueItemRepo: Repository<QueueItem>,
    private agentsService: AgentsService,
    private eventEmitter: EventEmitter2,
    private eventBus: EventBusService,
  ) {}

  // ========== 排队配置管理 ==========

  async createConfig(data: Partial<QueueConfig>): Promise<QueueConfig> {
    const config = this.queueConfigRepo.create(data);
    return this.queueConfigRepo.save(config);
  }

  async getConfig(id: string): Promise<QueueConfig> {
    const config = await this.queueConfigRepo.findOne({
      where: { id },
      relations: ['group'],
    });
    if (!config) {
      throw new NotFoundException(`Queue config ${id} not found`);
    }
    return config;
  }

  async listConfigs(tenantId: string): Promise<QueueConfig[]> {
    return this.queueConfigRepo.find({
      where: { tenantId, isActive: true },
      relations: ['group'],
      order: { priority: 'DESC' },
    });
  }

  async updateConfig(id: string, data: Partial<QueueConfig>): Promise<QueueConfig> {
    const config = await this.getConfig(id);
    Object.assign(config, data);
    return this.queueConfigRepo.save(config);
  }

  // ========== 排队管理 ==========

  async enqueue(data: {
    conversationId: string;
    userId: string;
    userName?: string;
    tenantId: string;
    groupId?: string;
    requiredSkills?: string[];
    priority?: number;
    metadata?: Record<string, any>;
  }): Promise<QueueItem> {
    // 计算队列位置
    const position = await this.queueItemRepo.count({
      where: {
        tenantId: data.tenantId,
        status: QueueItemStatus.WAITING,
        groupId: data.groupId,
      },
    });

    // 估算等待时间
    const estimatedWaitTime = await this.estimateWaitTime(data.tenantId, data.groupId);

    const item = this.queueItemRepo.create({
      ...data,
      status: QueueItemStatus.WAITING,
      position: position + 1,
      estimatedWaitTime,
    });

    const saved = await this.queueItemRepo.save(item);

    this.logger.log(`Enqueued conversation ${data.conversationId}, position: ${position + 1}`);

    // RabbitMQ 事件 - 通知用户进入排队
    await this.eventBus.publish('cloudphone.events', 'livechat.user_queued', {
      queueItemId: saved.id,
      conversationId: saved.conversationId,
      userId: saved.userId,
      tenantId: saved.tenantId,
      groupId: saved.groupId,
      position: saved.position,
      estimatedWaitTime: saved.estimatedWaitTime,
      createdAt: saved.createdAt,
    });

    // 尝试自动分配
    this.tryAutoAssign(saved);

    return saved;
  }

  async dequeue(conversationId: string): Promise<void> {
    await this.queueItemRepo.update(
      { conversationId, status: QueueItemStatus.WAITING },
      { status: QueueItemStatus.CANCELLED },
    );
  }

  async getQueuePosition(conversationId: string): Promise<{ position: number; estimatedWaitTime: number } | null> {
    const item = await this.queueItemRepo.findOne({
      where: { conversationId, status: QueueItemStatus.WAITING },
    });

    if (!item) {
      return null;
    }

    // 重新计算位置
    const position = await this.queueItemRepo.count({
      where: {
        tenantId: item.tenantId,
        status: QueueItemStatus.WAITING,
        groupId: item.groupId,
        createdAt: LessThan(item.createdAt),
      },
    });

    return {
      position: position + 1,
      estimatedWaitTime: item.estimatedWaitTime || 60,
    };
  }

  async getQueueStats(tenantId: string): Promise<{
    totalWaiting: number;
    avgWaitTime: number;
    byGroup: { groupId: string; count: number }[];
  }> {
    const totalWaiting = await this.queueItemRepo.count({
      where: { tenantId, status: QueueItemStatus.WAITING },
    });

    const byGroup = await this.queueItemRepo
      .createQueryBuilder('qi')
      .select('qi.groupId', 'groupId')
      .addSelect('COUNT(*)', 'count')
      .where('qi.tenantId = :tenantId', { tenantId })
      .andWhere('qi.status = :status', { status: QueueItemStatus.WAITING })
      .groupBy('qi.groupId')
      .getRawMany();

    return {
      totalWaiting,
      avgWaitTime: await this.estimateWaitTime(tenantId),
      byGroup,
    };
  }

  // ========== 智能分配 ==========

  async tryAutoAssign(queueItem: QueueItem): Promise<Agent | null> {
    // 获取可用客服
    const agents = await this.agentsService.getAvailableAgents(
      queueItem.tenantId,
      queueItem.groupId,
    );

    if (agents.length === 0) {
      return null;
    }

    // 获取分配策略
    const config = queueItem.groupId
      ? await this.queueConfigRepo.findOne({ where: { groupId: queueItem.groupId } })
      : null;

    const strategy = config?.routingStrategy || RoutingStrategy.LEAST_BUSY;

    // 根据策略选择客服
    const selectedAgent = this.selectAgent(agents, strategy, queueItem.requiredSkills);

    if (selectedAgent) {
      // 更新队列项
      queueItem.status = QueueItemStatus.ASSIGNED;
      queueItem.assignedAgentId = selectedAgent.id;
      queueItem.assignedAt = new Date();
      await this.queueItemRepo.save(queueItem);

      // 本地事件 (用于 WebSocket 广播)
      this.eventEmitter.emit('queue.assigned', {
        queueItem,
        agent: selectedAgent,
      });

      // RabbitMQ 事件 - 通知排队分配成功
      await this.eventBus.publish('cloudphone.events', 'livechat.queue_assigned', {
        queueItemId: queueItem.id,
        conversationId: queueItem.conversationId,
        userId: queueItem.userId,
        agentId: selectedAgent.id,
        tenantId: queueItem.tenantId,
        waitTime: queueItem.assignedAt && queueItem.createdAt
          ? Math.floor((queueItem.assignedAt.getTime() - queueItem.createdAt.getTime()) / 1000)
          : 0,
        strategy: config?.routingStrategy || RoutingStrategy.LEAST_BUSY,
        assignedAt: queueItem.assignedAt,
      });

      this.logger.log(`Auto-assigned conversation ${queueItem.conversationId} to agent ${selectedAgent.id}`);

      return selectedAgent;
    }

    return null;
  }

  private selectAgent(agents: Agent[], strategy: RoutingStrategy, requiredSkills?: string[]): Agent | null {
    let candidates = agents;

    // 技能过滤
    if (requiredSkills && requiredSkills.length > 0) {
      candidates = agents.filter((agent) =>
        requiredSkills.every((skill) => agent.skills?.includes(skill)),
      );
    }

    if (candidates.length === 0) {
      candidates = agents; // 回退到所有可用客服
    }

    switch (strategy) {
      case RoutingStrategy.ROUND_ROBIN:
        return candidates[Math.floor(Date.now() / 1000) % candidates.length];

      case RoutingStrategy.LEAST_BUSY:
        return candidates.reduce((a, b) =>
          a.currentChatCount <= b.currentChatCount ? a : b,
        );

      case RoutingStrategy.SKILL_BASED:
        // 优先选择技能匹配度高的
        const ranked = candidates
          .map((agent) => ({
            agent,
            score: requiredSkills
              ? requiredSkills.filter((s) => agent.skills?.includes(s)).length
              : 0,
          }))
          .sort((a, b) => b.score - a.score);
        return ranked[0]?.agent || null;

      case RoutingStrategy.PRIORITY:
        // 按客服优先级（基于评分）
        return candidates.reduce((a, b) =>
          (a.avgRating || 0) >= (b.avgRating || 0) ? a : b,
        );

      case RoutingStrategy.RANDOM:
        return candidates[Math.floor(Math.random() * candidates.length)];

      default:
        return candidates[0];
    }
  }

  private async estimateWaitTime(tenantId: string, groupId?: string): Promise<number> {
    // 简单估算：等待数 * 平均处理时间
    const waitingCount = await this.queueItemRepo.count({
      where: { tenantId, status: QueueItemStatus.WAITING, groupId },
    });

    const availableAgents = await this.agentsService.getAvailableAgents(tenantId, groupId);
    const agentCount = availableAgents.length || 1;

    // 假设平均处理时间 5 分钟
    const avgHandleTime = 300;

    return Math.ceil((waitingCount / agentCount) * avgHandleTime);
  }

  // ========== 定时任务 ==========

  @Cron(CronExpression.EVERY_MINUTE)
  async processTimeouts() {
    const timeout = parseInt(process.env.QUEUE_MAX_WAIT_TIME || '300', 10);
    const cutoff = new Date(Date.now() - timeout * 1000);

    const timedOut = await this.queueItemRepo.find({
      where: {
        status: QueueItemStatus.WAITING,
        createdAt: LessThan(cutoff),
      },
    });

    for (const item of timedOut) {
      item.status = QueueItemStatus.TIMEOUT;
      await this.queueItemRepo.save(item);

      // 本地事件 (用于 WebSocket 广播)
      this.eventEmitter.emit('queue.timeout', { queueItem: item });

      // RabbitMQ 事件 - 通知排队超时
      await this.eventBus.publish('cloudphone.events', 'livechat.queue_timeout', {
        queueItemId: item.id,
        conversationId: item.conversationId,
        userId: item.userId,
        tenantId: item.tenantId,
        waitTime: timeout,
        timedOutAt: new Date(),
      });

      this.logger.warn(`Queue item ${item.id} timed out`);
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async retryAssignments() {
    const waiting = await this.queueItemRepo.find({
      where: { status: QueueItemStatus.WAITING },
      order: { priority: 'DESC', createdAt: 'ASC' },
      take: 10,
    });

    for (const item of waiting) {
      await this.tryAutoAssign(item);
    }
  }
}
