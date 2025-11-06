import { EntityManager } from 'typeorm';

/**
 * PublishEvent Decorator
 *
 * 自动在事务中发布 Outbox 事件的装饰器
 * 必须与 @Transaction 装饰器配合使用
 *
 * 使用方法:
 * ```typescript
 * @Transaction()
 * @PublishEvent({
 *   entityType: 'device',
 *   eventType: 'device.created',
 *   payloadExtractor: (result, args) => ({
 *     deviceId: result.id,
 *     userId: result.userId,
 *     deviceName: result.name,
 *     timestamp: new Date().toISOString(),
 *   })
 * })
 * async createDevice(manager: EntityManager, dto: CreateDeviceDto) {
 *   const device = await manager.save(Device, dto);
 *   return device;
 * }
 * ```
 *
 * 动态事件类型:
 * ```typescript
 * @Transaction()
 * @PublishEvent({
 *   entityType: 'application',
 *   eventType: (result, args) => `app.install.${result.status.toLowerCase()}`,
 *   payloadExtractor: (result, args) => ({
 *     installationId: result.id,
 *     deviceId: result.deviceId,
 *     appId: result.applicationId,
 *     status: result.status,
 *   })
 * })
 * async updateInstallStatus(manager: EntityManager, id: string, status: InstallStatus) {
 *   // ...
 *   return deviceApp;
 * }
 * ```
 *
 * 特性:
 * - 自动从方法返回值提取事件数据
 * - 支持动态事件类型
 * - 自动注入 EventOutboxService
 * - 与 @Transaction 完美集成
 * - 自动处理错误（事件写入失败会触发事务回滚）
 *
 * 注意事项:
 * 1. 必须与 @Transaction 装饰器一起使用
 * 2. @PublishEvent 必须在 @Transaction 之后（装饰器从下往上执行）
 * 3. 方法的第一个参数必须是 EntityManager（由 @Transaction 注入）
 * 4. EventOutboxService 必须在类中注入
 */
export interface PublishEventOptions {
  /**
   * 实体类型（如 'device', 'application', 'user'）
   */
  entityType: string;

  /**
   * 事件类型（如 'device.created', 'app.updated'）
   * 可以是字符串或函数（动态事件类型）
   */
  eventType: string | ((result: any, args: any[]) => string);

  /**
   * Payload 提取器 - 从方法返回值和参数中提取事件数据
   * @param result 方法返回值
   * @param args 方法参数（不包括 EntityManager）
   */
  payloadExtractor: (result: any, args: any[]) => Record<string, any>;

  /**
   * 实体 ID 提取器（可选）
   * 默认从 result.id 获取
   */
  entityIdExtractor?: (result: any, args: any[]) => string;
}

export function PublishEvent(options: PublishEventOptions): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 获取 EventOutboxService
      const eventOutboxService = this.eventOutboxService;

      if (!eventOutboxService) {
        throw new Error(
          `@PublishEvent decorator requires EventOutboxService to be injected. ` +
            `Please inject EventOutboxService into ${target.constructor.name}.`
        );
      }

      // 调用原方法（@Transaction 已经注入了 EntityManager）
      const result = await originalMethod.apply(this, args);

      // 如果没有返回值，则不发布事件
      if (!result) {
        return result;
      }

      // 提取 EntityManager（第一个参数）
      const manager = args[0];
      if (!manager || !(manager instanceof EntityManager)) {
        throw new Error(
          `@PublishEvent decorator requires @Transaction decorator. ` +
            `The first parameter must be EntityManager.`
        );
      }

      // 提取实体 ID
      const entityId = options.entityIdExtractor
        ? options.entityIdExtractor(result, args.slice(1))
        : result.id;

      if (!entityId) {
        throw new Error(
          `@PublishEvent decorator could not extract entityId from result. ` +
            `Please provide entityIdExtractor option or ensure result.id exists.`
        );
      }

      // 提取事件类型（支持动态事件类型）
      const eventType =
        typeof options.eventType === 'function'
          ? options.eventType(result, args.slice(1))
          : options.eventType;

      // 提取 Payload
      const payload = options.payloadExtractor(result, args.slice(1));

      // 写入 Outbox 事件
      await eventOutboxService.writeEvent(manager, options.entityType, entityId, eventType, payload);

      return result;
    };

    return descriptor;
  };
}

