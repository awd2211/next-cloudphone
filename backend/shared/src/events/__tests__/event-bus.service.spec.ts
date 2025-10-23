import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService } from '../event-bus.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

describe('EventBusService', () => {
  let service: EventBusService;
  let amqpConnection: AmqpConnection;

  const mockAmqpConnection = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBusService,
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
      ],
    }).compile();

    service = module.get<EventBusService>(EventBusService);
    amqpConnection = module.get<AmqpConnection>(AmqpConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publish', () => {
    it('should publish message to RabbitMQ exchange', async () => {
      // Arrange
      const exchange = 'cloudphone.events';
      const routingKey = 'device.created';
      const message = {
        deviceId: 'device-123',
        userId: 'user-456',
        deviceName: 'Test Device',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publish(exchange, routingKey, message);

      // Assert
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        exchange,
        routingKey,
        message,
        expect.objectContaining({
          persistent: true,
          timestamp: expect.any(Number),
        }),
      );
    });

    it('should throw error when publish fails', async () => {
      // Arrange
      const exchange = 'cloudphone.events';
      const routingKey = 'device.created';
      const message = { deviceId: 'device-123' };
      const error = new Error('RabbitMQ connection failed');

      mockAmqpConnection.publish.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.publish(exchange, routingKey, message),
      ).rejects.toThrow('RabbitMQ connection failed');
    });

    it('should log success message', async () => {
      // Arrange
      const logSpy = jest.spyOn(service['logger'], 'log');
      const exchange = 'cloudphone.events';
      const routingKey = 'device.created';
      const message = { deviceId: 'device-123' };

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act
      await service.publish(exchange, routingKey, message);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        `Event published: ${routingKey} to ${exchange}`,
      );
    });

    it('should log error when publish fails', async () => {
      // Arrange
      const errorSpy = jest.spyOn(service['logger'], 'error');
      const exchange = 'cloudphone.events';
      const routingKey = 'device.created';
      const message = { deviceId: 'device-123' };
      const error = new Error('Connection lost');

      mockAmqpConnection.publish.mockRejectedValue(error);

      // Act
      try {
        await service.publish(exchange, routingKey, message);
      } catch (e) {
        // Expected to throw
      }

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        `Failed to publish event: ${routingKey}`,
        error,
      );
    });
  });

  describe('publishDeviceEvent', () => {
    it('should publish device event with correct routing key', async () => {
      // Arrange
      const eventType = 'created';
      const payload = {
        deviceId: 'device-123',
        userId: 'user-456',
        deviceName: 'My Device',
        deviceType: 'Android',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);
      const publishSpy = jest.spyOn(service, 'publish');

      // Act
      await service.publishDeviceEvent(eventType, payload);

      // Assert
      expect(publishSpy).toHaveBeenCalledWith(
        'cloudphone.events',
        'device.created',
        expect.objectContaining({
          type: 'device.created',
          timestamp: expect.any(String),
          deviceId: 'device-123',
          userId: 'user-456',
          deviceName: 'My Device',
          deviceType: 'Android',
        }),
      );
    });

    it('should add timestamp to device event payload', async () => {
      // Arrange
      const eventType = 'started';
      const payload = {
        deviceId: 'device-123',
        userId: 'user-456',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);
      const publishSpy = jest.spyOn(service, 'publish');

      // Act
      await service.publishDeviceEvent(eventType, payload);

      // Assert
      const publishedMessage = publishSpy.mock.calls[0][2];
      expect(publishedMessage.timestamp).toBeDefined();
      expect(new Date(publishedMessage.timestamp).getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
    });
  });

  describe('publishAppEvent', () => {
    it('should publish app event with correct routing key', async () => {
      // Arrange
      const eventType = 'installed';
      const payload = {
        appId: 'app-123',
        deviceId: 'device-456',
        version: '1.0.0',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);
      const publishSpy = jest.spyOn(service, 'publish');

      // Act
      await service.publishAppEvent(eventType, payload);

      // Assert
      expect(publishSpy).toHaveBeenCalledWith(
        'cloudphone.events',
        'app.installed',
        expect.objectContaining({
          type: 'app.installed',
          timestamp: expect.any(String),
          appId: 'app-123',
          deviceId: 'device-456',
          version: '1.0.0',
        }),
      );
    });
  });

  describe('publishOrderEvent', () => {
    it('should publish order event with correct routing key', async () => {
      // Arrange
      const eventType = 'paid';
      const payload = {
        orderId: 'order-123',
        userId: 'user-456',
        amount: 99.99,
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);
      const publishSpy = jest.spyOn(service, 'publish');

      // Act
      await service.publishOrderEvent(eventType, payload);

      // Assert
      expect(publishSpy).toHaveBeenCalledWith(
        'cloudphone.events',
        'order.paid',
        expect.objectContaining({
          type: 'order.paid',
          timestamp: expect.any(String),
          orderId: 'order-123',
          userId: 'user-456',
          amount: 99.99,
        }),
      );
    });
  });

  describe('publishUserEvent', () => {
    it('should publish user event with correct routing key', async () => {
      // Arrange
      const eventType = 'registered';
      const payload = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);
      const publishSpy = jest.spyOn(service, 'publish');

      // Act
      await service.publishUserEvent(eventType, payload);

      // Assert
      expect(publishSpy).toHaveBeenCalledWith(
        'cloudphone.events',
        'user.registered',
        expect.objectContaining({
          type: 'user.registered',
          timestamp: expect.any(String),
          userId: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
        }),
      );
    });
  });

  describe('publishNotificationEvent', () => {
    it('should publish notification event with correct routing key', async () => {
      // Arrange
      const eventType = 'email.sent';
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        subject: 'Welcome',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);
      const publishSpy = jest.spyOn(service, 'publish');

      // Act
      await service.publishNotificationEvent(eventType, payload);

      // Assert
      expect(publishSpy).toHaveBeenCalledWith(
        'cloudphone.events',
        'notification.email.sent',
        expect.objectContaining({
          type: 'notification.email.sent',
          timestamp: expect.any(String),
          userId: 'user-123',
          email: 'test@example.com',
          subject: 'Welcome',
        }),
      );
    });
  });

  describe('publishBillingEvent', () => {
    it('should publish billing event with correct routing key', async () => {
      // Arrange
      const eventType = 'payment_success';
      const payload = {
        orderId: 'order-123',
        userId: 'user-456',
        amount: 199.99,
        paymentMethod: 'credit_card',
      };

      mockAmqpConnection.publish.mockResolvedValue(undefined);
      const publishSpy = jest.spyOn(service, 'publish');

      // Act
      await service.publishBillingEvent(eventType, payload);

      // Assert
      expect(publishSpy).toHaveBeenCalledWith(
        'cloudphone.events',
        'billing.payment_success',
        expect.objectContaining({
          type: 'billing.payment_success',
          timestamp: expect.any(String),
          orderId: 'order-123',
          userId: 'user-456',
          amount: 199.99,
          paymentMethod: 'credit_card',
        }),
      );
    });
  });

  describe('event naming consistency', () => {
    it('should generate consistent event types', async () => {
      // Arrange
      const events = [
        { method: 'publishDeviceEvent', type: 'created', prefix: 'device' },
        { method: 'publishUserEvent', type: 'updated', prefix: 'user' },
        { method: 'publishAppEvent', type: 'deleted', prefix: 'app' },
        { method: 'publishOrderEvent', type: 'cancelled', prefix: 'order' },
        {
          method: 'publishBillingEvent',
          type: 'refunded',
          prefix: 'billing',
        },
        {
          method: 'publishNotificationEvent',
          type: 'sent',
          prefix: 'notification',
        },
      ];

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act & Assert
      for (const event of events) {
        await service[event.method](event.type, {});
        const expectedRoutingKey = `${event.prefix}.${event.type}`;
        expect(amqpConnection.publish).toHaveBeenCalledWith(
          'cloudphone.events',
          expectedRoutingKey,
          expect.any(Object),
          expect.any(Object),
        );
      }
    });
  });

  describe('message persistence', () => {
    it('should set persistent flag for all published messages', async () => {
      // Arrange
      const testCases = [
        { method: 'publishDeviceEvent', args: ['created', {}] },
        { method: 'publishUserEvent', args: ['registered', {}] },
        { method: 'publishAppEvent', args: ['installed', {}] },
      ];

      mockAmqpConnection.publish.mockResolvedValue(undefined);

      // Act & Assert
      for (const testCase of testCases) {
        await service[testCase.method](...testCase.args);
        expect(amqpConnection.publish).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(Object),
          expect.objectContaining({
            persistent: true,
          }),
        );
      }
    });
  });
});
