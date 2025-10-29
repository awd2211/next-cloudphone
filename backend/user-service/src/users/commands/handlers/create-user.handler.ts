import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { CreateUserCommand } from '../impl/create-user.command';
import { UsersService } from '../../users.service';
import { User } from '../../../entities/user.entity';
import { UserCreatedEvent } from '../../events/user.events';
import { EventStoreService } from '../../events/event-store.service';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventStore: EventStoreService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 执行用户创建命令
   *
   * Issue #4 修复: 使用手动事务管理确保用户创建和事件持久化在同一事务中
   *
   * 修复前问题:
   * - usersService.create() 和 eventStore.saveEvent() 在两个独立事务中
   * - 如果事件保存失败，用户已创建，导致数据不一致
   *
   * 修复后:
   * - 所有操作在同一事务中执行（使用 QueryRunner）
   * - 任何步骤失败都会回滚整个事务
   * - 确保用户和事件要么都成功，要么都失败
   *
   * @param command CreateUserCommand - 用户创建命令
   * @returns User - 创建的用户
   */
  async execute(command: CreateUserCommand): Promise<User> {
    // 创建 QueryRunner 用于事务管理
    const queryRunner = this.dataSource.createQueryRunner();

    // 连接到数据库
    await queryRunner.connect();

    // 开启事务
    await queryRunner.startTransaction();

    try {
      // 在事务中执行创建用户的业务逻辑
      const user = await this.usersService.createInTransaction(
        queryRunner.manager,
        command.createUserDto,
      );

      // 获取当前版本号（在同一事务中）
      const version = await this.eventStore.getCurrentVersionInTransaction(
        queryRunner.manager,
        user.id,
      );

      // 创建并发布领域事件
      const event = new UserCreatedEvent(
        user.id,
        version + 1,
        user.username,
        user.email,
        user.fullName,
        user.phone,
        user.tenantId,
        command.createUserDto.roleIds,
      );

      // 在事务中保存事件
      // EventStoreService 会保存事件并发布到 EventBus
      // EventBus 会触发 UserCreatedEventHandler
      await this.eventStore.saveEventInTransaction(queryRunner.manager, event);

      // 提交事务
      await queryRunner.commitTransaction();

      // 事务提交成功，返回用户
      return user;
    } catch (error) {
      // 发生错误，回滚事务
      await queryRunner.rollbackTransaction();

      // 重新抛出错误
      throw error;
    } finally {
      // 释放 QueryRunner
      await queryRunner.release();
    }
  }
}
