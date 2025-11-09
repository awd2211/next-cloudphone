import { Test, TestingModule } from '@nestjs/testing';
import { NotificationGateway } from '../notification.gateway';
import { Socket } from 'socket.io';

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;
  let mockClient: Partial<Socket>;
  let mockServer: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationGateway],
    }).compile();

    gateway = module.get<NotificationGateway>(NotificationGateway);

    // Mock Socket
    mockClient = {
      id: 'test-client-id',
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    };

    // Mock Server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    gateway.server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should handle client connection', () => {
      // Act
      gateway.handleConnection(mockClient as Socket);

      // Assert
      expect(gateway.getConnectedClientsCount()).toBe(1);
      expect(mockClient.emit).toHaveBeenCalledWith('welcome', {
        message: '已连接到通知服务',
        clientId: 'test-client-id',
        timestamp: expect.any(String),
      });
    });

    it('should handle client disconnection', () => {
      // Arrange
      gateway.handleConnection(mockClient as Socket);
      expect(gateway.getConnectedClientsCount()).toBe(1);

      // Act
      gateway.handleDisconnect(mockClient as Socket);

      // Assert
      expect(gateway.getConnectedClientsCount()).toBe(0);
    });

    it('should track multiple connected clients', () => {
      // Arrange
      const client2: Partial<Socket> = {
        id: 'client-2',
        emit: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
      };

      // Act
      gateway.handleConnection(mockClient as Socket);
      gateway.handleConnection(client2 as Socket);

      // Assert
      expect(gateway.getConnectedClientsCount()).toBe(2);
    });
  });

  describe('Subscribe/Unsubscribe', () => {
    it('should handle user subscription', () => {
      // Arrange
      const subscribeData = { userId: 'user-123' };

      // Act
      const result = gateway.handleSubscribe(subscribeData, mockClient as Socket);

      // Assert
      expect(mockClient.join).toHaveBeenCalledWith('user:user-123');
      expect(result).toEqual({
        event: 'subscribed',
        data: {
          userId: 'user-123',
          message: '订阅成功',
        },
      });
    });

    it('should handle user unsubscription', () => {
      // Arrange
      const unsubscribeData = { userId: 'user-123' };

      // Act
      const result = gateway.handleUnsubscribe(unsubscribeData, mockClient as Socket);

      // Assert
      expect(mockClient.leave).toHaveBeenCalledWith('user:user-123');
      expect(result).toEqual({
        event: 'unsubscribed',
        data: {
          userId: 'user-123',
          message: '取消订阅成功',
        },
      });
    });
  });

  describe('Sending Notifications', () => {
    it('should send notification to specific user', () => {
      // Arrange
      const userId = 'user-123';
      const notification = {
        id: 'notif-1',
        title: 'Test',
        message: 'Test message',
      };

      // Act
      gateway.sendToUser(userId, notification);

      // Assert
      expect(mockServer.to).toHaveBeenCalledWith('user:user-123');
      expect(mockServer.emit).toHaveBeenCalledWith('notification', notification);
    });

    it('should broadcast notification to all clients', () => {
      // Arrange
      const notification = {
        id: 'notif-broadcast',
        title: 'System Update',
        message: 'Broadcast message',
      };

      // Act
      gateway.broadcast(notification);

      // Assert
      expect(mockServer.emit).toHaveBeenCalledWith('notification', notification);
    });

    it('should send notification with complete payload', () => {
      // Arrange
      const userId = 'user-456';
      const notification = {
        id: 'notif-2',
        userId: 'user-456',
        title: 'Payment Success',
        message: 'Your payment has been processed',
        type: 'success',
        data: {
          amount: 100,
          currency: 'USD',
        },
        timestamp: new Date().toISOString(),
      };

      // Act
      gateway.sendToUser(userId, notification);

      // Assert
      expect(mockServer.to).toHaveBeenCalledWith('user:user-456');
      expect(mockServer.emit).toHaveBeenCalledWith('notification', notification);
    });
  });

  describe('Edge Cases', () => {
    it('should handle disconnect of non-existent client gracefully', () => {
      // Arrange
      const nonExistentClient: Partial<Socket> = {
        id: 'non-existent',
        emit: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
      };

      // Act & Assert - should not throw
      expect(() => gateway.handleDisconnect(nonExistentClient as Socket)).not.toThrow();
    });

    it('should handle empty userId in subscribe', () => {
      // Arrange
      const subscribeData = { userId: '' };

      // Act
      const result = gateway.handleSubscribe(subscribeData, mockClient as Socket);

      // Assert
      expect(mockClient.join).toHaveBeenCalledWith('user:');
      expect(result).toBeDefined();
    });

    it('should handle sending notification to non-existent user', () => {
      // Arrange
      const userId = 'non-existent-user';
      const notification = { title: 'Test' };

      // Act & Assert - should not throw
      expect(() => gateway.sendToUser(userId, notification)).not.toThrow();
      expect(mockServer.to).toHaveBeenCalledWith('user:non-existent-user');
    });
  });

  describe('Client Count', () => {
    it('should return correct client count', () => {
      // Arrange
      const clients = [
        { id: 'client-1', emit: jest.fn(), join: jest.fn(), leave: jest.fn() },
        { id: 'client-2', emit: jest.fn(), join: jest.fn(), leave: jest.fn() },
        { id: 'client-3', emit: jest.fn(), join: jest.fn(), leave: jest.fn() },
      ];

      // Act
      clients.forEach((client) => gateway.handleConnection(client as unknown as Socket));

      // Assert
      expect(gateway.getConnectedClientsCount()).toBe(3);
    });

    it('should update count after disconnection', () => {
      // Arrange
      gateway.handleConnection(mockClient as Socket);
      expect(gateway.getConnectedClientsCount()).toBe(1);

      // Act
      gateway.handleDisconnect(mockClient as Socket);

      // Assert
      expect(gateway.getConnectedClientsCount()).toBe(0);
    });
  });
});
