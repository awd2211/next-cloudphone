import { Test, TestingModule } from '@nestjs/testing';
import { ProxyAlertController } from './proxy-alert.controller';
import { ProxyAlertService } from '../services/proxy-alert.service';
import { ApiResponse } from '../dto';

describe('ProxyAlertController', () => {
  let controller: ProxyAlertController;
  let alertService: any;

  const mockAlertService = {
    createChannel: jest.fn(),
    getUserChannels: jest.fn(),
    getChannel: jest.fn(),
    updateChannel: jest.fn(),
    deleteChannel: jest.fn(),
    testChannel: jest.fn(),
    createRule: jest.fn(),
    getActiveRules: jest.fn(),
    getUserRules: jest.fn(),
    getRule: jest.fn(),
    updateRule: jest.fn(),
    deleteRule: jest.fn(),
    getAlertHistory: jest.fn(),
    acknowledgeAlert: jest.fn(),
    resolveAlert: jest.fn(),
    getAlertStatistics: jest.fn(),
  };

  const mockUser = {
    sub: 'user-123',
  };

  const mockRequest = {
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyAlertController],
      providers: [
        {
          provide: ProxyAlertService,
          useValue: mockAlertService,
        },
      ],
    }).compile();

    controller = module.get<ProxyAlertController>(ProxyAlertController);
    alertService = module.get(ProxyAlertService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have alertService injected', () => {
      expect(alertService).toBeDefined();
      expect(alertService).toBe(mockAlertService);
    });
  });

  // ==================== 告警通道管理测试 ====================

  describe('createChannel', () => {
    it('should create alert channel successfully', async () => {
      const createDto: any = {
        name: 'Email Channel',
        type: 'email',
        config: {
          recipients: ['admin@example.com'],
        },
      };

      const mockChannel = {
        id: 'channel-123',
        ...createDto,
        userId: 'user-123',
      };

      mockAlertService.createChannel.mockResolvedValue(mockChannel);

      const result = await controller.createChannel(mockRequest, createDto);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('channel-123');
      expect(result.message).toBe('Alert channel created');
      expect(mockAlertService.createChannel).toHaveBeenCalledWith({
        ...createDto,
        userId: 'user-123',
      });
    });

    it('should create webhook channel', async () => {
      const createDto: any = {
        name: 'Webhook Channel',
        type: 'webhook',
        config: {
          url: 'https://example.com/webhook',
        },
      };

      const mockChannel = {
        id: 'channel-456',
        ...createDto,
        userId: 'user-123',
      };

      mockAlertService.createChannel.mockResolvedValue(mockChannel);

      const result = await controller.createChannel(mockRequest, createDto);

      expect(result.data.type).toBe('webhook');
      expect(result.data.config.url).toBe('https://example.com/webhook');
    });
  });

  describe('getChannels', () => {
    it('should return user alert channels', async () => {
      const mockChannels = [
        { id: 'channel-1', name: 'Email', type: 'email' },
        { id: 'channel-2', name: 'SMS', type: 'sms' },
      ];

      mockAlertService.getUserChannels.mockResolvedValue(mockChannels);

      const result = await controller.getChannels(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockAlertService.getUserChannels).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array if no channels', async () => {
      mockAlertService.getUserChannels.mockResolvedValue([]);

      const result = await controller.getChannels(mockRequest);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('getChannel', () => {
    it('should return channel by ID', async () => {
      const mockChannel = {
        id: 'channel-123',
        name: 'Email Channel',
        type: 'email',
      };

      mockAlertService.getChannel.mockResolvedValue(mockChannel);

      const result = await controller.getChannel('channel-123');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('channel-123');
      expect(mockAlertService.getChannel).toHaveBeenCalledWith('channel-123');
    });
  });

  describe('updateChannel', () => {
    it('should update alert channel', async () => {
      const updateDto: any = {
        name: 'Updated Email Channel',
        config: {
          recipients: ['admin@example.com', 'alerts@example.com'],
        },
      };

      const mockUpdatedChannel = {
        id: 'channel-123',
        ...updateDto,
      };

      mockAlertService.updateChannel.mockResolvedValue(mockUpdatedChannel);

      const result = await controller.updateChannel('channel-123', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Email Channel');
      expect(result.message).toBe('Channel updated');
      expect(mockAlertService.updateChannel).toHaveBeenCalledWith('channel-123', updateDto);
    });
  });

  describe('deleteChannel', () => {
    it('should delete alert channel', async () => {
      mockAlertService.deleteChannel.mockResolvedValue(undefined);

      await controller.deleteChannel('channel-123');

      expect(mockAlertService.deleteChannel).toHaveBeenCalledWith('channel-123');
    });
  });

  describe('testChannel', () => {
    it('should test alert channel successfully', async () => {
      const testDto: any = {
        testMessage: 'Test alert message',
      };

      const mockTestResult = {
        success: true,
        message: 'Test notification sent successfully',
      };

      mockAlertService.testChannel.mockResolvedValue(mockTestResult);

      const result = await controller.testChannel('channel-123', testDto);

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
      expect(mockAlertService.testChannel).toHaveBeenCalledWith('channel-123', 'Test alert message');
    });

    it('should handle test failure', async () => {
      const testDto: any = {
        testMessage: 'Test message',
      };

      const mockTestResult = {
        success: false,
        message: 'Failed to send notification',
      };

      mockAlertService.testChannel.mockResolvedValue(mockTestResult);

      const result = await controller.testChannel('channel-123', testDto);

      expect(result.data.success).toBe(false);
    });
  });

  // ==================== 告警规则管理测试 ====================

  describe('createRule', () => {
    it('should create alert rule successfully', async () => {
      const createDto: any = {
        name: 'High Error Rate',
        condition: {
          metric: 'error_rate',
          operator: '>',
          threshold: 5,
        },
        channelIds: ['channel-1', 'channel-2'],
      };

      const mockRule = {
        id: 'rule-123',
        ...createDto,
        userId: 'user-123',
      };

      mockAlertService.createRule.mockResolvedValue(mockRule);

      const result = await controller.createRule(mockRequest, createDto);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('rule-123');
      expect(result.message).toBe('Alert rule created');
      expect(mockAlertService.createRule).toHaveBeenCalledWith({
        ...createDto,
        userId: 'user-123',
      });
    });
  });

  describe('getRules', () => {
    it('should return all user rules', async () => {
      const mockRules = [
        { id: 'rule-1', name: 'High CPU', active: true },
        { id: 'rule-2', name: 'Low Memory', active: false },
      ];

      mockAlertService.getUserRules.mockResolvedValue(mockRules);

      const result = await controller.getRules(mockRequest, undefined);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockAlertService.getUserRules).toHaveBeenCalledWith('user-123');
    });

    it('should return only active rules when activeOnly is true', async () => {
      const mockActiveRules = [
        { id: 'rule-1', name: 'High CPU', active: true },
      ];

      mockAlertService.getActiveRules.mockResolvedValue(mockActiveRules);

      const result = await controller.getRules(mockRequest, 'true');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].active).toBe(true);
      expect(mockAlertService.getActiveRules).toHaveBeenCalledWith('user-123');
    });

    it('should return all rules when activeOnly is false', async () => {
      const mockAllRules = [
        { id: 'rule-1', name: 'High CPU', active: true },
        { id: 'rule-2', name: 'Low Memory', active: false },
      ];

      mockAlertService.getUserRules.mockResolvedValue(mockAllRules);

      const result = await controller.getRules(mockRequest, 'false');

      expect(result.data).toHaveLength(2);
      expect(mockAlertService.getUserRules).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getRule', () => {
    it('should return rule by ID', async () => {
      const mockRule = {
        id: 'rule-123',
        name: 'High Error Rate',
        condition: { metric: 'error_rate', threshold: 5 },
      };

      mockAlertService.getRule.mockResolvedValue(mockRule);

      const result = await controller.getRule('rule-123');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('rule-123');
      expect(mockAlertService.getRule).toHaveBeenCalledWith('rule-123');
    });
  });

  describe('updateRule', () => {
    it('should update alert rule', async () => {
      const updateDto: any = {
        name: 'Updated Rule',
        condition: { metric: 'error_rate', threshold: 10 },
      };

      const mockUpdatedRule = {
        id: 'rule-123',
        ...updateDto,
      };

      mockAlertService.updateRule.mockResolvedValue(mockUpdatedRule);

      const result = await controller.updateRule('rule-123', updateDto);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Rule');
      expect(result.message).toBe('Rule updated');
      expect(mockAlertService.updateRule).toHaveBeenCalledWith('rule-123', updateDto);
    });
  });

  describe('deleteRule', () => {
    it('should delete alert rule', async () => {
      mockAlertService.deleteRule.mockResolvedValue(undefined);

      await controller.deleteRule('rule-123');

      expect(mockAlertService.deleteRule).toHaveBeenCalledWith('rule-123');
    });
  });

  // ==================== 告警历史管理测试 ====================

  describe('getAlertHistory', () => {
    it('should return alert history with default parameters', async () => {
      const mockAlerts = [
        { id: 'alert-1', message: 'High CPU usage', status: 'active' },
        { id: 'alert-2', message: 'Low memory', status: 'resolved' },
      ];

      mockAlertService.getAlertHistory.mockResolvedValue(mockAlerts);

      const result = await controller.getAlertHistory(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockAlertService.getAlertHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          limit: 100,
        }),
      );
    });

    it('should filter alerts by deviceId', async () => {
      const mockAlerts = [
        { id: 'alert-1', deviceId: 'device-123', status: 'active' },
      ];

      mockAlertService.getAlertHistory.mockResolvedValue(mockAlerts);

      const result = await controller.getAlertHistory(mockRequest, 'device-123');

      expect(result.data[0].deviceId).toBe('device-123');
      expect(mockAlertService.getAlertHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device-123',
        }),
      );
    });

    it('should filter alerts by ruleId', async () => {
      const mockAlerts = [
        { id: 'alert-1', ruleId: 'rule-123', status: 'active' },
      ];

      mockAlertService.getAlertHistory.mockResolvedValue(mockAlerts);

      const result = await controller.getAlertHistory(
        mockRequest,
        undefined,
        'rule-123',
      );

      expect(result.data[0].ruleId).toBe('rule-123');
      expect(mockAlertService.getAlertHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: 'rule-123',
        }),
      );
    });

    it('should filter alerts by status (comma-separated)', async () => {
      const mockAlerts = [
        { id: 'alert-1', status: 'active' },
        { id: 'alert-2', status: 'acknowledged' },
      ];

      mockAlertService.getAlertHistory.mockResolvedValue(mockAlerts);

      const result = await controller.getAlertHistory(
        mockRequest,
        undefined,
        undefined,
        'active,acknowledged',
      );

      expect(mockAlertService.getAlertHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['active', 'acknowledged'],
        }),
      );
    });

    it('should filter alerts by alertLevel', async () => {
      const mockAlerts = [
        { id: 'alert-1', alertLevel: 'critical' },
      ];

      mockAlertService.getAlertHistory.mockResolvedValue(mockAlerts);

      const result = await controller.getAlertHistory(
        mockRequest,
        undefined,
        undefined,
        undefined,
        'critical,high',
      );

      expect(mockAlertService.getAlertHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          alertLevel: ['critical', 'high'],
        }),
      );
    });

    it('should accept custom days parameter', async () => {
      const mockAlerts = [{ id: 'alert-1' }];

      mockAlertService.getAlertHistory.mockResolvedValue(mockAlerts);

      await controller.getAlertHistory(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        14,
      );

      expect(mockAlertService.getAlertHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
        }),
      );
    });

    it('should accept custom limit parameter', async () => {
      const mockAlerts = [{ id: 'alert-1' }];

      mockAlertService.getAlertHistory.mockResolvedValue(mockAlerts);

      await controller.getAlertHistory(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        50,
      );

      expect(mockAlertService.getAlertHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
        }),
      );
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge alert successfully', async () => {
      const ackDto: any = {
        note: 'Investigating the issue',
      };

      const mockAcknowledgedAlert = {
        id: 'alert-123',
        status: 'acknowledged',
        acknowledgedBy: 'user-123',
        acknowledgedAt: new Date(),
        note: 'Investigating the issue',
      };

      mockAlertService.acknowledgeAlert.mockResolvedValue(mockAcknowledgedAlert);

      const result = await controller.acknowledgeAlert(mockRequest, 'alert-123', ackDto);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('acknowledged');
      expect(result.message).toBe('Alert acknowledged');
      expect(mockAlertService.acknowledgeAlert).toHaveBeenCalledWith(
        'alert-123',
        'user-123',
        'Investigating the issue',
      );
    });

    it('should acknowledge alert without note', async () => {
      const ackDto: any = {
        note: undefined,
      };

      const mockAcknowledgedAlert = {
        id: 'alert-123',
        status: 'acknowledged',
        acknowledgedBy: 'user-123',
      };

      mockAlertService.acknowledgeAlert.mockResolvedValue(mockAcknowledgedAlert);

      const result = await controller.acknowledgeAlert(mockRequest, 'alert-123', ackDto);

      expect(mockAlertService.acknowledgeAlert).toHaveBeenCalledWith(
        'alert-123',
        'user-123',
        undefined,
      );
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert successfully', async () => {
      const resolveDto: any = {
        resolutionNote: 'Issue fixed by restarting service',
      };

      const mockResolvedAlert = {
        id: 'alert-123',
        status: 'resolved',
        resolvedBy: 'user-123',
        resolvedAt: new Date(),
        resolutionNote: 'Issue fixed by restarting service',
      };

      mockAlertService.resolveAlert.mockResolvedValue(mockResolvedAlert);

      const result = await controller.resolveAlert(mockRequest, 'alert-123', resolveDto);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('resolved');
      expect(result.message).toBe('Alert resolved');
      expect(mockAlertService.resolveAlert).toHaveBeenCalledWith(
        'alert-123',
        'user-123',
        'Issue fixed by restarting service',
      );
    });
  });

  describe('getStatistics', () => {
    it('should return alert statistics with default days', async () => {
      const mockStats = {
        totalAlerts: 100,
        activeAlerts: 10,
        acknowledgedAlerts: 30,
        resolvedAlerts: 60,
        byLevel: {
          critical: 5,
          high: 15,
          medium: 40,
          low: 40,
        },
        byDevice: [
          { deviceId: 'device-1', count: 25 },
          { deviceId: 'device-2', count: 20 },
        ],
      };

      mockAlertService.getAlertStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics(mockRequest, undefined);

      expect(result.success).toBe(true);
      expect(result.data.totalAlerts).toBe(100);
      expect(mockAlertService.getAlertStatistics).toHaveBeenCalledWith('user-123', 7);
    });

    it('should return statistics for custom days', async () => {
      const mockStats = {
        totalAlerts: 500,
        activeAlerts: 50,
      };

      mockAlertService.getAlertStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics(mockRequest, 30);

      expect(result.data.totalAlerts).toBe(500);
      expect(mockAlertService.getAlertStatistics).toHaveBeenCalledWith('user-123', 30);
    });

    it('should return statistics with breakdown by level', async () => {
      const mockStats = {
        totalAlerts: 100,
        byLevel: {
          critical: 10,
          high: 20,
          medium: 30,
          low: 40,
        },
      };

      mockAlertService.getAlertStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics(mockRequest, undefined);

      expect((result.data as any).byLevel).toBeDefined();
      expect((result.data as any).byLevel.critical).toBe(10);
      expect((result.data as any).byLevel.high).toBe(20);
    });
  });
});
