import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * 验证异常过滤器
 *
 * 专门处理 ValidationPipe 抛出的 BadRequestException
 * 提供更友好的验证错误响应格式
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    // 提取验证错误信息
    const validationErrors = this.extractValidationErrors(exceptionResponse);

    // 构建友好的响应格式
    const errorResponse = {
      success: false,
      code: status,
      message: '请求参数验证失败',
      errors: validationErrors,
      timestamp: new Date().toISOString(),
    };

    // 记录警告日志
    this.logger.warn(
      `Validation failed: ${JSON.stringify(validationErrors)}`,
    );

    response.status(status).json(errorResponse);
  }

  /**
   * 提取验证错误信息
   */
  private extractValidationErrors(exceptionResponse: any): any[] {
    if (typeof exceptionResponse === 'object' && exceptionResponse.message) {
      const messages = exceptionResponse.message;

      // 如果是数组形式的错误消息
      if (Array.isArray(messages)) {
        return messages.map((msg) => this.parseValidationMessage(msg));
      }

      // 如果是单个错误消息
      return [{ message: messages }];
    }

    return [{ message: exceptionResponse }];
  }

  /**
   * 解析验证消息，提取字段和错误类型
   */
  private parseValidationMessage(message: string): any {
    // 常见的验证错误格式: "field should not be empty"
    // 或 "field must be a string"
    const match = message.match(/^(\w+)\s+(.+)$/);

    if (match) {
      return {
        field: match[1],
        message: match[2],
      };
    }

    return { message };
  }
}
