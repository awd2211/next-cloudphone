import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus, TicketPriority, TicketCategory } from './entities/ticket.entity';
import { TicketReply, ReplyType } from './entities/ticket-reply.entity';

export interface CreateTicketDto {
  userId: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  attachments?: any[];
  tags?: string[];
}

export interface CreateReplyDto {
  ticketId: string;
  userId: string;
  content: string;
  type: ReplyType;
  attachments?: any[];
  isInternal?: boolean;
}

export interface UpdateTicketDto {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  tags?: string[];
  internalNotes?: string;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketReply)
    private replyRepository: Repository<TicketReply>,
  ) {}

  /**
   * 创建工单
   */
  async createTicket(dto: CreateTicketDto): Promise<Ticket> {
    const ticketNumber = await this.generateTicketNumber();

    const ticket = this.ticketRepository.create({
      ticketNumber,
      userId: dto.userId,
      subject: dto.subject,
      description: dto.description,
      category: dto.category,
      priority: dto.priority || TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      attachments: dto.attachments || [],
      tags: dto.tags || [],
      replyCount: 0,
    });

    const savedTicket = await this.ticketRepository.save(ticket);
    this.logger.log(
      `工单已创建 - 编号: ${ticketNumber}, 用户: ${dto.userId}, 主题: ${dto.subject}`,
    );

    return savedTicket;
  }

  /**
   * 获取工单详情
   */
  async getTicket(ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['user', 'replies', 'replies.user'],
    });

    if (!ticket) {
      throw new NotFoundException(`工单 ${ticketId} 未找到`);
    }

    return ticket;
  }

  /**
   * 获取用户工单列表
   */
  async getUserTickets(
    userId: string,
    options?: {
      status?: TicketStatus;
      category?: TicketCategory;
      priority?: TicketPriority;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ tickets: Ticket[]; total: number }> {
    const queryBuilder = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user')
      .where('ticket.userId = :userId', { userId });

    if (options?.status) {
      queryBuilder.andWhere('ticket.status = :status', { status: options.status });
    }

    if (options?.category) {
      queryBuilder.andWhere('ticket.category = :category', {
        category: options.category,
      });
    }

    if (options?.priority) {
      queryBuilder.andWhere('ticket.priority = :priority', {
        priority: options.priority,
      });
    }

    queryBuilder.orderBy('ticket.createdAt', 'DESC');

    const total = await queryBuilder.getCount();

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    const tickets = await queryBuilder.getMany();

    return { tickets, total };
  }

  /**
   * 获取所有工单（管理员）
   */
  async getAllTickets(options?: {
    status?: TicketStatus;
    assignedTo?: string;
    priority?: TicketPriority;
    category?: TicketCategory;
    limit?: number;
    offset?: number;
  }): Promise<{ tickets: Ticket[]; total: number }> {
    const queryBuilder = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user');

    if (options?.status) {
      queryBuilder.andWhere('ticket.status = :status', { status: options.status });
    }

    if (options?.assignedTo) {
      queryBuilder.andWhere('ticket.assignedTo = :assignedTo', {
        assignedTo: options.assignedTo,
      });
    }

    if (options?.priority) {
      queryBuilder.andWhere('ticket.priority = :priority', {
        priority: options.priority,
      });
    }

    if (options?.category) {
      queryBuilder.andWhere('ticket.category = :category', {
        category: options.category,
      });
    }

    queryBuilder.orderBy('ticket.createdAt', 'DESC');

    const total = await queryBuilder.getCount();

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    const tickets = await queryBuilder.getMany();

    return { tickets, total };
  }

  /**
   * 更新工单
   */
  async updateTicket(ticketId: string, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`工单 ${ticketId} 未找到`);
    }

    if (dto.status) {
      ticket.status = dto.status;

      if (dto.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
      }

      if (dto.status === TicketStatus.CLOSED && !ticket.closedAt) {
        ticket.closedAt = new Date();
      }
    }

    if (dto.priority !== undefined) {
      ticket.priority = dto.priority;
    }

    if (dto.assignedTo !== undefined) {
      ticket.assignedTo = dto.assignedTo;
    }

    if (dto.tags) {
      ticket.tags = dto.tags;
    }

    if (dto.internalNotes) {
      ticket.internalNotes = dto.internalNotes;
    }

    const updatedTicket = await this.ticketRepository.save(ticket);
    this.logger.log(`工单已更新 - 编号: ${ticket.ticketNumber}`);

    return updatedTicket;
  }

  /**
   * 添加回复
   */
  async addReply(dto: CreateReplyDto): Promise<TicketReply> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: dto.ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`工单 ${dto.ticketId} 未找到`);
    }

    if (!ticket.canReply()) {
      throw new BadRequestException('工单已关闭，无法回复');
    }

    const reply = this.replyRepository.create({
      ticketId: dto.ticketId,
      userId: dto.userId,
      content: dto.content,
      type: dto.type,
      attachments: dto.attachments || [],
      isInternal: dto.isInternal || false,
    });

    const savedReply = await this.replyRepository.save(reply);

    // 更新工单回复计数和最后回复时间
    ticket.replyCount += 1;
    ticket.lastReplyAt = new Date();

    // 如果是客服首次回复，记录首次响应时间
    if (dto.type === ReplyType.STAFF && !ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
    }

    // 如果工单状态是 OPEN，自动改为 IN_PROGRESS
    if (ticket.status === TicketStatus.OPEN && dto.type === ReplyType.STAFF) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }

    await this.ticketRepository.save(ticket);

    this.logger.log(
      `工单回复已添加 - 工单编号: ${ticket.ticketNumber}, 类型: ${dto.type}`,
    );

    return savedReply;
  }

  /**
   * 获取工单回复列表
   */
  async getTicketReplies(
    ticketId: string,
    includeInternal: boolean = false,
  ): Promise<TicketReply[]> {
    const queryBuilder = this.replyRepository
      .createQueryBuilder('reply')
      .leftJoinAndSelect('reply.user', 'user')
      .where('reply.ticketId = :ticketId', { ticketId });

    if (!includeInternal) {
      queryBuilder.andWhere('reply.isInternal = false');
    }

    queryBuilder.orderBy('reply.createdAt', 'ASC');

    return await queryBuilder.getMany();
  }

  /**
   * 工单评分
   */
  async rateTicket(
    ticketId: string,
    rating: number,
    feedback?: string,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`工单 ${ticketId} 未找到`);
    }

    if (!ticket.isClosed()) {
      throw new BadRequestException('只能对已关闭的工单进行评分');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('评分必须在 1-5 之间');
    }

    ticket.rating = rating;
    ticket.feedback = feedback || '';

    const updatedTicket = await this.ticketRepository.save(ticket);
    this.logger.log(`工单已评分 - 编号: ${ticket.ticketNumber}, 评分: ${rating}`);

    return updatedTicket;
  }

  /**
   * 获取工单统计
   */
  async getTicketStatistics(userId?: string): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const where = userId ? { userId } : {};

    const [
      total,
      open,
      inProgress,
      resolved,
      closed,
    ] = await Promise.all([
      this.ticketRepository.count({ where }),
      this.ticketRepository.count({ where: { ...where, status: TicketStatus.OPEN } }),
      this.ticketRepository.count({
        where: { ...where, status: TicketStatus.IN_PROGRESS },
      }),
      this.ticketRepository.count({
        where: { ...where, status: TicketStatus.RESOLVED },
      }),
      this.ticketRepository.count({ where: { ...where, status: TicketStatus.CLOSED } }),
    ]);

    const allTickets = await this.ticketRepository.find({ where });

    // 计算平均响应时间
    const responseTimes = allTickets
      .map((t) => t.getResponseTime())
      .filter((t) => t !== null) as number[];
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // 计算平均解决时间
    const resolutionTimes = allTickets
      .map((t) => t.getResolutionTime())
      .filter((t) => t !== null) as number[];
    const avgResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

    // 按分类统计
    const byCategory: Record<string, number> = {};
    for (const category of Object.values(TicketCategory)) {
      byCategory[category] = await this.ticketRepository.count({
        where: { ...where, category },
      });
    }

    // 按优先级统计
    const byPriority: Record<string, number> = {};
    for (const priority of Object.values(TicketPriority)) {
      byPriority[priority] = await this.ticketRepository.count({
        where: { ...where, priority },
      });
    }

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
      avgResponseTime: Math.round(avgResponseTime / 1000 / 60), // 转换为分钟
      avgResolutionTime: Math.round(avgResolutionTime / 1000 / 60 / 60), // 转换为小时
      byCategory,
      byPriority,
    };
  }

  // 私有辅助方法
  private async generateTicketNumber(): Promise<string> {
    const now = new Date();
    const prefix = `TKT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const lastTicket = await this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.ticketNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('ticket.ticketNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastTicket) {
      const lastSequence = parseInt(lastTicket.ticketNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }
}
