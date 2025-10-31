import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

/**
 * 统一的 HTTP 异常过滤器
 *
 * 用于捕获和格式化所有 HTTP 异常响应,包含 Request ID 追踪
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // 获取 Request ID
    const requestId = (request as any).requestId || 'unknown';

    // 如果是 BusinessException,直接使用其响应格式
    if (exception instanceof BusinessException) {
      const businessResponse = exceptionResponse as any;
      businessResponse.requestId = requestId;
      businessResponse.path = request.url;

      // 记录业务异常日志
      this.logger.warn(
        `[${requestId}] ${request.method} ${request.url} - ${status}: ${businessResponse.message} (errorCode: ${businessResponse.errorCode})`
      );

      response.status(status).json(businessResponse);
      return;
    }

    // 提取错误信息
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || exception.message;

    // 构建统一的错误响应
    const errorResponse = {
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      error: exception.name,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // 记录错误日志
    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${status}`,
        exception.stack
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${requestId}] ${request.method} ${request.url} - ${status}: ${JSON.stringify(message)}`
      );
    }

    response.status(status).json(errorResponse);
  }
}
