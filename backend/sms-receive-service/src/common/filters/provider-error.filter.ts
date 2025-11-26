import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ProviderError } from '../../providers/provider.interface';

/**
 * ProviderError 异常过滤器
 *
 * 将 ProviderError 转换为适当的 HTTP 响应
 * 根据错误代码返回正确的 HTTP 状态码
 */
@Catch(ProviderError)
export class ProviderErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProviderErrorFilter.name);

  catch(exception: ProviderError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status = exception.httpStatus;

    // 只记录 5xx 错误为 error，其他为 warn
    if (status >= 500) {
      this.logger.error(
        `Provider error [${exception.provider}]: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.warn(
        `Provider error [${exception.provider}] (${exception.code}): ${exception.message}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error: exception.code || 'PROVIDER_ERROR',
      provider: exception.provider,
      retryable: exception.retryable,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
