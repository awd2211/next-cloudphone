import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesController } from '../templates.controller';
import { TemplatesService } from '../templates.service';
import { NotificationType, NotificationChannel } from '@cloudphone/shared';

describe('TemplatesController', () => {
  let controller: TemplatesController;
  let service: jest.Mocked<TemplatesService>;

  const mockTemplate = {
    id: 'template-123',
    code: 'device.created',
    title: 'Device Created',
    body: 'Your device {{deviceName}} has been created',
    emailTemplate: '<p>Device {{deviceName}} created</p>',
    smsTemplate: 'Device created: {{deviceName}}',
    type: 'system',
    language: 'zh-CN',
    isActive: true,
    createdAt: new Date('2025-11-06'),
    updatedAt: new Date('2025-11-06'),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      toggleActive: jest.fn(),
      findByCode: jest.fn(),
      render: jest.fn(),
      validateTemplate: jest.fn(),
      bulkCreate: jest.fn(),
      clearCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        {
          provide: TemplatesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
    service = module.get(TemplatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new template', async () => {
      const createDto = {
        code: 'device.created',
        name: 'Device Created Template',
        title: 'Device Created',
        body: 'Your device {{deviceName}} has been created',
        type: NotificationType.DEVICE_CREATED,
        channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
        language: 'zh-CN',
      };
      service.create.mockResolvedValue(mockTemplate as any);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('findAll', () => {
    it('should return paginated templates', async () => {
      const query = {
        type: NotificationType.DEVICE_CREATED,
        language: 'zh-CN',
        page: 1,
        limit: 10,
      };
      const paginatedResult = {
        data: [mockTemplate],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(paginatedResult as any);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginatedResult);
    });

    it('should return all templates when no query provided', async () => {
      const paginatedResult = {
        data: [mockTemplate],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(paginatedResult as any);

      const result = await controller.findAll({});

      expect(service.findAll).toHaveBeenCalledWith({});
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a single template by id', async () => {
      service.findOne.mockResolvedValue(mockTemplate as any);

      const result = await controller.findOne('template-123');

      expect(service.findOne).toHaveBeenCalledWith('template-123');
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('update', () => {
    it('should update a template', async () => {
      const updateDto = {
        title: 'Updated Title',
        body: 'Updated body content',
      };
      const updatedTemplate = { ...mockTemplate, ...updateDto };
      service.update.mockResolvedValue(updatedTemplate as any);

      const result = await controller.update('template-123', updateDto);

      expect(service.update).toHaveBeenCalledWith('template-123', updateDto);
      expect(result.title).toBe('Updated Title');
      expect(result.body).toBe('Updated body content');
    });
  });

  describe('remove', () => {
    it('should delete a template', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('template-123');

      expect(service.remove).toHaveBeenCalledWith('template-123');
    });
  });

  describe('toggleActive', () => {
    it('should toggle template active status', async () => {
      const toggledTemplate = { ...mockTemplate, isActive: false };
      service.toggleActive.mockResolvedValue(toggledTemplate as any);

      const result = await controller.toggleActive('template-123');

      expect(service.toggleActive).toHaveBeenCalledWith('template-123');
      expect(result.isActive).toBe(false);
    });

    it('should activate inactive template', async () => {
      const inactiveTemplate = { ...mockTemplate, isActive: false };
      const activatedTemplate = { ...mockTemplate, isActive: true };
      service.toggleActive.mockResolvedValue(activatedTemplate as any);

      const result = await controller.toggleActive('template-123');

      expect(result.isActive).toBe(true);
    });
  });

  describe('findByCode', () => {
    it('should find template by code', async () => {
      service.findByCode.mockResolvedValue(mockTemplate as any);

      const result = await controller.findByCode('device.created', 'zh-CN');

      expect(service.findByCode).toHaveBeenCalledWith('device.created', 'zh-CN');
      expect(result).toEqual(mockTemplate);
    });

    it('should find template by code without language', async () => {
      service.findByCode.mockResolvedValue(mockTemplate as any);

      const result = await controller.findByCode('device.created');

      expect(service.findByCode).toHaveBeenCalledWith('device.created', undefined);
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('render', () => {
    it('should render template with data', async () => {
      const renderDto = {
        templateCode: 'device.created',
        data: { deviceName: 'My Phone' },
        language: 'zh-CN',
      };
      const renderedResult = {
        title: 'Device Created',
        body: 'Your device My Phone has been created',
        emailTemplate: '<p>Device My Phone created</p>',
        smsTemplate: 'Device created: My Phone',
      };
      service.render.mockResolvedValue(renderedResult);

      const result = await controller.render(renderDto);

      expect(service.render).toHaveBeenCalledWith(
        'device.created',
        { deviceName: 'My Phone' },
        'zh-CN'
      );
      expect(result).toEqual(renderedResult);
    });

    it('should render template without language', async () => {
      const renderDto = {
        templateCode: 'device.created',
        data: { deviceName: 'My Phone' },
      };
      const renderedResult = {
        title: 'Device Created',
        body: 'Your device My Phone has been created',
      };
      service.render.mockResolvedValue(renderedResult);

      const result = await controller.render(renderDto);

      expect(service.render).toHaveBeenCalledWith(
        'device.created',
        { deviceName: 'My Phone' },
        undefined
      );
      expect(result).toEqual(renderedResult);
    });
  });

  describe('validate', () => {
    it('should validate valid template', async () => {
      const template = 'Hello {{userName}}, welcome!';
      service.validateTemplate.mockResolvedValue({ valid: true });

      const result = await controller.validate(template);

      expect(service.validateTemplate).toHaveBeenCalledWith(template);
      expect(result.valid).toBe(true);
    });

    it('should return validation error for dangerous template', async () => {
      const dangerousTemplate = '{{constructor}}';
      service.validateTemplate.mockResolvedValue({
        valid: false,
        error: 'Template contains dangerous pattern',
      });

      const result = await controller.validate(dangerousTemplate);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple templates', async () => {
      const templates = [
        {
          code: 'device.created',
          name: 'Device Created Template',
          title: 'Device Created',
          body: 'Device created',
          type: NotificationType.DEVICE_CREATED,
          channels: [NotificationChannel.WEBSOCKET],
          language: 'zh-CN',
        },
        {
          code: 'device.started',
          name: 'Device Started Template',
          title: 'Device Started',
          body: 'Device started',
          type: NotificationType.DEVICE_STARTED,
          channels: [NotificationChannel.WEBSOCKET],
          language: 'zh-CN',
        },
      ];
      const result = {
        successful: 2,
        failed: 0,
        errors: [],
        templates: [mockTemplate, mockTemplate],
      };
      service.bulkCreate.mockResolvedValue(result as any);

      const response = await controller.bulkCreate(templates);

      expect(service.bulkCreate).toHaveBeenCalledWith(templates);
      expect(response.successful).toBe(2);
      expect(response.failed).toBe(0);
    });

    it('should handle partial failures in bulk create', async () => {
      const templates = [
        {
          code: 'device.created',
          name: 'Device Created Template',
          title: 'Device Created',
          body: 'Device created',
          type: NotificationType.DEVICE_CREATED,
          channels: [NotificationChannel.WEBSOCKET],
          language: 'zh-CN',
        },
        {
          code: 'device.created', // Duplicate code
          name: 'Device Created Duplicate',
          title: 'Device Created Duplicate',
          body: 'Device created',
          type: NotificationType.DEVICE_CREATED,
          channels: [NotificationChannel.WEBSOCKET],
          language: 'zh-CN',
        },
      ];
      const result = {
        successful: 1,
        failed: 1,
        errors: ['Failed to create template device.created: Template with code device.created already exists'],
        templates: [mockTemplate],
      };
      service.bulkCreate.mockResolvedValue(result as any);

      const response = await controller.bulkCreate(templates);

      expect(response.successful).toBe(1);
      expect(response.failed).toBe(1);
      expect(response.errors).toHaveLength(1);
    });
  });

  describe('clearCache', () => {
    it('should clear template cache', async () => {
      service.clearCache.mockReturnValue(undefined);

      await controller.clearCache();

      expect(service.clearCache).toHaveBeenCalled();
    });
  });
});
