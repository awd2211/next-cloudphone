import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 全局 HTTP 异常过滤器
 *
 * 功能:
 * - 捕获所有 HTTP 异常
 * - 统一错误响应格式
 * - 记录错误日志
 * - 区分开发和生产环境的错误详情
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 确定 HTTP 状态码
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 提取错误消息
    const message = this.getErrorMessage(exception);

    // 构建错误响应
    const errorResponse = {
      success: false,
      code: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      // 只在开发环境返回详细错误信息
      ...(process.env.NODE_ENV === 'development' && {
        error: this.getErrorDetails(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // 记录错误日志
    this.logError(exception, request, status);

    // 发送响应
    response.status(status).json(errorResponse);
  }

  /**
   * 提取错误消息
   */
  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      // 如果响应是对象，提取 message 字段
      if (typeof response === 'object' && response !== null) {
        const messageObj = response as any;
        if (messageObj.message) {
          // 处理数组形式的消息（通常来自 ValidationPipe）
          if (Array.isArray(messageObj.message)) {
            return messageObj.message.join(', ');
          }
          return messageObj.message;
        }
      }

      // 如果响应是字符串，直接返回
      if (typeof response === 'string') {
        return response;
      }

      return exception.message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  /**
   * 获取错误详情（仅开发环境）
   */
  private getErrorDetails(exception: unknown): any {
    if (exception instanceof HttpException) {
      return exception.getResponse();
    }

    if (exception instanceof Error) {
      return {
        name: exception.name,
        message: exception.message,
      };
    }

    return exception;
  }

  /**
   * 记录错误日志
   */
  private logError(exception: unknown, request: Request, status: number) {
    const logData = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      status,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      userId: (request as any).user?.id, // 如果有用户信息
      error: this.getErrorMessage(exception),
    };

    // 根据错误级别记录不同日志
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
        JSON.stringify(logData),
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${this.getErrorMessage(exception)}`,
        JSON.stringify(logData),
      );
    } else {
      this.logger.log(
        `${request.method} ${request.url}`,
        JSON.stringify(logData),
      );
    }
  }
}
