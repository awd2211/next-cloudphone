import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, route } = request;
    const routePath = route?.path || request.url;
    const startTime = Date.now();

    // 增加活跃连接数
    this.metricsService.incrementActiveConnections();

    return next.handle().pipe(
      tap(() => {
        // 请求成功
        const duration = (Date.now() - startTime) / 1000; // 转换为秒
        const statusCode = response.statusCode;

        this.metricsService.recordHttpRequest(
          method,
          routePath,
          statusCode,
          duration,
        );
        this.metricsService.decrementActiveConnections();
      }),
      catchError((error) => {
        // 请求失败
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = error.status || 500;
        const errorType = error.name || 'Error';

        this.metricsService.recordHttpRequest(
          method,
          routePath,
          statusCode,
          duration,
        );
        this.metricsService.recordHttpError(
          method,
          routePath,
          statusCode,
          errorType,
        );
        this.metricsService.decrementActiveConnections();

        throw error;
      }),
    );
  }
}
