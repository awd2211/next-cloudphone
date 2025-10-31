import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
  path: string;
  requestId?: string;
}

/**
 * 统一响应转换拦截器
 *
 * 将所有成功的响应转换为统一格式
 * - 包含 Request ID（如果存在）
 * - 统一的成功响应格式
 * - 时间戳和请求路径
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] || request.id;

    return next.handle().pipe(
      map((data) => {
        const response: Response<T> = {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        // 添加 Request ID（如果存在）
        if (requestId) {
          response.requestId = requestId;
        }

        return response;
      })
    );
  }
}
