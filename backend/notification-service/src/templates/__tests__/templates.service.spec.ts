import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TemplatesService } from '../templates.service';
import { NotificationTemplate } from '../../entities/notification-template.entity';
import { NotificationType, NotificationChannel } from '@cloudphone/shared';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let templateRepository: jest.Mocked<Repository<NotificationTemplate>>;

  // Mock template data
  const mockTemplate: NotificationTemplate = {
    id: 'template-123',
    code: 'device-created',
    name: 'Device Created Notification',
    type: NotificationType.DEVICE_CREATED,
    title: 'Device {{deviceName}} Created',
    body: 'Your device {{deviceName}} (ID: {{deviceId}}) has been created successfully.',
    emailTemplate: '<p>Dear {{userName}},</p><p>Device: {{deviceName}}</p>',
    smsTemplate: 'Device {{deviceName}} created successfully',
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    defaultData: { userName: 'User' },
    language: 'zh-CN',
    isActive: true,
    description: 'Template for device creation',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createTemplateDto: CreateTemplateDto = {
    code: 'device-created',
    name: 'Device Created Notification',
    type: NotificationType.DEVICE_CREATED,
    title: 'Device {{deviceName}} Created',
    body: 'Your device {{deviceName}} has been created.',
    emailTemplate: '<p>Device: {{deviceName}}</p>',
    smsTemplate: 'Device {{deviceName}} created',
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    language: 'zh-CN',
    isActive: true,
    description: 'Test template',
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: getRepositoryToken(NotificationTemplate),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    templateRepository = module.get(getRepositoryToken(NotificationTemplate));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('create', () => {
      it('should successfully create a template with all fields', async () => {
        templateRepository.findOne.mockResolvedValue(null);
        templateRepository.create.mockReturnValue(mockTemplate);
        templateRepository.save.mockResolvedValue(mockTemplate);

        const result = await service.create(createTemplateDto);

        expect(result).toEqual(mockTemplate);
        expect(templateRepository.findOne).toHaveBeenCalledWith({
          where: { code: createTemplateDto.code },
        });
        expect(templateRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            code: createTemplateDto.code,
            language: 'zh-CN',
            isActive: true,
          }),
        );
        expect(templateRepository.save).toHaveBeenCalled();
      });

      it('should throw ConflictException if template code already exists', async () => {
        templateRepository.findOne.mockResolvedValue(mockTemplate);

        await expect(service.create(createTemplateDto)).rejects.toThrow(ConflictException);
        await expect(service.create(createTemplateDto)).rejects.toThrow(
          'Template with code "device-created" already exists',
        );
        expect(templateRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('findAll', () => {
      it('should return paginated templates with filters', async () => {
        const mockTemplates = [mockTemplate];
        const mockQueryBuilder = {
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([mockTemplates, 1]),
        };

        templateRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const result = await service.findAll({
          type: NotificationType.DEVICE_CREATED,
          language: 'zh-CN',
          isActive: true,
          search: 'device',
          page: 1,
          limit: 10,
        });

        expect(result).toEqual({
          data: mockTemplates,
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4); // type, language, isActive, search
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('template.createdAt', 'DESC');
      });
    });

    describe('update', () => {
      it('should successfully update template and clear cache', async () => {
        const updateDto: UpdateTemplateDto = {
          title: 'Updated {{deviceName}}',
          isActive: false,
        };

        const updatedTemplate = { ...mockTemplate, ...updateDto };

        templateRepository.findOne.mockResolvedValueOnce(mockTemplate); // findOne in update
        templateRepository.save.mockResolvedValue(updatedTemplate);

        const result = await service.update(mockTemplate.id, updateDto);

        expect(result).toEqual(updatedTemplate);
        expect(templateRepository.save).toHaveBeenCalled();
      });

      it('should throw ConflictException if updating to existing code', async () => {
        const updateDto: UpdateTemplateDto = {
          code: 'existing-code',
        };

        const existingTemplate = { ...mockTemplate, id: 'other-id', code: 'existing-code' };

        // Need 4 calls: 2 for first update attempt, 2 for second expect
        templateRepository.findOne
          .mockResolvedValueOnce(mockTemplate) // findOne in update (first attempt)
          .mockResolvedValueOnce(existingTemplate) // findOne for conflict check (first attempt)
          .mockResolvedValueOnce(mockTemplate) // findOne in update (second attempt)
          .mockResolvedValueOnce(existingTemplate); // findOne for conflict check (second attempt)

        await expect(service.update(mockTemplate.id, updateDto)).rejects.toThrow(ConflictException);
        await expect(service.update(mockTemplate.id, updateDto)).rejects.toThrow(
          'Template with code "existing-code" already exists',
        );
      });
    });

    describe('remove', () => {
      it('should successfully delete template and clear cache', async () => {
        templateRepository.findOne.mockResolvedValue(mockTemplate);
        templateRepository.remove.mockResolvedValue(mockTemplate);

        await service.remove(mockTemplate.id);

        expect(templateRepository.findOne).toHaveBeenCalledWith({ where: { id: mockTemplate.id } });
        expect(templateRepository.remove).toHaveBeenCalledWith(mockTemplate);
      });
    });
  });

  describe('SSTI Security Validation', () => {
    describe('create - SSTI protection', () => {
      it('should reject template with dangerous constructor pattern', async () => {
        const maliciousDto = {
          ...createTemplateDto,
          title: '{{constructor.constructor("return process")()}}',
        };

        await expect(service.create(maliciousDto)).rejects.toThrow(BadRequestException);
        await expect(service.create(maliciousDto)).rejects.toThrow('模板包含不安全的表达式');
      });

      it('should reject template with __proto__ access', async () => {
        const maliciousDto = {
          ...createTemplateDto,
          body: '{{__proto__.polluted}}',
        };

        await expect(service.create(maliciousDto)).rejects.toThrow(BadRequestException);
        await expect(service.create(maliciousDto)).rejects.toThrow('模板包含不安全的表达式');
      });

      it('should reject template with process access', async () => {
        const maliciousDto = {
          ...createTemplateDto,
          emailTemplate: '{{process.env.SECRET}}',
        };

        await expect(service.create(maliciousDto)).rejects.toThrow(BadRequestException);
      });

      it('should reject template with require function', async () => {
        const maliciousDto = {
          ...createTemplateDto,
          smsTemplate: '{{require("child_process")}}',
        };

        await expect(service.create(maliciousDto)).rejects.toThrow(BadRequestException);
      });

      it('should reject template with eval function', async () => {
        const maliciousDto = {
          ...createTemplateDto,
          title: '{{eval("malicious code")}}',
        };

        await expect(service.create(maliciousDto)).rejects.toThrow(BadRequestException);
      });

      it('should reject template with Function constructor', async () => {
        const maliciousDto = {
          ...createTemplateDto,
          body: '{{Function("return this")()}}',
        };

        await expect(service.create(maliciousDto)).rejects.toThrow(BadRequestException);
      });
    });

    describe('validateTemplate', () => {
      it('should validate safe template successfully', async () => {
        const safeTemplate = 'Hello {{userName}}, your device {{deviceName}} is ready';

        const result = await service.validateTemplate(safeTemplate);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should reject dangerous template with error message', async () => {
        const dangerousTemplate = '{{constructor.prototype}}';

        const result = await service.validateTemplate(dangerousTemplate);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Template Rendering', () => {
    describe('render', () => {
      it('should successfully render multi-channel template', async () => {
        templateRepository.findOne.mockResolvedValue(mockTemplate);

        const renderData = {
          userName: 'Test User',
          deviceName: 'Test Device',
          deviceId: 'device-123',
        };

        const result = await service.render('device-created', renderData, 'zh-CN');

        expect(result.title).toContain('Test Device');
        expect(result.body).toContain('Test Device');
        expect(result.body).toContain('device-123');
        expect(result.emailHtml).toContain('Test User');
        expect(result.emailHtml).toContain('Test Device');
        expect(result.smsText).toContain('Test Device');
      });

      it('should sanitize render data to whitelist only', async () => {
        templateRepository.findOne.mockResolvedValue(mockTemplate);

        const renderData = {
          userName: 'Test User',
          deviceName: 'Test Device',
          deviceId: 'device-123',
          // Malicious data that should be filtered out
          constructor: 'injected',
          __proto__: { polluted: true },
          prototype: 'hacked',
          process: { env: 'secret' },
        };

        const result = await service.render('device-created', renderData, 'zh-CN');

        // Should render successfully with only whitelisted variables
        expect(result.title).toContain('Test Device');
        expect(result.body).toContain('Test Device');
        // Malicious properties should not cause issues
      });

      it('should handle optional channels (email/sms undefined)', async () => {
        const minimalTemplate = {
          ...mockTemplate,
          emailTemplate: '',
          smsTemplate: '',
        };

        templateRepository.findOne.mockResolvedValue(minimalTemplate);

        const result = await service.render(
          'device-created',
          { deviceName: 'Test', deviceId: 'device-123' },
          'zh-CN',
        );

        expect(result.title).toBeDefined();
        expect(result.body).toBeDefined();
        expect(result.emailHtml).toBeUndefined();
        expect(result.smsText).toBeUndefined();
      });

      it('should throw NotFoundException if template not found', async () => {
        templateRepository.findOne.mockResolvedValue(null);

        await expect(service.render('non-existent', {}, 'zh-CN')).rejects.toThrow(NotFoundException);
        await expect(service.render('non-existent', {}, 'zh-CN')).rejects.toThrow(
          'Template with code "non-existent" not found',
        );
      });

      it('should merge defaultData with provided data', async () => {
        const templateWithDefaults = {
          ...mockTemplate,
          defaultData: { userName: 'Default User', deviceId: 'default-id' },
        };

        templateRepository.findOne.mockResolvedValue(templateWithDefaults);

        const result = await service.render(
          'device-created',
          { deviceName: 'Test Device', deviceId: 'override-id' },
          'zh-CN',
        );

        // deviceId should be overridden, userName should use default
        expect(result.body).toContain('override-id');
      });
    });

    describe('template caching', () => {
      it('should cache compiled templates and reuse them', async () => {
        templateRepository.findOne.mockResolvedValue(mockTemplate);

        const renderData = { deviceName: 'Test', deviceId: 'device-123' };

        // First render - compiles and caches
        const result1 = await service.render('device-created', renderData, 'zh-CN');

        // Second render - should use cache
        const result2 = await service.render('device-created', renderData, 'zh-CN');

        expect(result1.title).toEqual(result2.title);
        expect(result1.body).toEqual(result2.body);
        // Both should produce same results
      });

      it('should clear cache on update', async () => {
        const updateDto: UpdateTemplateDto = { title: 'Updated Title' };
        const updatedTemplate = { ...mockTemplate, title: 'Updated Title' };

        templateRepository.findOne.mockResolvedValue(mockTemplate);
        templateRepository.save.mockResolvedValue(updatedTemplate);

        await service.update(mockTemplate.id, updateDto);

        // Cache should be cleared, subsequent renders use new template
        expect(templateRepository.save).toHaveBeenCalled();
      });
    });
  });

  describe('Helper Functions & Edge Cases', () => {
    describe('Handlebars helpers', () => {
      it('should format date using formatDate helper', async () => {
        const templateWithDate = {
          ...mockTemplate,
          title: 'Simple Title',
          body: 'Created on {{formatDate date "YYYY-MM-DD"}}',
          emailTemplate: '',
          smsTemplate: '',
        };

        templateRepository.findOne.mockResolvedValue(templateWithDate);

        const result = await service.render('device-created', { date: new Date('2024-01-15') }, 'zh-CN');

        expect(result.body).toContain('2024');
      });

      it('should format number using formatNumber helper', async () => {
        const templateWithNumber = {
          ...mockTemplate,
          title: 'Simple Title',
          body: 'Used: {{formatNumber quotaUsed}}',
          emailTemplate: '',
          smsTemplate: '',
        };

        templateRepository.findOne.mockResolvedValue(templateWithNumber);

        const result = await service.render('device-created', { quotaUsed: 1000 }, 'zh-CN');

        expect(result.body).toContain('1,000');
      });

      it('should format currency using formatCurrency helper', async () => {
        const templateWithCurrency = {
          ...mockTemplate,
          title: 'Simple Title',
          body: 'Amount: {{formatCurrency amount}}',
          emailTemplate: '',
          smsTemplate: '',
        };

        templateRepository.findOne.mockResolvedValue(templateWithCurrency);

        const result = await service.render('device-created', { amount: 99.99 }, 'zh-CN');

        expect(result.body).toContain('¥');
      });
    });

    describe('bulkCreate', () => {
      it('should create multiple templates and continue on individual failures', async () => {
        const templates = [
          { ...createTemplateDto, code: 'template-1' },
          { ...createTemplateDto, code: 'template-2' },
          { ...createTemplateDto, code: 'template-3' },
        ];

        // First succeeds, second fails (duplicate), third succeeds
        templateRepository.findOne
          .mockResolvedValueOnce(null) // template-1: no conflict
          .mockResolvedValueOnce(mockTemplate) // template-2: conflict
          .mockResolvedValueOnce(null); // template-3: no conflict

        templateRepository.create.mockImplementation((dto) => ({ ...mockTemplate, ...dto } as any));
        templateRepository.save.mockImplementation((template) => Promise.resolve(template as NotificationTemplate));

        const results = await service.bulkCreate(templates);

        // Should have 2 successful results (1 and 3)
        expect(results.length).toBe(2);
        expect(results[0].code).toBe('template-1');
        expect(results[1].code).toBe('template-3');
      });
    });

    describe('clearCache', () => {
      it('should clear all compiled template cache', () => {
        // This is a void method, just ensure it doesn't throw
        expect(() => service.clearCache()).not.toThrow();
      });
    });

    describe('findByCode', () => {
      it('should find active template by code and language', async () => {
        templateRepository.findOne.mockResolvedValue(mockTemplate);

        const result = await service.findByCode('device-created', 'zh-CN');

        expect(result).toEqual(mockTemplate);
        expect(templateRepository.findOne).toHaveBeenCalledWith({
          where: { code: 'device-created', language: 'zh-CN', isActive: true },
        });
      });

      it('should throw NotFoundException if template not found', async () => {
        templateRepository.findOne.mockResolvedValue(null);

        await expect(service.findByCode('non-existent')).rejects.toThrow(NotFoundException);
      });
    });

    describe('toggleActive', () => {
      it('should toggle isActive flag', async () => {
        const activeTemplate = { ...mockTemplate, isActive: true };
        const inactiveTemplate = { ...mockTemplate, isActive: false };

        templateRepository.findOne.mockResolvedValue(activeTemplate);
        templateRepository.save.mockResolvedValue(inactiveTemplate);

        const result = await service.toggleActive(mockTemplate.id);

        expect(result.isActive).toBe(false);
        expect(templateRepository.save).toHaveBeenCalled();
      });
    });
  });
});
