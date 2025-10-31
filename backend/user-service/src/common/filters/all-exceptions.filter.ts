import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';
import { QueryFailedError } from 'typeorm';

/**
 * 全局异常过滤器
 * 统一处理所有异常，返回标准格式的错误响应
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = BusinessErrorCode.UNKNOWN_ERROR;
    let message = 'Internal server error';
    let details: any = undefined;

    // 处理业务异常
    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      code = exceptionResponse.code;
      message = exceptionResponse.message;
      details = exceptionResponse.details;
    }
    // 处理 NestJS 内置 HTTP 异常
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        // 处理验证错误
        if (Array.isArray((exceptionResponse as any).message)) {
          message = (exceptionResponse as any).message.join(', ');
          code = BusinessErrorCode.INVALID_PARAMETER;
        }
      }
    }
    // 处理 TypeORM 数据库错误
    else if (exception instanceof QueryFailedError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = BusinessErrorCode.DATABASE_ERROR;
      message = '数据库操作失败';

      // 详细错误信息只在开发环境显示
      if (process.env.NODE_ENV === 'development') {
        details = {
          query: (exception as any).query,
          parameters: (exception as any).parameters,
          driverError: (exception as any).driverError?.message,
        };
      }

      // 记录数据库错误
      this.logger.error(
        `Database Error: ${(exception as any).message}`,
        exception instanceof Error ? exception.stack : undefined
      );
    }
    // 处理其他未知错误
    else if (exception instanceof Error) {
      message = exception.message || 'Internal server error';
      details =
        process.env.NODE_ENV === 'development'
          ? {
              stack: exception.stack,
            }
          : undefined;

      // 记录未知错误
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    }

    // 构建错误响应
    const errorResponse = {
      success: false,
      code,
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      // 只在开发环境包含请求ID
      ...(process.env.NODE_ENV === 'development' && {
        requestId: (request as any).id,
      }),
    };

    // 记录错误信息（4xx 用 warn，5xx 用 error）
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined
      );
    } else if (status >= 400) {
      this.logger.warn(`${request.method} ${request.url} - ${status} - ${message}`);
    }

    // 发送响应
    response.status(status).json(errorResponse);
  }
}
