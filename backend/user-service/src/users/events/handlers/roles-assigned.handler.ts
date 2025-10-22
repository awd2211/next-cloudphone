import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { RolesAssignedEvent } from '../user.events';
import { EventStoreService } from '../event-store.service';

/**
 * 角色分配事件处理器
 * 当用户被分配新角色时触发
 */
@EventsHandler(RolesAssignedEvent)
export class RolesAssignedEventHandler
  implements IEventHandler<RolesAssignedEvent>
{
  private readonly logger = new Logger(RolesAssignedEventHandler.name);

  constructor(private readonly eventStore: EventStoreService) {}

  async handle(event: RolesAssignedEvent) {
    try {
      this.logger.log(
        `Handling RolesAssignedEvent for user: ${event.aggregateId}`,
      );

      // 事件已经在 EventStoreService 中保存和发布
      // 这里可以添加其他副作用，例如：

      // 1. 记录角色变更日志
      this.logger.debug(
        `Roles assigned to user ${event.aggregateId}: ${event.roleIds.join(', ')} by ${event.assignedBy}`,
      );

      // 2. 清除用户权限缓存
      // await this.cacheService.del(`user:permissions:${event.aggregateId}`);
      // await this.cacheService.del(`user:roles:${event.aggregateId}`);

      // 3. 发布角色变更事件到其他服务
      // await this.eventBusService.publishUserEvent('roles.assigned', {
      //   userId: event.aggregateId,
      //   roleIds: event.roleIds,
      //   assignedBy: event.assignedBy,
      //   assignedAt: event.occurredAt,
      // });

      // 4. 发送通知给用户
      // if (event.roleIds.includes('admin')) {
      //   await this.notificationService.sendRoleUpgradeNotification({
      //     userId: event.aggregateId,
      //     newRoles: event.roleIds,
      //   });
      // }

      // 5. 更新用户权限缓存（延迟刷新）
      // setTimeout(async () => {
      //   await this.permissionService.refreshUserPermissions(event.aggregateId);
      // }, 1000);

      this.logger.log(
        `RolesAssignedEvent handled successfully for user: ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle RolesAssignedEvent for user: ${event.aggregateId}`,
        error.stack,
      );
      // 不抛出异常，避免影响主流程
    }
  }
}
