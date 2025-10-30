import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email.service';

// Mock nodemailer
jest.mock('nodemailer');
import * as nodemailer from 'nodemailer';

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  const mockTransporter = {
    sendMail: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup default SMTP config
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, string | number> = {
        SMTP_HOST: 'smtp.test.com',
        SMTP_PORT: 587,
        SMTP_SECURE: 'false',
        SMTP_USER: 'test@test.com',
        SMTP_PASS: 'password',
        SMTP_FROM: 'Cloud Phone <noreply@cloudphone.com>',
      };
      return config[key] !== undefined ? config[key] : defaultValue;
    });

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize transporter with SMTP config', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@test.com',
          pass: 'password',
        },
      });
    });

    it('should disable email service when SMTP_HOST is not configured', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const newService = new EmailService(mockConfigService as any);

      expect(newService).toBeDefined();
    });
  });

  describe('sendEmail', () => {
    it('should successfully send email', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        accepted: ['test@example.com'],
      });

      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test content',
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Subject',
          text: 'Test content',
          from: 'Cloud Phone <noreply@cloudphone.com>',
        }),
      );
    });

    it('should send email with HTML content', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<h1>Hello</h1>',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<h1>Hello</h1>',
        }),
      );
    });

    it('should render template when provided', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        template: '<h1>Hello {{name}}</h1>',
        context: { name: 'World' },
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<h1>Hello World</h1>',
        }),
      );
    });

    it('should return false when email sending fails', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test',
      });

      expect(result).toBe(false);
    });

    it('should handle template rendering errors gracefully', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      // Invalid Handlebars syntax
      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        template: '{{#if}}invalid{{/if}}',
        context: {},
      });

      // Should still attempt to send (with unrendered template)
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });
  });

  describe('sendDeviceCreatedEmail', () => {
    it('should send device created notification', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      const result = await service.sendDeviceCreatedEmail(
        'user@test.com',
        'My Device',
      );

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: '设备创建成功通知',
          html: expect.stringContaining('My Device'),
        }),
      );
    });

    it('should include device name in email content', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendDeviceCreatedEmail('user@test.com', 'Test Device');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Test Device');
      expect(callArgs.html).toContain('设备创建成功');
    });
  });

  describe('sendLowBalanceAlert', () => {
    it('should send low balance alert', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      const result = await service.sendLowBalanceAlert('user@test.com', 50.5);

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: '余额不足提醒',
          html: expect.stringContaining('50.50'),
        }),
      );
    });

    it('should format balance amount correctly', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendLowBalanceAlert('user@test.com', 123.456);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('123.46');
    });

    it('should include recharge button in email', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendLowBalanceAlert('user@test.com', 10);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('立即充值');
      expect(callArgs.html).toContain('余额不足');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      const result = await service.sendWelcomeEmail(
        'newuser@test.com',
        'John Doe',
      );

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newuser@test.com',
          subject: '欢迎加入云手机平台',
          html: expect.stringContaining('John Doe'),
        }),
      );
    });

    it('should include username in welcome message', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendWelcomeEmail('user@test.com', 'TestUser');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('TestUser');
      expect(callArgs.html).toContain('欢迎');
    });

    it('should include platform features in email', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendWelcomeEmail('user@test.com', 'User');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('创建和管理云手机设备');
      expect(callArgs.html).toContain('安装和运行应用程序');
      expect(callArgs.html).toContain('查看使用统计和账单');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      const result = await service.sendPasswordResetEmail(
        'user@test.com',
        'reset-token-123',
        '2024-12-31 23:59:59',
      );

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: '密码重置请求',
          html: expect.stringContaining('reset-token-123'),
        }),
      );
    });

    it('should include reset link with token', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(
        'user@test.com',
        'token123',
        '2024-12-31',
      );

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('token123');
      expect(callArgs.html).toContain('reset-password');
    });

    it('should include expiration time', async () => {
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(
        'user@test.com',
        'token',
        '2024-12-31 23:59:59',
      );

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('2024-12-31 23:59:59');
    });
  });
});
