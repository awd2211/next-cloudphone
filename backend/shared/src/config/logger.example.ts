/**
 * 日志使用示例
 *
 * 展示如何在 NestJS 服务中使用增强的日志功能
 */

import { Injectable, Logger } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Injectable()
export class ExampleService {
  // 方式 1: 使用 NestJS 内置的 Logger
  private readonly logger = new Logger(ExampleService.name);

  // 方式 2: 注入 Pino Logger（推荐，性能更好）
  constructor(
    @InjectPinoLogger(ExampleService.name)
    private readonly pinoLogger: PinoLogger
  ) {}

  /**
   * 基础日志示例
   */
  basicLogging() {
    // 使用 NestJS Logger
    this.logger.log('This is an info message');
    this.logger.error('This is an error message');
    this.logger.warn('This is a warning message');
    this.logger.debug('This is a debug message');
    this.logger.verbose('This is a verbose message');

    // 使用 Pino Logger（推荐）
    this.pinoLogger.info('This is an info message');
    this.pinoLogger.error('This is an error message');
    this.pinoLogger.warn('This is a warning message');
    this.pinoLogger.debug('This is a debug message');
    this.pinoLogger.trace('This is a trace message');
  }

  /**
   * 结构化日志 - 添加额外的上下文信息
   */
  structuredLogging(userId: string, action: string) {
    this.pinoLogger.info(
      {
        userId,
        action,
        timestamp: new Date().toISOString(),
        metadata: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      },
      `User ${userId} performed ${action}`
    );
  }

  /**
   * 错误日志 - 包含堆栈信息
   */
  errorLogging(error: Error) {
    this.pinoLogger.error(
      {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        context: 'UserService',
      },
      'Failed to create user'
    );
  }

  /**
   * 性能日志 - 记录执行时间
   */
  async performanceLogging() {
    const startTime = Date.now();

    try {
      // 执行某些操作
      await this.someOperation();

      const duration = Date.now() - startTime;
      this.pinoLogger.info(
        {
          duration,
          operation: 'someOperation',
          status: 'success',
        },
        `Operation completed in ${duration}ms`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.pinoLogger.error(
        {
          duration,
          operation: 'someOperation',
          status: 'failed',
          error: error.message,
        },
        `Operation failed after ${duration}ms`
      );
    }
  }

  /**
   * 业务日志 - 记录业务事件
   */
  businessLogging(orderId: string, amount: number) {
    this.pinoLogger.info(
      {
        event: 'order.created',
        orderId,
        amount,
        currency: 'CNY',
        timestamp: new Date().toISOString(),
      },
      `Order ${orderId} created with amount ${amount}`
    );
  }

  /**
   * 敏感信息日志 - 自动脱敏
   */
  sensitiveDataLogging(user: any) {
    // 密码等敏感字段会被自动脱敏
    this.pinoLogger.info(
      {
        user: {
          id: user.id,
          username: user.username,
          password: user.password, // 会被自动脱敏为 'pas***'
          token: user.token, // 会被自动脱敏
        },
      },
      'User logged in'
    );
  }

  /**
   * 条件日志 - 根据环境决定是否记录
   */
  conditionalLogging() {
    const isDebug = process.env.LOG_LEVEL === 'debug';

    if (isDebug) {
      this.pinoLogger.debug(
        {
          data: {
            /* 大量调试数据 */
          },
        },
        'Detailed debug information'
      );
    }
  }

  /**
   * 链路追踪 - 记录请求ID
   */
  tracingLogging(requestId: string, correlationId: string) {
    this.pinoLogger.info(
      {
        requestId,
        correlationId,
        service: 'user-service',
        operation: 'getUserById',
      },
      'Processing user request'
    );
  }

  private async someOperation() {
    // 模拟操作
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Controller 中使用日志示例
 */
import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('example')
export class ExampleController {
  constructor(
    @InjectPinoLogger(ExampleController.name)
    private readonly logger: PinoLogger
  ) {}

  @Get()
  async getExample(@Req() req: Request) {
    // 请求日志（自动包含请求ID）
    this.logger.info(
      {
        method: req.method,
        url: req.url,
        requestId: req.id, // 自动生成的请求ID
      },
      'Handling get example request'
    );

    try {
      const result = await this.processRequest();

      // 成功响应日志
      this.logger.info(
        {
          status: 'success',
          resultCount: result.length,
        },
        'Request processed successfully'
      );

      return result;
    } catch (error) {
      // 错误日志
      this.logger.error(
        {
          error: error.message,
          stack: error.stack,
        },
        'Request processing failed'
      );
      throw error;
    }
  }

  private async processRequest() {
    return ['item1', 'item2'];
  }
}

/**
 * 在主应用中使用自定义日志
 */
// import { createAppLogger } from '@cloudphone/shared';
import { createAppLogger } from './logger.config';

// 创建应用级别的日志记录器
const appLogger = createAppLogger('my-service');

// 使用
appLogger.info({ event: 'app.started' }, 'Application started successfully');
appLogger.error({ error: 'Connection failed' }, 'Database connection error');
