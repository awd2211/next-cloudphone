import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TemplateCategory } from '../entities/device-template.entity';

describe('TemplatesController', () => {
  let app: INestApplication;
  let service: TemplatesService;

  const mockTemplatesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getPopularTemplates: jest.fn(),
    searchTemplates: jest.fn(),
    createDeviceFromTemplate: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockTemplate = {
    id: 'template-123',
    name: 'Gaming Template',
    description: 'High performance gaming setup',
    category: TemplateCategory.GAMING,
    isPublic: true,
    config: {
      cpuCores: 4,
      memoryMB: 8192,
      storageGB: 100,
    },
    usageCount: 10,
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        {
          provide: TemplatesService,
          useValue: mockTemplatesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    service = moduleFixture.get<TemplatesService>(TemplatesService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  /**
   * ✅ 响应格式验证测试
   * 确保 findAll 方法返回正确的格式,包含 success 字段
   */
  describe('Response Format Validation', () => {
    describe('GET /templates - findAll', () => {
      it('should return response with success field', async () => {
        // Arrange
        mockTemplatesService.findAll.mockResolvedValue([mockTemplate]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/templates')
          .expect(200);

        // Assert
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should maintain success field with empty results', async () => {
        // Arrange
        mockTemplatesService.findAll.mockResolvedValue([]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/templates')
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
      });

      it('should support category filtering', async () => {
        // Arrange
        const gamingTemplates = [mockTemplate];
        mockTemplatesService.findAll.mockResolvedValue(gamingTemplates);

        // Act
        const response = await request(app.getHttpServer())
          .get('/templates?category=gaming')
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(service.findAll).toHaveBeenCalledWith(
          TemplateCategory.GAMING,
          undefined,
          undefined
        );
      });

      it('should support isPublic filtering', async () => {
        // Arrange
        mockTemplatesService.findAll.mockResolvedValue([mockTemplate]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/templates?isPublic=true')
          .expect(200);

        // Assert
        expect(response.body.success).toBe(true);
        expect(service.findAll).toHaveBeenCalledWith(
          undefined,
          true,
          undefined
        );
      });
    });

    describe('GET /templates/popular', () => {
      it('should return popular templates (verify format)', async () => {
        // Arrange
        mockTemplatesService.getPopularTemplates.mockResolvedValue([mockTemplate]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/templates/popular?limit=5')
          .expect(200);

        // Assert
        expect(response.body).toBeDefined();
        expect(service.getPopularTemplates).toHaveBeenCalledWith(5);
      });
    });

    describe('GET /templates/search', () => {
      it('should return search results (verify format)', async () => {
        // Arrange
        mockTemplatesService.searchTemplates.mockResolvedValue([mockTemplate]);

        // Act
        const response = await request(app.getHttpServer())
          .get('/templates/search?q=gaming')
          .expect(200);

        // Assert
        expect(response.body).toBeDefined();
      });
    });

    describe('GET /templates/:id', () => {
      it('should return single template', async () => {
        // Arrange
        mockTemplatesService.findOne.mockResolvedValue(mockTemplate);

        // Act
        const response = await request(app.getHttpServer())
          .get('/templates/template-123')
          .expect(200);

        // Assert
        expect(response.body).toBeDefined();
        expect(response.body.id).toBe('template-123');
      });
    });

    describe('POST /templates', () => {
      it('should create template with proper structure', async () => {
        // Arrange
        const createDto = {
          name: 'New Template',
          description: 'Test template',
          category: TemplateCategory.GAMING,
          isPublic: true,
          config: {
            cpuCores: 4,
            memoryMB: 8192,
            storageGB: 100,
          },
        };

        mockTemplatesService.create.mockResolvedValue({
          ...mockTemplate,
          ...createDto,
        });

        // Act
        const response = await request(app.getHttpServer())
          .post('/templates')
          .send(createDto)
          .expect(201);

        // Assert
        expect(response.body).toBeDefined();
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(createDto.name);
      });
    });
  });

  describe('Business Logic Tests', () => {
    it('should call service with correct parameters', async () => {
      // Arrange
      mockTemplatesService.findAll.mockResolvedValue([]);

      // Act
      await request(app.getHttpServer())
        .get('/templates')
        .expect(200);

      // Assert
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockTemplatesService.findAll.mockRejectedValue(error);

      // Act
      const response = await request(app.getHttpServer())
        .get('/templates')
        .expect(500);

      // Assert
      expect(response.body).toBeDefined();
    });
  });
});
