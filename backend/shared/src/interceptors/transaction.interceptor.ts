import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError, from } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { DataSource, QueryRunner } from 'typeorm';
import { TRANSACTIONAL_KEY, TransactionalOptions } from '../decorators/transactional.decorator';

/**
 * Transaction Interceptor
 *
 * 自动为标记了 @Transactional 的方法开启数据库事务
 *
 * 工作原理:
 * 1. 检测方法是否有 @Transactional 装饰器
 * 2. 创建 QueryRunner 并开启事务
 * 3. 执行方法
 * 4. 成功则提交事务，失败则回滚
 * 5. 释放 QueryRunner 资源
 *
 * 使用方式:
 * ```typescript
 * // 在 app.module.ts 中全局注册
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_INTERCEPTOR,
 *       useClass: TransactionInterceptor,
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TransactionInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const transactionalOptions = this.reflector.get<TransactionalOptions>(
      TRANSACTIONAL_KEY,
      context.getHandler()
    );

    // 没有 @Transactional 装饰器，直接执行
    if (!transactionalOptions) {
      return next.handle();
    }

    const methodName = context.getHandler().name;
    const className = context.getClass().name;

    this.logger.debug(`Starting transaction for ${className}.${methodName}`);

    return from(this.executeInTransaction(next, transactionalOptions, className, methodName));
  }

  /**
   * 在事务中执行方法
   */
  private async executeInTransaction(
    next: CallHandler,
    options: TransactionalOptions,
    className: string,
    methodName: string
  ): Promise<any> {
    // 创建 QueryRunner
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();

    // 开启事务
    await queryRunner.startTransaction(options.isolationLevel);

    const startTime = Date.now();

    try {
      // 执行方法（转换为 Promise）
      const result = await next.handle().toPromise();

      // 提交事务
      await queryRunner.commitTransaction();

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Transaction committed for ${className}.${methodName} (${duration}ms)`
      );

      return result;
    } catch (error) {
      // 回滚事务
      await queryRunner.rollbackTransaction();

      const duration = Date.now() - startTime;
      this.logger.warn(
        `Transaction rolled back for ${className}.${methodName} (${duration}ms): ${error.message}`
      );

      throw error;
    } finally {
      // 释放 QueryRunner
      await queryRunner.release();
    }
  }
}
