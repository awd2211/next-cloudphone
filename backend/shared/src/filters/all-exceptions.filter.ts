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
 * 全局异常过滤器
 *
 * 捕获所有未被其他过滤器处理的异常
 * ✅ 支持 HTTP、RPC、WebSocket 等多种上下文
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const contextType = host.getType();

    // ✅ 处理非 HTTP 上下文（RabbitMQ、WebSocket、RPC 等）
    if (contextType !== 'http') {
      this.handleNonHttpException(exception, contextType);
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // ✅ 安全检查：确保 response 是有效的 HTTP 响应对象
    if (!response || typeof response.status !== 'function') {
      this.handleNonHttpException(exception, 'unknown');
      return;
    }

    // 确定 HTTP 状态码
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // 提取错误消息
    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
      error = exception.name;
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // 构建错误响应
    const errorResponse = {
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      error,
      timestamp: new Date().toISOString(),
      path: request?.url || 'unknown',
      method: request?.method || 'unknown',
    };

    // 记录详细的错误日志
    this.logger.error(
      `${request?.method || 'UNKNOWN'} ${request?.url || 'unknown'} - ${status}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception)
    );

    response.status(status).json(errorResponse);
  }

  /**
   * 处理非 HTTP 上下文的异常（RabbitMQ、WebSocket、RPC 等）
   */
  private handleNonHttpException(exception: unknown, contextType: string): void {
    const errorMessage = exception instanceof Error ? exception.message : String(exception);
    const errorStack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `[${contextType.toUpperCase()}] Exception: ${errorMessage}`,
      errorStack
    );

    // 对于非 HTTP 上下文，重新抛出异常让消息队列等中间件处理
    // 这样可以触发 RabbitMQ 的 DLX（死信队列）等机制
    throw exception;
  }
}
