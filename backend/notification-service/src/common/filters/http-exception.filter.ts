import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof message === 'string'
          ? message
          : (message as any)?.message || 'Unknown error',
      error:
        typeof message === 'object'
          ? (message as any)?.error
          : exception instanceof Error
          ? exception.name
          : 'Error',
    };

    // 记录错误日志
    const logContext = {
      statusCode: status,
      path: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      userId: (request as any).user?.id,
      body: request.body,
      query: request.query,
      params: request.params,
    };

    if (status >= 500) {
      // 服务器错误 - 记录完整堆栈
      this.logger.error(
        `${request.method} ${request.url} - ${JSON.stringify(errorResponse)}`,
        exception instanceof Error ? exception.stack : '',
        JSON.stringify(logContext),
      );
    } else if (status >= 400) {
      // 客户端错误 - 记录警告
      this.logger.warn(
        `${request.method} ${request.url} - ${JSON.stringify(errorResponse)}`,
        JSON.stringify(logContext),
      );
    }

    response.status(status).json(errorResponse);
  }
}
