import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventBusService } from '@cloudphone/shared';
import { Agent, AgentStatus, AgentRole } from '../entities/agent.entity';
import { AgentGroup, GroupType } from '../entities/agent-group.entity';
import { CannedResponse } from '../entities/canned-response.entity';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    @InjectRepository(AgentGroup)
    private groupRepo: Repository<AgentGroup>,
    @InjectRepository(CannedResponse)
    private cannedResponseRepo: Repository<CannedResponse>,
    private eventBus: EventBusService,
  ) {}

  // ========== 客服管理 ==========

  async createAgent(data: Partial<Agent>): Promise<Agent> {
    const existing = await this.agentRepo.findOne({ where: { userId: data.userId } });
    if (existing) {
      throw new ConflictException('Agent already exists for this user');
    }

    const agent = this.agentRepo.create(data);
    return this.agentRepo.save(agent);
  }

  async getAgent(id: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({
      where: { id },
      relations: ['group'],
    });
    if (!agent) {
      throw new NotFoundException(`Agent ${id} not found`);
    }
    return agent;
  }

  async getAgentByUserId(userId: string): Promise<Agent | null> {
    return this.agentRepo.findOne({
      where: { userId },
      relations: ['group'],
    });
  }

  async updateAgent(id: string, data: Partial<Agent>): Promise<Agent> {
    const agent = await this.getAgent(id);
    Object.assign(agent, data);
    return this.agentRepo.save(agent);
  }

  async updateAgentStatus(userId: string, status: AgentStatus): Promise<Agent> {
    const agent = await this.agentRepo.findOne({ where: { userId } });
    if (!agent) {
      throw new NotFoundException(`Agent not found for user ${userId}`);
    }

    const previousStatus = agent.status;
    agent.status = status;
    agent.lastActiveAt = new Date();

    if (status === AgentStatus.ONLINE) {
      agent.lastLoginAt = new Date();
    }

    const saved = await this.agentRepo.save(agent);

    // RabbitMQ 事件 - 通知客服状态变化
    await this.eventBus.publish('cloudphone.events', 'livechat.agent_status_changed', {
      agentId: saved.id,
      userId: saved.userId,
      tenantId: saved.tenantId,
      previousStatus,
      newStatus: status,
      isOnline: status === AgentStatus.ONLINE,
      timestamp: new Date(),
    });

    this.logger.log(`Agent ${saved.id} status changed: ${previousStatus} -> ${status}`);

    return saved;
  }

  async listAgents(tenantId: string, status?: AgentStatus): Promise<Agent[]> {
    const where: any = { tenantId, isActive: true };
    if (status) {
      where.status = status;
    }
    return this.agentRepo.find({
      where,
      relations: ['group'],
      order: { name: 'ASC' },
    });
  }

  async getAvailableAgents(tenantId: string, groupId?: string): Promise<Agent[]> {
    const query = this.agentRepo
      .createQueryBuilder('agent')
      .where('agent.tenantId = :tenantId', { tenantId })
      .andWhere('agent.isActive = true')
      .andWhere('agent.isAcceptingChats = true')
      .andWhere('agent.status = :status', { status: AgentStatus.ONLINE })
      .andWhere('agent.currentChatCount < agent.maxConcurrentChats');

    if (groupId) {
      query.andWhere('agent.groupId = :groupId', { groupId });
    }

    return query.orderBy('agent.currentChatCount', 'ASC').getMany();
  }

  async incrementChatCount(agentId: string): Promise<void> {
    await this.agentRepo.increment({ id: agentId }, 'currentChatCount', 1);
  }

  async decrementChatCount(agentId: string): Promise<void> {
    await this.agentRepo.decrement({ id: agentId }, 'currentChatCount', 1);
  }

  // ========== 客服分组 ==========

  async createGroup(data: Partial<AgentGroup>): Promise<AgentGroup> {
    const group = this.groupRepo.create(data);
    return this.groupRepo.save(group);
  }

  async getGroup(id: string): Promise<AgentGroup> {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: ['agents'],
    });
    if (!group) {
      throw new NotFoundException(`Agent group ${id} not found`);
    }
    return group;
  }

  async listGroups(tenantId: string): Promise<AgentGroup[]> {
    return this.groupRepo.find({
      where: { tenantId, isActive: true },
      relations: ['agents'],
      order: { priority: 'DESC', name: 'ASC' },
    });
  }

  async updateGroup(id: string, data: Partial<AgentGroup>): Promise<AgentGroup> {
    const group = await this.getGroup(id);
    Object.assign(group, data);
    return this.groupRepo.save(group);
  }

  // ========== 快捷回复 ==========

  async createCannedResponse(data: Partial<CannedResponse>): Promise<CannedResponse> {
    const response = this.cannedResponseRepo.create(data);
    return this.cannedResponseRepo.save(response);
  }

  async listCannedResponses(tenantId: string, agentId?: string): Promise<CannedResponse[]> {
    const query = this.cannedResponseRepo
      .createQueryBuilder('cr')
      .where('cr.tenantId = :tenantId', { tenantId })
      .andWhere('cr.isActive = true')
      .andWhere('(cr.isGlobal = true OR cr.agentId = :agentId)', { agentId });

    return query.orderBy('cr.useCount', 'DESC').getMany();
  }

  async useCannedResponse(id: string): Promise<CannedResponse> {
    const response = await this.cannedResponseRepo.findOne({ where: { id } });
    if (!response) {
      throw new NotFoundException(`Canned response ${id} not found`);
    }

    response.useCount += 1;
    return this.cannedResponseRepo.save(response);
  }

  // ========== 统计 ==========

  async getAgentStats(agentId: string): Promise<any> {
    const agent = await this.getAgent(agentId);
    return {
      totalConversations: agent.totalConversations,
      totalMessages: agent.totalMessages,
      avgResponseTime: agent.avgResponseTime,
      avgRating: agent.avgRating,
      ratingCount: agent.ratingCount,
      currentChatCount: agent.currentChatCount,
    };
  }
}
