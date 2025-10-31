import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { Ticket, TicketStatus, TicketPriority, TicketCategory } from './entities/ticket.entity';
import { TicketReply, ReplyType } from './entities/ticket-reply.entity';
import {
  createMockRepository,
  createMockTicket,
  createMockTicketReply,
} from '@cloudphone/shared/testing';

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketRepository: ReturnType<typeof createMockRepository>;
  let ticketReplyRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    ticketRepository = createMockRepository();
    ticketReplyRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: ticketRepository,
        },
        {
          provide: getRepositoryToken(TicketReply),
          useValue: ticketReplyRepository,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  beforeEach(() => {
    ticketRepository.create.mockClear();
    ticketRepository.save.mockClear();
    ticketRepository.find.mockClear();
    ticketRepository.findOne.mockClear();
    ticketRepository.count.mockClear();
    ticketReplyRepository.create.mockClear();
    ticketReplyRepository.save.mockClear();
    ticketReplyRepository.find.mockClear();
  });

  describe('createTicket', () => {
    it('应该成功创建工单', async () => {
      // Arrange
      const dto = {
        userId: 'user-123',
        subject: 'Need help with device',
        description: 'Device is not starting',
        category: TicketCategory.TECHNICAL,
        priority: TicketPriority.HIGH,
      };

      const mockTicket = createMockTicket(dto);

      ticketRepository.create.mockReturnValue(mockTicket);
      ticketRepository.save.mockResolvedValue(mockTicket);
      ticketRepository.count.mockResolvedValue(100); // for ticket number generation

      // Act
      const result = await service.createTicket(dto);

      // Assert
      expect(result).toBeDefined();
      expect(ticketRepository.create).toHaveBeenCalled();
      expect(ticketRepository.save).toHaveBeenCalled();
    });

    it('应该设置初始状态为OPEN', async () => {
      // Arrange
      const dto = {
        userId: 'user-123',
        subject: 'Test',
        description: 'Test description',
      };

      ticketRepository.create.mockImplementation((data) => data as any);
      ticketRepository.save.mockImplementation((ticket) => Promise.resolve(ticket));
      ticketRepository.count.mockResolvedValue(1);

      // Act
      await service.createTicket(dto);

      // Assert
      expect(ticketRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TicketStatus.OPEN,
        })
      );
    });

    it('应该生成唯一的工单号', async () => {
      // Arrange
      const dto = {
        userId: 'user-123',
        subject: 'Test',
        description: 'Test',
      };

      ticketRepository.create.mockImplementation((data) => data as any);
      ticketRepository.save.mockImplementation((ticket) => Promise.resolve(ticket));
      ticketRepository.count.mockResolvedValue(42);

      // Act
      await service.createTicket(dto);

      // Assert
      const createCall = ticketRepository.create.mock.calls[0][0];
      expect(createCall.ticketNumber).toMatch(/^TKT-/);
    });
  });

  describe('getTicket', () => {
    it('应该成功获取工单', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const mockTicket = createMockTicket({ id: ticketId });

      ticketRepository.findOne.mockResolvedValue(mockTicket);

      // Act
      const result = await service.getTicket(ticketId);

      // Assert
      expect(result).toEqual(mockTicket);
      expect(ticketRepository.findOne).toHaveBeenCalledWith({
        where: { id: ticketId },
        relations: ['user', 'replies', 'replies.user'],
      });
    });

    it('应该在工单不存在时抛出NotFoundException', async () => {
      // Arrange
      const ticketId = 'nonexistent';

      ticketRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getTicket(ticketId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserTickets', () => {
    it('应该成功获取用户工单列表', async () => {
      // Arrange
      const userId = 'user-123';
      const mockTickets = [createMockTicket({ userId }), createMockTicket({ userId })];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getMany: jest.fn().mockResolvedValue(mockTickets),
      };

      ticketRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getUserTickets(userId);

      // Assert
      expect(result.tickets).toEqual(mockTickets);
      expect(result.total).toBe(2);
    });

    it('应该支持按状态过滤', async () => {
      // Arrange
      const userId = 'user-123';
      const status = TicketStatus.OPEN;

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      ticketRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.getUserTickets(userId, { status });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('ticket.status = :status', { status });
    });

    it('应该支持分页', async () => {
      // Arrange
      const userId = 'user-123';
      const limit = 20;
      const offset = 20;

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      ticketRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.getUserTickets(userId, { limit, offset });

      // Assert
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(limit);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(offset);
    });
  });

  describe('updateTicket', () => {
    it('应该成功更新工单', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const dto = {
        status: TicketStatus.IN_PROGRESS,
        priority: TicketPriority.URGENT,
      };

      const mockTicket = createMockTicket({ id: ticketId });

      ticketRepository.findOne.mockResolvedValue(mockTicket);
      ticketRepository.save.mockResolvedValue({
        ...mockTicket,
        ...dto,
      });

      // Act
      const result = await service.updateTicket(ticketId, dto);

      // Assert
      expect(ticketRepository.save).toHaveBeenCalled();
    });

    it('应该在工单不存在时抛出NotFoundException', async () => {
      // Arrange
      const ticketId = 'nonexistent';
      const dto = { status: TicketStatus.CLOSED };

      ticketRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateTicket(ticketId, dto)).rejects.toThrow(NotFoundException);
    });

    it('应该在关闭工单时设置closedAt时间', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const dto = { status: TicketStatus.CLOSED };

      const mockTicket = createMockTicket({
        id: ticketId,
        status: TicketStatus.OPEN,
      });

      ticketRepository.findOne.mockResolvedValue(mockTicket);
      ticketRepository.save.mockImplementation((ticket) => Promise.resolve(ticket));

      // Act
      await service.updateTicket(ticketId, dto);

      // Assert
      const savedTicket = ticketRepository.save.mock.calls[0][0];
      expect(savedTicket.closedAt).toBeInstanceOf(Date);
    });
  });

  describe('addReply', () => {
    it('应该成功添加用户回复', async () => {
      // Arrange
      const dto = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        content: 'Thank you for your help',
        type: ReplyType.USER,
      };

      const mockTicket = createMockTicket({
        id: dto.ticketId,
        canReply: jest.fn(() => true),
      });
      const mockReply = createMockTicketReply(dto);

      ticketRepository.findOne.mockResolvedValue(mockTicket);
      ticketReplyRepository.create.mockReturnValue(mockReply);
      ticketReplyRepository.save.mockResolvedValue(mockReply);
      ticketRepository.save.mockResolvedValue(mockTicket);

      // Act
      const result = await service.addReply(dto);

      // Assert
      expect(result).toBeDefined();
      expect(ticketReplyRepository.save).toHaveBeenCalled();
    });

    it('应该在工单不存在时抛出NotFoundException', async () => {
      // Arrange
      const dto = {
        ticketId: 'nonexistent',
        userId: 'user-123',
        content: 'Test',
        type: ReplyType.USER,
      };

      ticketRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.addReply(dto)).rejects.toThrow(NotFoundException);
    });

    it('应该在添加回复后更新工单updatedAt', async () => {
      // Arrange
      const dto = {
        ticketId: 'ticket-123',
        userId: 'user-123',
        content: 'Reply',
        type: ReplyType.USER,
      };

      const mockTicket = createMockTicket({
        id: dto.ticketId,
        canReply: jest.fn(() => true),
      });

      ticketRepository.findOne.mockResolvedValue(mockTicket);
      ticketReplyRepository.create.mockReturnValue({} as any);
      ticketReplyRepository.save.mockResolvedValue({} as any);
      ticketRepository.save.mockResolvedValue(mockTicket);

      // Act
      await service.addReply(dto);

      // Assert
      expect(ticketRepository.save).toHaveBeenCalled();
    });
  });

  describe('getTicketReplies', () => {
    it('应该成功获取工单回复列表', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const mockReplies = [
        createMockTicketReply({ ticketId }),
        createMockTicketReply({ ticketId }),
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockReplies),
      };

      ticketReplyRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getTicketReplies(ticketId);

      // Assert
      expect(result).toEqual(mockReplies);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('reply.ticketId = :ticketId', {
        ticketId,
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('reply.createdAt', 'ASC');
    });

    it('应该按创建时间升序排序', async () => {
      // Arrange
      const ticketId = 'ticket-123';

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      ticketReplyRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.getTicketReplies(ticketId);

      // Assert
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('reply.createdAt', 'ASC');
    });
  });

  describe('rateTicket', () => {
    it('应该成功评分工单', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const rating = 5;
      const feedback = 'Excellent service';

      const mockTicket = createMockTicket({
        id: ticketId,
        status: TicketStatus.CLOSED,
        isClosed: jest.fn(() => true),
      });

      ticketRepository.findOne.mockResolvedValue(mockTicket);
      ticketRepository.save.mockResolvedValue({
        ...mockTicket,
        rating,
        feedback,
      });

      // Act
      const result = await service.rateTicket(ticketId, rating, feedback);

      // Assert
      expect(ticketRepository.save).toHaveBeenCalled();
      const savedTicket = ticketRepository.save.mock.calls[0][0];
      expect(savedTicket.rating).toBe(rating);
      expect(savedTicket.feedback).toBe(feedback);
    });

    it('应该在工单不存在时抛出NotFoundException', async () => {
      // Arrange
      const ticketId = 'nonexistent';

      ticketRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.rateTicket(ticketId, 5)).rejects.toThrow(NotFoundException);
    });

    it('应该在工单未关闭时抛出BadRequestException', async () => {
      // Arrange
      const ticketId = 'ticket-123';

      const mockTicket = createMockTicket({
        id: ticketId,
        status: TicketStatus.OPEN,
        isClosed: jest.fn(() => false),
      });

      ticketRepository.findOne.mockResolvedValue(mockTicket);

      // Act & Assert
      await expect(service.rateTicket(ticketId, 5)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTicketStatistics', () => {
    it('应该返回工单统计信息', async () => {
      // Arrange
      const mockTickets = [
        createMockTicket({
          status: TicketStatus.OPEN,
          getResponseTime: jest.fn(() => 3600000), // 1 hour
          getResolutionTime: jest.fn(() => null),
        }),
        createMockTicket({
          status: TicketStatus.CLOSED,
          getResponseTime: jest.fn(() => 1800000), // 30 min
          getResolutionTime: jest.fn(() => 7200000), // 2 hours
        }),
      ];

      ticketRepository.count.mockResolvedValue(10); // Default for category/priority counts
      ticketRepository.find.mockResolvedValue(mockTickets);

      // Act
      const result = await service.getTicketStatistics();

      // Assert
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.open).toBeGreaterThanOrEqual(0);
      expect(result.inProgress).toBeGreaterThanOrEqual(0);
      expect(result.resolved).toBeGreaterThanOrEqual(0);
      expect(result.closed).toBeGreaterThanOrEqual(0);
      expect(result.byCategory).toBeDefined();
      expect(result.byPriority).toBeDefined();
      expect(result.avgResponseTime).toBeGreaterThanOrEqual(0);
      expect(result.avgResolutionTime).toBeGreaterThanOrEqual(0);
    });

    it('应该支持按用户ID过滤统计', async () => {
      // Arrange
      const userId = 'user-123';

      const mockTickets = [
        createMockTicket({
          getResponseTime: jest.fn(() => null),
          getResolutionTime: jest.fn(() => null),
        }),
      ];

      ticketRepository.count.mockResolvedValue(5);
      ticketRepository.find.mockResolvedValue(mockTickets);

      // Act
      await service.getTicketStatistics(userId);

      // Assert
      expect(ticketRepository.find).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('应该正确计算平均响应和解决时间', async () => {
      // Arrange
      const mockTickets = [
        createMockTicket({
          getResponseTime: jest.fn(() => 3600000), // 1 hour = 60 min
          getResolutionTime: jest.fn(() => 7200000), // 2 hours
        }),
        createMockTicket({
          getResponseTime: jest.fn(() => 1800000), // 30 min
          getResolutionTime: jest.fn(() => 3600000), // 1 hour
        }),
      ];

      ticketRepository.count.mockResolvedValue(5);
      ticketRepository.find.mockResolvedValue(mockTickets);

      // Act
      const result = await service.getTicketStatistics();

      // Assert
      // Average response: (60 + 30) / 2 = 45 min
      expect(result.avgResponseTime).toBe(45);
      // Average resolution: (2 + 1) / 2 = 1.5 hours, rounded = 2
      expect(result.avgResolutionTime).toBe(2);
    });

    it('应该在没有响应时间时返回0', async () => {
      // Arrange
      const mockTickets = [
        createMockTicket({
          getResponseTime: jest.fn(() => null),
          getResolutionTime: jest.fn(() => null),
        }),
      ];

      ticketRepository.count.mockResolvedValue(1);
      ticketRepository.find.mockResolvedValue(mockTickets);

      // Act
      const result = await service.getTicketStatistics();

      // Assert
      expect(result.avgResponseTime).toBe(0);
      expect(result.avgResolutionTime).toBe(0);
    });
  });
});
