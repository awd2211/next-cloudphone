import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { Reflector } from '@nestjs/core';
import {
  CIRCUIT_BREAKER_KEY,
  CircuitBreakerDecoratorOptions,
} from '../decorators/circuit-breaker.decorator';
import { CircuitBreakerService } from '../services/circuit-breaker.service';

/**
 * 熔断器拦截器
 *
 * 自动为带有 @UseCircuitBreaker 装饰器的方法添加熔断保护
 */
@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private circuitBreakerService: CircuitBreakerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 获取熔断器配置
    const options = this.reflector.get<CircuitBreakerDecoratorOptions>(
      CIRCUIT_BREAKER_KEY,
      context.getHandler(),
    );

    // 如果没有熔断器配置，直接执行
    if (!options) {
      return next.handle();
    }

    // 创建熔断器（如果已存在则复用）
    const breaker = this.circuitBreakerService.createBreaker(
      options.name,
      async (...args: any[]) => {
        // 执行原方法
        return next.handle().toPromise();
      },
      {
        timeout: options.timeout,
        errorThresholdPercentage: options.errorThresholdPercentage,
        resetTimeout: options.resetTimeout,
        volumeThreshold: options.volumeThreshold,
        fallback: options.fallback
          ? async (...args: any[]) => {
              // 如果有降级函数，执行降级
              return options.fallback!(...args);
            }
          : async () => {
              // 默认降级：抛出服务不可用异常
              throw new ServiceUnavailableException(
                `Service ${options.name} is temporarily unavailable`,
              );
            },
      },
    );

    // 使用熔断器执行方法
    return from(breaker.fire());
  }
}
