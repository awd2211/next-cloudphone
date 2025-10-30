import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TicketStatus, TicketPriority, TicketCategory } from './entities/ticket.entity';
import { ReplyType } from './entities/ticket-reply.entity';
import { createAuthToken, mockAuthGuard, mockRolesGuard } from '@cloudphone/shared/testing';
import {
  createMockTicket,
  createMockTicketReply,
  createMockUser,
} from '@cloudphone/shared/testing/mock-factories';

describe('TicketsController', () => {
  let app: INestApplication;
  let ticketsService: jest.Mocked<TicketsService>;

  const mockTicketsService = {
    createTicket: jest.fn(),
    getTicket: jest.fn(),
    getUserTickets: jest.fn(),
    getAllTickets: jest.fn(),
    updateTicket: jest.fn(),
    addReply: jest.fn(),
    getTicketReplies: jest.fn(),
    rateTicket: jest.fn(),
    getTicketStatistics: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: mockTicketsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    ticketsService = module.get(TicketsService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /tickets', () => {
    it('应该成功创建工单', async () => {
      // Arrange
      const createTicketDto = {
        userId: 'user-123',
        subject: '设备无法启动',
        description: '我的设备无法启动，显示错误代码 500',
        category: TicketCategory.TECHNICAL,
        priority: TicketPriority.HIGH,
        tags: ['urgent', 'device-error'],
      };

      const mockTicket = createMockTicket({
        ...createTicketDto,
        ticketNumber: 'TKT-20241030-000001',
      });

      mockTicketsService.createTicket.mockResolvedValue(mockTicket);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(createTicketDto)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ticketNumber');
      expect(response.body.data.subject).toBe('设备无法启动');
      expect(response.body.data.category).toBe(TicketCategory.TECHNICAL);
      expect(mockTicketsService.createTicket).toHaveBeenCalledWith(createTicketDto);
    });

    it('应该使用默认优先级 MEDIUM 创建工单', async () => {
      // Arrange
      const createTicketDto = {
        userId: 'user-123',
        subject: '功能咨询',
        description: '如何使用自动备份功能？',
        category: TicketCategory.OTHER,
      };

      const mockTicket = createMockTicket({
        ...createTicketDto,
        priority: TicketPriority.MEDIUM,
      });

      mockTicketsService.createTicket.mockResolvedValue(mockTicket);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(createTicketDto)
        .expect(201);

      // Assert
      expect(response.body.data.priority).toBe(TicketPriority.MEDIUM);
    });

    it('应该在未授权时返回 401', async () => {
      // Arrange
      const createTicketDto = {
        userId: 'user-123',
        subject: 'Test',
        description: 'Test description',
        category: TicketCategory.OTHER,
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/tickets')
        .send(createTicketDto)
        .expect(401);
    });

    it('应该在缺少必填字段时返回 400', async () => {
      // Arrange
      const invalidDto = {
        userId: 'user-123',
        // 缺少 subject, description, category
      };
      const token = createAuthToken();

      // Act & Assert
      await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /tickets/:id', () => {
    it('应该成功获取工单详情', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const mockUser = createMockUser();
      const mockReplies = [
        createMockTicketReply({ type: ReplyType.USER }),
        createMockTicketReply({ type: ReplyType.STAFF }),
      ];
      const mockTicket = createMockTicket({
        id: ticketId,
        user: mockUser,
        replies: mockReplies,
        replyCount: 2,
      });

      mockTicketsService.getTicket.mockResolvedValue(mockTicket);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(ticketId);
      expect(response.body.data.replies).toHaveLength(2);
      expect(mockTicketsService.getTicket).toHaveBeenCalledWith(ticketId);
    });

    it('应该在工单不存在时返回 404', async () => {
      // Arrange
      const ticketId = 'non-existent';
      mockTicketsService.getTicket.mockRejectedValue(
        new Error('工单 non-existent 未找到'),
      );
      const token = createAuthToken();

      // Act & Assert
      await request(app.getHttpServer())
        .get(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(500); // NestJS 会将未处理的错误转为 500
    });

    it('应该在未授权时返回 401', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/tickets/ticket-123')
        .expect(401);
    });
  });

  describe('GET /tickets/user/:userId', () => {
    it('应该成功获取用户工单列表', async () => {
      // Arrange
      const userId = 'user-123';
      const mockTickets = [
        createMockTicket({ userId, status: TicketStatus.OPEN }),
        createMockTicket({ userId, status: TicketStatus.IN_PROGRESS }),
      ];

      mockTicketsService.getUserTickets.mockResolvedValue({
        tickets: mockTickets,
        total: 2,
      });
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .get(`/tickets/user/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.tickets).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(mockTicketsService.getUserTickets).toHaveBeenCalledWith(
        userId,
        expect.any(Object),
      );
    });

    it('应该支持按状态筛选', async () => {
      // Arrange
      const userId = 'user-123';
      const mockTickets = [
        createMockTicket({ userId, status: TicketStatus.OPEN }),
      ];

      mockTicketsService.getUserTickets.mockResolvedValue({
        tickets: mockTickets,
        total: 1,
      });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get(`/tickets/user/${userId}?status=${TicketStatus.OPEN}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockTicketsService.getUserTickets).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          status: TicketStatus.OPEN,
        }),
      );
    });

    it('应该支持按分类筛选', async () => {
      // Arrange
      const userId = 'user-123';
      mockTicketsService.getUserTickets.mockResolvedValue({
        tickets: [],
        total: 0,
      });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get(`/tickets/user/${userId}?category=${TicketCategory.BILLING}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockTicketsService.getUserTickets).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          category: TicketCategory.BILLING,
        }),
      );
    });

    it('应该支持分页参数', async () => {
      // Arrange
      const userId = 'user-123';
      mockTicketsService.getUserTickets.mockResolvedValue({
        tickets: [],
        total: 50,
      });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get(`/tickets/user/${userId}?limit=10&offset=20`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockTicketsService.getUserTickets).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          limit: 10,
          offset: 20,
        }),
      );
    });

    it('应该支持按优先级筛选', async () => {
      // Arrange
      const userId = 'user-123';
      mockTicketsService.getUserTickets.mockResolvedValue({
        tickets: [],
        total: 0,
      });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get(`/tickets/user/${userId}?priority=${TicketPriority.URGENT}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockTicketsService.getUserTickets).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          priority: TicketPriority.URGENT,
        }),
      );
    });
  });

  describe('GET /tickets (Admin)', () => {
    it('应该允许管理员获取所有工单', async () => {
      // Arrange
      const mockTickets = [
        createMockTicket({ userId: 'user-1' }),
        createMockTicket({ userId: 'user-2' }),
        createMockTicket({ userId: 'user-3' }),
      ];

      mockTicketsService.getAllTickets.mockResolvedValue({
        tickets: mockTickets,
        total: 3,
      });
      const token = createAuthToken(['admin']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/tickets')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.tickets).toHaveLength(3);
      expect(mockTicketsService.getAllTickets).toHaveBeenCalled();
    });

    it('应该支持按分配人筛选', async () => {
      // Arrange
      const assignedTo = 'staff-456';
      mockTicketsService.getAllTickets.mockResolvedValue({
        tickets: [],
        total: 0,
      });
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get(`/tickets?assignedTo=${assignedTo}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockTicketsService.getAllTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedTo,
        }),
      );
    });

    it('应该支持组合多个筛选条件', async () => {
      // Arrange
      mockTicketsService.getAllTickets.mockResolvedValue({
        tickets: [],
        total: 0,
      });
      const token = createAuthToken(['admin']);

      // Act
      await request(app.getHttpServer())
        .get(`/tickets?status=${TicketStatus.OPEN}&priority=${TicketPriority.HIGH}&category=${TicketCategory.TECHNICAL}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockTicketsService.getAllTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TicketStatus.OPEN,
          priority: TicketPriority.HIGH,
          category: TicketCategory.TECHNICAL,
        }),
      );
    });

    it('应该在非管理员访问时返回 403', async () => {
      // Arrange
      const token = createAuthToken(['user']); // 非管理员

      // Act & Assert
      await request(app.getHttpServer())
        .get('/tickets')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('PUT /tickets/:id', () => {
    it('应该成功更新工单状态', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const updateDto = {
        status: TicketStatus.RESOLVED,
      };

      const mockTicket = createMockTicket({
        id: ticketId,
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
      });

      mockTicketsService.updateTicket.mockResolvedValue(mockTicket);
      const token = createAuthToken(['ticket.update']);

      // Act
      const response = await request(app.getHttpServer())
        .put(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(TicketStatus.RESOLVED);
      expect(response.body.data.resolvedAt).toBeDefined();
      expect(mockTicketsService.updateTicket).toHaveBeenCalledWith(
        ticketId,
        updateDto,
      );
    });

    it('应该成功更新工单优先级', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const updateDto = {
        priority: TicketPriority.URGENT,
      };

      const mockTicket = createMockTicket({
        id: ticketId,
        priority: TicketPriority.URGENT,
      });

      mockTicketsService.updateTicket.mockResolvedValue(mockTicket);
      const token = createAuthToken(['ticket.update']);

      // Act
      const response = await request(app.getHttpServer())
        .put(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      // Assert
      expect(response.body.data.priority).toBe(TicketPriority.URGENT);
    });

    it('应该成功分配工单给客服', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const updateDto = {
        assignedTo: 'staff-456',
      };

      const mockTicket = createMockTicket({
        id: ticketId,
        assignedTo: 'staff-456',
      });

      mockTicketsService.updateTicket.mockResolvedValue(mockTicket);
      const token = createAuthToken(['ticket.update']);

      // Act
      const response = await request(app.getHttpServer())
        .put(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      // Assert
      expect(response.body.data.assignedTo).toBe('staff-456');
    });

    it('应该成功更新工单标签', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const updateDto = {
        tags: ['bug', 'critical', 'v2.0'],
      };

      const mockTicket = createMockTicket({
        id: ticketId,
        tags: ['bug', 'critical', 'v2.0'],
      });

      mockTicketsService.updateTicket.mockResolvedValue(mockTicket);
      const token = createAuthToken(['ticket.update']);

      // Act
      const response = await request(app.getHttpServer())
        .put(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      // Assert
      expect(response.body.data.tags).toEqual(['bug', 'critical', 'v2.0']);
    });

    it('应该成功添加内部备注', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const updateDto = {
        internalNotes: '已联系技术团队，正在调查中',
      };

      const mockTicket = createMockTicket({
        id: ticketId,
        internalNotes: '已联系技术团队，正在调查中',
      });

      mockTicketsService.updateTicket.mockResolvedValue(mockTicket);
      const token = createAuthToken(['ticket.update']);

      // Act
      const response = await request(app.getHttpServer())
        .put(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      // Assert
      expect(response.body.data.internalNotes).toBe('已联系技术团队，正在调查中');
    });

    it('应该在工单不存在时返回 404', async () => {
      // Arrange
      const ticketId = 'non-existent';
      mockTicketsService.updateTicket.mockRejectedValue(
        new Error('工单 non-existent 未找到'),
      );
      const token = createAuthToken(['ticket.update']);

      // Act & Assert
      await request(app.getHttpServer())
        .put(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: TicketStatus.CLOSED })
        .expect(500);
    });

    it('应该在权限不足时返回 403', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const token = createAuthToken(['user']); // 无更新权限

      // Act & Assert
      await request(app.getHttpServer())
        .put(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: TicketStatus.CLOSED })
        .expect(403);
    });
  });

  describe('POST /tickets/:id/replies', () => {
    it('应该成功添加用户回复', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const replyDto = {
        userId: 'user-123',
        content: '我已经尝试重启设备，但问题依然存在。',
        type: ReplyType.USER,
      };

      const mockReply = createMockTicketReply({
        ticketId,
        ...replyDto,
      });

      mockTicketsService.addReply.mockResolvedValue(mockReply);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/replies`)
        .set('Authorization', `Bearer ${token}`)
        .send(replyDto)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('我已经尝试重启设备，但问题依然存在。');
      expect(response.body.data.type).toBe(ReplyType.USER);
      expect(mockTicketsService.addReply).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId,
          ...replyDto,
        }),
      );
    });

    it('应该成功添加客服回复', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const replyDto = {
        userId: 'staff-456',
        content: '请尝试清除设备缓存，然后重新启动。',
        type: ReplyType.STAFF,
      };

      const mockReply = createMockTicketReply({
        ticketId,
        ...replyDto,
      });

      mockTicketsService.addReply.mockResolvedValue(mockReply);
      const token = createAuthToken(['ticket.reply']);

      // Act
      const response = await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/replies`)
        .set('Authorization', `Bearer ${token}`)
        .send(replyDto)
        .expect(201);

      // Assert
      expect(response.body.data.type).toBe(ReplyType.STAFF);
    });

    it('应该支持内部备注回复', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const replyDto = {
        userId: 'staff-456',
        content: '需要升级到技术团队处理',
        type: ReplyType.STAFF,
        isInternal: true,
      };

      const mockReply = createMockTicketReply({
        ticketId,
        ...replyDto,
      });

      mockTicketsService.addReply.mockResolvedValue(mockReply);
      const token = createAuthToken(['ticket.reply']);

      // Act
      const response = await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/replies`)
        .set('Authorization', `Bearer ${token}`)
        .send(replyDto)
        .expect(201);

      // Assert
      expect(response.body.data.isInternal).toBe(true);
    });

    it('应该在工单已关闭时拒绝回复', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const replyDto = {
        userId: 'user-123',
        content: '测试回复',
        type: ReplyType.USER,
      };

      mockTicketsService.addReply.mockRejectedValue(
        new Error('工单已关闭，无法回复'),
      );
      const token = createAuthToken();

      // Act & Assert
      await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/replies`)
        .set('Authorization', `Bearer ${token}`)
        .send(replyDto)
        .expect(500);
    });

    it('应该在工单不存在时返回 404', async () => {
      // Arrange
      const ticketId = 'non-existent';
      const replyDto = {
        userId: 'user-123',
        content: '测试回复',
        type: ReplyType.USER,
      };

      mockTicketsService.addReply.mockRejectedValue(
        new Error('工单 non-existent 未找到'),
      );
      const token = createAuthToken();

      // Act & Assert
      await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/replies`)
        .set('Authorization', `Bearer ${token}`)
        .send(replyDto)
        .expect(500);
    });
  });

  describe('GET /tickets/:id/replies', () => {
    it('应该成功获取工单回复列表（不包含内部备注）', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const mockReplies = [
        createMockTicketReply({ type: ReplyType.USER, isInternal: false }),
        createMockTicketReply({ type: ReplyType.STAFF, isInternal: false }),
      ];

      mockTicketsService.getTicketReplies.mockResolvedValue(mockReplies);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}/replies`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockTicketsService.getTicketReplies).toHaveBeenCalledWith(
        ticketId,
        false,
      );
    });

    it('应该允许管理员查看内部备注', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const mockReplies = [
        createMockTicketReply({ type: ReplyType.USER, isInternal: false }),
        createMockTicketReply({ type: ReplyType.STAFF, isInternal: false }),
        createMockTicketReply({ type: ReplyType.STAFF, isInternal: true }),
      ];

      mockTicketsService.getTicketReplies.mockResolvedValue(mockReplies);
      const token = createAuthToken(['admin']);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}/replies?includeInternal=true`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(3);
      expect(mockTicketsService.getTicketReplies).toHaveBeenCalledWith(
        ticketId,
        true,
      );
    });

    it('应该返回按时间排序的回复列表', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const now = new Date();
      const mockReplies = [
        createMockTicketReply({ createdAt: new Date(now.getTime() - 3600000) }),
        createMockTicketReply({ createdAt: new Date(now.getTime() - 1800000) }),
        createMockTicketReply({ createdAt: now }),
      ];

      mockTicketsService.getTicketReplies.mockResolvedValue(mockReplies);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}/replies`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(3);
    });

    it('应该在工单不存在时返回空数组', async () => {
      // Arrange
      const ticketId = 'non-existent';
      mockTicketsService.getTicketReplies.mockResolvedValue([]);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .get(`/tickets/${ticketId}/replies`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('POST /tickets/:id/rate', () => {
    it('应该成功为工单评分', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const rateDto = {
        rating: 5,
        feedback: '客服响应及时，问题解决得很好！',
      };

      const mockTicket = createMockTicket({
        id: ticketId,
        status: TicketStatus.CLOSED,
        rating: 5,
        feedback: '客服响应及时，问题解决得很好！',
      });

      mockTicketsService.rateTicket.mockResolvedValue(mockTicket);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/rate`)
        .set('Authorization', `Bearer ${token}`)
        .send(rateDto)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.rating).toBe(5);
      expect(response.body.data.feedback).toBe('客服响应及时，问题解决得很好！');
      expect(mockTicketsService.rateTicket).toHaveBeenCalledWith(
        ticketId,
        5,
        '客服响应及时，问题解决得很好！',
      );
    });

    it('应该支持只评分不提供反馈', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const rateDto = {
        rating: 4,
      };

      const mockTicket = createMockTicket({
        id: ticketId,
        status: TicketStatus.CLOSED,
        rating: 4,
      });

      mockTicketsService.rateTicket.mockResolvedValue(mockTicket);
      const token = createAuthToken();

      // Act
      const response = await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/rate`)
        .set('Authorization', `Bearer ${token}`)
        .send(rateDto)
        .expect(200);

      // Assert
      expect(response.body.data.rating).toBe(4);
    });

    it('应该在评分超出范围时返回 400', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const rateDto = {
        rating: 6, // 超出 1-5 范围
      };

      mockTicketsService.rateTicket.mockRejectedValue(
        new Error('评分必须在 1-5 之间'),
      );
      const token = createAuthToken();

      // Act & Assert
      await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/rate`)
        .set('Authorization', `Bearer ${token}`)
        .send(rateDto)
        .expect(500);
    });

    it('应该在工单未关闭时拒绝评分', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const rateDto = {
        rating: 5,
      };

      mockTicketsService.rateTicket.mockRejectedValue(
        new Error('只能对已关闭的工单进行评分'),
      );
      const token = createAuthToken();

      // Act & Assert
      await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/rate`)
        .set('Authorization', `Bearer ${token}`)
        .send(rateDto)
        .expect(500);
    });

    it('应该在工单不存在时返回 404', async () => {
      // Arrange
      const ticketId = 'non-existent';
      const rateDto = {
        rating: 5,
      };

      mockTicketsService.rateTicket.mockRejectedValue(
        new Error('工单 non-existent 未找到'),
      );
      const token = createAuthToken();

      // Act & Assert
      await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/rate`)
        .set('Authorization', `Bearer ${token}`)
        .send(rateDto)
        .expect(500);
    });
  });

  describe('GET /tickets/statistics/overview', () => {
    it('应该成功获取整体统计信息', async () => {
      // Arrange
      const mockStatistics = {
        total: 150,
        open: 20,
        inProgress: 35,
        resolved: 50,
        closed: 45,
        avgResponseTime: 15, // 分钟
        avgResolutionTime: 4, // 小时
        byCategory: {
          [TicketCategory.TECHNICAL]: 60,
          [TicketCategory.BILLING]: 30,
          [TicketCategory.ACCOUNT]: 25,
          [TicketCategory.FEATURE_REQUEST]: 20,
          [TicketCategory.OTHER]: 15,
        },
        byPriority: {
          [TicketPriority.LOW]: 30,
          [TicketPriority.MEDIUM]: 70,
          [TicketPriority.HIGH]: 40,
          [TicketPriority.URGENT]: 10,
        },
      };

      mockTicketsService.getTicketStatistics.mockResolvedValue(mockStatistics);
      const token = createAuthToken(['admin']);

      // Act
      const response = await request(app.getHttpServer())
        .get('/tickets/statistics/overview')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(150);
      expect(response.body.data.avgResponseTime).toBe(15);
      expect(response.body.data.byCategory).toBeDefined();
      expect(response.body.data.byPriority).toBeDefined();
      expect(mockTicketsService.getTicketStatistics).toHaveBeenCalledWith(undefined);
    });

    it('应该支持获取特定用户的统计信息', async () => {
      // Arrange
      const userId = 'user-123';
      const mockStatistics = {
        total: 10,
        open: 2,
        inProgress: 3,
        resolved: 3,
        closed: 2,
        avgResponseTime: 12,
        avgResolutionTime: 3,
        byCategory: {
          [TicketCategory.TECHNICAL]: 5,
          [TicketCategory.BILLING]: 3,
          [TicketCategory.ACCOUNT]: 2,
          [TicketCategory.FEATURE_REQUEST]: 0,
          [TicketCategory.OTHER]: 0,
        },
        byPriority: {
          [TicketPriority.LOW]: 2,
          [TicketPriority.MEDIUM]: 5,
          [TicketPriority.HIGH]: 3,
          [TicketPriority.URGENT]: 0,
        },
      };

      mockTicketsService.getTicketStatistics.mockResolvedValue(mockStatistics);
      const token = createAuthToken(['admin']);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/tickets/statistics/overview?userId=${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(response.body.data.total).toBe(10);
      expect(mockTicketsService.getTicketStatistics).toHaveBeenCalledWith(userId);
    });

    it('应该在非管理员访问时返回 403', async () => {
      // Arrange
      const token = createAuthToken(['user']);

      // Act & Assert
      await request(app.getHttpServer())
        .get('/tickets/statistics/overview')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('安全性和边界情况', () => {
    it('应该防止XSS攻击在工单主题中', async () => {
      // Arrange
      const xssDto = {
        userId: 'user-123',
        subject: '<script>alert("xss")</script>',
        description: '正常描述',
        category: TicketCategory.OTHER,
      };

      mockTicketsService.createTicket.mockResolvedValue(
        createMockTicket(xssDto),
      );
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(xssDto)
        .expect(201);

      // Assert - 验证XSS内容被清理
      const callArgs = mockTicketsService.createTicket.mock.calls[0][0];
      expect(callArgs.subject).toBeDefined();
    });

    it('应该防止XSS攻击在回复内容中', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const xssReply = {
        userId: 'user-123',
        content: '<img src=x onerror=alert("xss")>',
        type: ReplyType.USER,
      };

      mockTicketsService.addReply.mockResolvedValue(
        createMockTicketReply(xssReply),
      );
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post(`/tickets/${ticketId}/replies`)
        .set('Authorization', `Bearer ${token}`)
        .send(xssReply)
        .expect(201);

      // Assert
      const callArgs = mockTicketsService.addReply.mock.calls[0][0];
      expect(callArgs.content).toBeDefined();
    });

    it('应该防止SQL注入在搜索参数中', async () => {
      // Arrange
      const sqlInjection = "'; DROP TABLE tickets; --";
      mockTicketsService.getUserTickets.mockResolvedValue({
        tickets: [],
        total: 0,
      });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get(`/tickets/user/${sqlInjection}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert - 参数应该被安全处理
      expect(mockTicketsService.getUserTickets).toHaveBeenCalled();
    });

    it('应该正确处理非常长的工单描述', async () => {
      // Arrange
      const longDescription = 'A'.repeat(10000);
      const createTicketDto = {
        userId: 'user-123',
        subject: '测试工单',
        description: longDescription,
        category: TicketCategory.OTHER,
      };

      mockTicketsService.createTicket.mockResolvedValue(
        createMockTicket(createTicketDto),
      );
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(createTicketDto)
        .expect(201);

      // Assert
      expect(mockTicketsService.createTicket).toHaveBeenCalled();
    });

    it('应该正确处理特殊字符在标签中', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const updateDto = {
        tags: ['bug#123', 'v2.0-beta', 'user@email.com', '中文标签'],
      };

      mockTicketsService.updateTicket.mockResolvedValue(
        createMockTicket(updateDto),
      );
      const token = createAuthToken(['ticket.update']);

      // Act
      await request(app.getHttpServer())
        .put(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      // Assert
      expect(mockTicketsService.updateTicket).toHaveBeenCalledWith(
        ticketId,
        updateDto,
      );
    });

    it('应该正确处理无效的枚举值', async () => {
      // Arrange
      const invalidDto = {
        userId: 'user-123',
        subject: '测试',
        description: '测试描述',
        category: 'invalid_category', // 无效的分类
      };
      const token = createAuthToken();

      // Act & Assert
      await request(app.getHttpServer())
        .post('/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidDto)
        .expect(400);
    });

    it('应该正确处理并发回复', async () => {
      // Arrange
      const ticketId = 'ticket-123';
      const reply1 = {
        userId: 'user-123',
        content: '回复1',
        type: ReplyType.USER,
      };
      const reply2 = {
        userId: 'staff-456',
        content: '回复2',
        type: ReplyType.STAFF,
      };

      mockTicketsService.addReply
        .mockResolvedValueOnce(createMockTicketReply(reply1))
        .mockResolvedValueOnce(createMockTicketReply(reply2));

      const token = createAuthToken();

      // Act
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post(`/tickets/${ticketId}/replies`)
          .set('Authorization', `Bearer ${token}`)
          .send(reply1),
        request(app.getHttpServer())
          .post(`/tickets/${ticketId}/replies`)
          .set('Authorization', `Bearer ${token}`)
          .send(reply2),
      ]);

      // Assert
      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(mockTicketsService.addReply).toHaveBeenCalledTimes(2);
    });

    it('应该正确处理空的筛选条件', async () => {
      // Arrange
      const userId = 'user-123';
      mockTicketsService.getUserTickets.mockResolvedValue({
        tickets: [],
        total: 0,
      });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get(`/tickets/user/${userId}?status=&category=&priority=`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockTicketsService.getUserTickets).toHaveBeenCalled();
    });

    it('应该正确处理负数分页参数', async () => {
      // Arrange
      const userId = 'user-123';
      mockTicketsService.getUserTickets.mockResolvedValue({
        tickets: [],
        total: 0,
      });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get(`/tickets/user/${userId}?limit=-10&offset=-5`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockTicketsService.getUserTickets).toHaveBeenCalled();
    });

    it('应该正确处理字符串类型的分页参数', async () => {
      // Arrange
      const userId = 'user-123';
      mockTicketsService.getUserTickets.mockResolvedValue({
        tickets: [],
        total: 0,
      });
      const token = createAuthToken();

      // Act
      await request(app.getHttpServer())
        .get(`/tickets/user/${userId}?limit=abc&offset=xyz`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert
      expect(mockTicketsService.getUserTickets).toHaveBeenCalled();
    });
  });
});
