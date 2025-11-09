import { Test, TestingModule } from '@nestjs/testing';
import { ProxyStickySessionController } from './proxy-sticky-session.controller';
import { ProxyStickySessionService } from '../services/proxy-sticky-session.service';

describe('ProxyStickySessionController', () => {
  let controller: ProxyStickySessionController;
  let service: any;

  const mockStickySessionService = {
    createStickySession: jest.fn(),
    renewSession: jest.fn(),
    terminateSession: jest.fn(),
    getSessionDetails: jest.fn(),
    getDeviceSessions: jest.fn(),
    getUserSessions: jest.fn(),
    getSessionStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyStickySessionController],
      providers: [
        {
          provide: ProxyStickySessionService,
          useValue: mockStickySessionService,
        },
      ],
    }).compile();

    controller = module.get<ProxyStickySessionController>(
      ProxyStickySessionController,
    );
    service = module.get(ProxyStickySessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a sticky session', async () => {
      const dto: any = {
        userId: 'user-123',
        deviceId: 'device-456',
        durationSeconds: 86400,
      };

      const mockSession: any = {
        sessionId: 'session-789',
        userId: 'user-123',
        deviceId: 'device-456',
        proxyId: 'proxy-abc',
        expiresAt: new Date('2025-01-07T00:00:00.000Z'),
        createdAt: new Date('2025-01-06T00:00:00.000Z'),
      };

      service.createStickySession.mockResolvedValue(mockSession);

      const result: any = await controller.createSession(dto);

      expect(result.success).toBe(true);
      expect(result.data.sessionId).toBe('session-789');
      expect(result.message).toBe('Sticky session created');
      expect(service.createStickySession).toHaveBeenCalledWith(dto);
    });

    it('should handle session creation with custom duration', async () => {
      const dto: any = {
        userId: 'user-123',
        deviceId: 'device-456',
        durationSeconds: 604800, // 7 days
      };

      const mockSession: any = {
        sessionId: 'session-456',
        durationSeconds: 604800,
      };

      service.createStickySession.mockResolvedValue(mockSession);

      const result: any = await controller.createSession(dto);

      expect(result.success).toBe(true);
      expect(result.data.durationSeconds).toBe(604800);
    });
  });

  describe('renewSession', () => {
    it('should renew a session', async () => {
      const sessionId = 'session-123';
      const dto: any = {
        extensionSeconds: 86400,
      };

      const mockSession: any = {
        sessionId: 'session-123',
        expiresAt: new Date('2025-01-08T00:00:00.000Z'),
        renewalCount: 1,
      };

      service.renewSession.mockResolvedValue(mockSession);

      const result: any = await controller.renewSession(sessionId, dto);

      expect(result.success).toBe(true);
      expect(result.data.sessionId).toBe('session-123');
      expect(result.data.renewalCount).toBe(1);
      expect(result.message).toBe('Session renewed');
      expect(service.renewSession).toHaveBeenCalledWith(sessionId, 86400);
    });

    it('should handle maximum renewal extension', async () => {
      const sessionId = 'session-456';
      const dto: any = {
        extensionSeconds: 604800, // 7 days max
      };

      const mockSession: any = {
        sessionId: 'session-456',
        expiresAt: new Date('2025-01-13T00:00:00.000Z'),
      };

      service.renewSession.mockResolvedValue(mockSession);

      const result: any = await controller.renewSession(sessionId, dto);

      expect(result.success).toBe(true);
      expect(service.renewSession).toHaveBeenCalledWith(sessionId, 604800);
    });
  });

  describe('terminateSession', () => {
    it('should terminate a session', async () => {
      service.terminateSession.mockResolvedValue(undefined);

      const result = await controller.terminateSession('session-123');

      expect(result.success).toBe(true);
      expect(result.data.terminated).toBe(true);
      expect(result.message).toBe('Session terminated');
      expect(service.terminateSession).toHaveBeenCalledWith('session-123');
    });

    it('should handle termination of multiple sessions', async () => {
      service.terminateSession.mockResolvedValue(undefined);

      await controller.terminateSession('session-1');
      await controller.terminateSession('session-2');

      expect(service.terminateSession).toHaveBeenCalledTimes(2);
      expect(service.terminateSession).toHaveBeenNthCalledWith(1, 'session-1');
      expect(service.terminateSession).toHaveBeenNthCalledWith(2, 'session-2');
    });
  });

  describe('getSessionDetails', () => {
    it('should return session details', async () => {
      const mockDetails = {
        sessionId: 'session-123',
        userId: 'user-123',
        deviceId: 'device-456',
        proxyId: 'proxy-789',
        proxyIp: '192.168.1.1',
        expiresAt: new Date('2025-01-10T00:00:00.000Z'),
        renewalHistory: [
          { date: new Date('2025-01-06T00:00:00.000Z'), extension: 86400 },
        ],
        usageStats: {
          totalRequests: 500,
          successRate: 0.95,
        },
      };

      service.getSessionDetails.mockResolvedValue(mockDetails);

      const result = await controller.getSessionDetails('session-123');

      expect(result.success).toBe(true);
      expect(result.data.sessionId).toBe('session-123');
      expect(result.data.renewalHistory).toHaveLength(1);
      expect(service.getSessionDetails).toHaveBeenCalledWith('session-123');
    });
  });

  describe('getDeviceSessions', () => {
    it('should return device sessions', async () => {
      const mockSessions: any = [
        { sessionId: 'session-1', deviceId: 'device-123' },
        { sessionId: 'session-2', deviceId: 'device-123' },
      ];

      service.getDeviceSessions.mockResolvedValue(mockSessions);

      const result: any = await controller.getDeviceSessions('device-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].sessionId).toBe('session-1');
      expect(service.getDeviceSessions).toHaveBeenCalledWith('device-123');
    });

    it('should return empty array when device has no sessions', async () => {
      service.getDeviceSessions.mockResolvedValue([]);

      const result: any = await controller.getDeviceSessions('device-456');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getUserSessions', () => {
    it('should return user sessions without expired', async () => {
      const mockSessions: any = [
        { sessionId: 'session-1', userId: 'user-123', active: true },
        { sessionId: 'session-2', userId: 'user-123', active: true },
      ];

      service.getUserSessions.mockResolvedValue(mockSessions);

      const result: any = await controller.getUserSessions('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(service.getUserSessions).toHaveBeenCalledWith(
        'user-123',
        undefined,
      );
    });

    it('should return user sessions including expired', async () => {
      const mockSessions: any = [
        { sessionId: 'session-1', userId: 'user-123', active: true },
        { sessionId: 'session-2', userId: 'user-123', active: false },
        { sessionId: 'session-3', userId: 'user-123', active: false },
      ];

      service.getUserSessions.mockResolvedValue(mockSessions);

      const result: any = await controller.getUserSessions('user-123', true);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(service.getUserSessions).toHaveBeenCalledWith('user-123', true);
    });

    it('should handle user with no sessions', async () => {
      service.getUserSessions.mockResolvedValue([]);

      const result: any = await controller.getUserSessions('user-456');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getSessionStats', () => {
    it('should return global session statistics', async () => {
      const mockStats = {
        totalSessions: 150,
        activeSessions: 120,
        expiredSessions: 30,
        avgDuration: 86400,
        totalRenewals: 45,
        mostUsedProxies: [
          { proxyId: 'proxy-1', count: 50 },
          { proxyId: 'proxy-2', count: 40 },
        ],
      };

      service.getSessionStats.mockResolvedValue(mockStats);

      const result: any = await controller.getSessionStats();

      expect(result.success).toBe(true);
      expect(result.data.totalSessions).toBe(150);
      expect(result.data.activeSessions).toBe(120);
      expect(result.data.mostUsedProxies).toHaveLength(2);
      expect(service.getSessionStats).toHaveBeenCalledWith(undefined);
    });

    it('should return user-specific session statistics', async () => {
      const mockStats = {
        totalSessions: 10,
        activeSessions: 8,
        expiredSessions: 2,
        avgDuration: 172800,
      };

      service.getSessionStats.mockResolvedValue(mockStats);

      const result = await controller.getSessionStats('user-123');

      expect(result.success).toBe(true);
      expect(result.data.totalSessions).toBe(10);
      expect(result.data.activeSessions).toBe(8);
      expect(service.getSessionStats).toHaveBeenCalledWith('user-123');
    });
  });
});
