import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * 简单的 API 缓存拦截器
 * 使用 Redis 缓存 GET 请求的响应
 */
@Injectable()
export class ApiCacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // 只缓存 GET 请求
    if (request.method !== 'GET') {
      return next.handle();
    }

    // 生成缓存键
    const cacheKey = this.getCacheKey(request);

    // 尝试从缓存获取
    const cachedResponse = await this.cacheManager.get(cacheKey);

    if (cachedResponse) {
      // 命中缓存
      return of(cachedResponse);
    }

    // 未命中缓存，执行请求并缓存结果
    return next.handle().pipe(
      tap(async (response) => {
        // 只缓存成功的响应
        if (response && (response.success === true || response.data)) {
          await this.cacheManager.set(cacheKey, response);
        }
      })
    );
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(request: any): string {
    const url = request.url.split('?')[0];
    const query = JSON.stringify(request.query || {});
    return `api:${url}:${query}`;
  }
}