/**
 * 简化版 PublishEvent - 用于常见场景
 *
 * 使用方法:
 * ```typescript
 * @Transaction()
 * @SimplePublishEvent('device', 'device.created')
 * async createDevice(manager: EntityManager, dto: CreateDeviceDto) {
 *   const device = await manager.save(Device, dto);
 *   return device;
 * }
 * ```
 *
 * 自动行为:
 * - entityId 从 result.id 获取
 * - payload 从 result 中自动提取常见字段（id, userId, name, status等）
 * - 自动添加 timestamp
 */
export function SimplePublishEvent(entityType: string, eventType: string): MethodDecorator {
  return PublishEvent({
    entityType,
    eventType,
    entityIdExtractor: (result) => result.id,
    payloadExtractor: (result) => ({
      // 自动提取常见字段
      id: result.id,
      userId: result.userId || result.user_id,
      name: result.name,
      status: result.status,
      timestamp: new Date().toISOString(),
      // 包含完整对象（用于调试）
      _data: result,
    }),
  });
}

/**
 * 动态事件类型的 PublishEvent
 *
 * 使用方法:
 * ```typescript
 * @Transaction()
 * @DynamicPublishEvent('device', (result) => `device.status.${result.status.toLowerCase()}`)
 * async updateStatus(manager: EntityManager, id: string, status: DeviceStatus) {
 *   const device = await manager.findOne(Device, { where: { id } });
 *   device.status = status;
 *   await manager.save(Device, device);
 *   return device;
 * }
 * ```
 */
export function DynamicPublishEvent(
  entityType: string,
  eventTypeExtractor: (result: any, args: any[]) => string,
  payloadExtractor?: (result: any, args: any[]) => Record<string, any>
): MethodDecorator {
  return PublishEvent({
    entityType,
    eventType: eventTypeExtractor,
    payloadExtractor:
      payloadExtractor ||
      ((result) => ({
        id: result.id,
        userId: result.userId || result.user_id,
        timestamp: new Date().toISOString(),
        _data: result,
      })),
  });
}

/**
 * 批量事件发布装饰器
 *
 * 用于一次发布多个事件的场景
 *
 * 使用方法:
 * ```typescript
 * @Transaction()
 * @BatchPublishEvents([
 *   {
 *     entityType: 'device',
 *     eventType: 'device.created',
 *     payloadExtractor: (result) => ({ deviceId: result.id })
 *   },
 *   {
 *     entityType: 'quota',
 *     eventType: 'quota.usage.reported',
 *     payloadExtractor: (result) => ({ userId: result.userId, usage: result.usage })
 *   }
 * ])
 * async createDeviceWithQuota(manager: EntityManager, dto: CreateDeviceDto) {
 *   // ...
 *   return device;
 * }
 * ```
 */
export function BatchPublishEvents(events: PublishEventOptions[]): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const eventOutboxService = this.eventOutboxService;

      if (!eventOutboxService) {
        throw new Error(`@BatchPublishEvents requires EventOutboxService to be injected.`);
      }

      const result = await originalMethod.apply(this, args);

      if (!result) {
        return result;
      }

      const manager = args[0];
      if (!manager || !(manager instanceof EntityManager)) {
        throw new Error(`@BatchPublishEvents requires @Transaction decorator.`);
      }

      // 发布所有事件
      for (const eventOptions of events) {
        const entityId = eventOptions.entityIdExtractor
          ? eventOptions.entityIdExtractor(result, args.slice(1))
          : result.id;

        const eventType =
          typeof eventOptions.eventType === 'function'
            ? eventOptions.eventType(result, args.slice(1))
            : eventOptions.eventType;

        const payload = eventOptions.payloadExtractor(result, args.slice(1));

        await eventOutboxService.writeEvent(
          manager,
          eventOptions.entityType,
          entityId,
          eventType,
          payload
        );
      }

      return result;
    };

    return descriptor;
  };
}
