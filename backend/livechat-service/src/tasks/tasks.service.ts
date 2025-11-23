import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Lock, DistributedLockService } from '@cloudphone/shared';
import { Conversation, ConversationStatus } from '../entities/conversation.entity';
import { Agent, AgentStatus } from '../entities/agent.entity';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    private configService: ConfigService,
    private lockService: DistributedLockService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  @Lock({ key: 'livechat:idle-check', ttl: 60000 })
  async checkIdleConversations() {
    const idleTimeout = this.configService.get('SESSION_IDLE_TIMEOUT', 600);
    const cutoff = new Date(Date.now() - idleTimeout * 1000);

    // 找到空闲的活跃会话
    const idleConversations = await this.conversationRepo.find({
      where: {
        status: ConversationStatus.ACTIVE,
        lastMessageAt: LessThan(cutoff),
      },
    });

    for (const conv of idleConversations) {
      this.logger.log(`Conversation ${conv.id} is idle, sending reminder...`);
      // 可以发送提醒消息或自动关闭
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  @Lock({ key: 'livechat:auto-close', ttl: 120000 })
  async autoCloseResolvedConversations() {
    const autoClose = this.configService.get('AUTO_CLOSE_RESOLVED', true);
    if (!autoClose) {
      return;
    }

    // 1小时前已解决的会话自动关闭
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);

    const result = await this.conversationRepo.update(
      {
        status: ConversationStatus.RESOLVED,
        resolvedAt: LessThan(cutoff),
      },
      {
        status: ConversationStatus.CLOSED,
        closedAt: new Date(),
      },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Auto-closed ${result.affected} resolved conversations`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  @Lock({ key: 'livechat:agent-heartbeat', ttl: 30000 })
  async checkAgentHeartbeat() {
    // 30分钟无活动的客服标记为离线
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);

    const result = await this.agentRepo.update(
      {
        status: AgentStatus.ONLINE,
        lastActiveAt: LessThan(cutoff),
      },
      {
        status: AgentStatus.AWAY,
      },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Marked ${result.affected} agents as away due to inactivity`);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async updateAgentStats() {
    // 更新客服统计数据
    const agents = await this.agentRepo.find({ where: { isActive: true } });

    for (const agent of agents) {
      const activeChats = await this.conversationRepo.count({
        where: {
          agentId: agent.id,
          status: ConversationStatus.ACTIVE,
        },
      });

      if (agent.currentChatCount !== activeChats) {
        await this.agentRepo.update(agent.id, { currentChatCount: activeChats });
      }
    }
  }
}
