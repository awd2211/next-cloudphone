import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initTracer, JaegerTracer, TracingConfig } from 'jaeger-client';
import { Tracer, Span, SpanContext } from 'opentracing';

/**
 * Jaeger 分布式追踪服务
 * 集成 OpenTracing 标准，提供分布式请求追踪能力
 */
@Injectable()
export class TracingService implements OnModuleInit {
  private readonly logger = new Logger(TracingService.name);
  private tracer: Tracer;
  private enabled: boolean;

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get('JAEGER_ENABLED', 'false') === 'true';
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('Jaeger tracing is disabled');
      return;
    }

    try {
      const serviceName = 'user-service';
      const jaegerHost = this.configService.get('JAEGER_AGENT_HOST', 'localhost');
      const jaegerPort = parseInt(this.configService.get('JAEGER_AGENT_PORT', '6831'));
      const samplerType = this.configService.get('JAEGER_SAMPLER_TYPE', 'const');
      const samplerParam = parseFloat(this.configService.get('JAEGER_SAMPLER_PARAM', '1'));

      const config: TracingConfig = {
        serviceName,
        sampler: {
          type: samplerType as any,
          param: samplerParam,
        },
        reporter: {
          logSpans: process.env.NODE_ENV === 'development',
          agentHost: jaegerHost,
          agentPort: jaegerPort,
          flushIntervalMs: 1000,
        },
      };

      this.tracer = initTracer(config, {
        logger: {
          info: (msg: string) => this.logger.log(msg),
          error: (msg: string) => this.logger.error(msg),
        },
      }) as JaegerTracer;

      this.logger.log(`Jaeger tracer initialized for ${serviceName}`);
      this.logger.log(`Jaeger agent: ${jaegerHost}:${jaegerPort}`);
      this.logger.log(`Sampler: ${samplerType}(${samplerParam})`);
    } catch (error) {
      this.logger.error('Failed to initialize Jaeger tracer', error);
      this.enabled = false;
    }
  }

  /**
   * 检查追踪是否启用
   */
  isEnabled(): boolean {
    return this.enabled && !!this.tracer;
  }

  /**
   * 获取 tracer 实例
   */
  getTracer(): Tracer | null {
    return this.enabled ? this.tracer : null;
  }

  /**
   * 开始一个新的 span
   * @param operationName 操作名称
   * @param parentSpanContext 父 span 上下文（可选）
   * @returns Span 实例，如果追踪未启用则返回 null
   */
  startSpan(operationName: string, parentSpanContext?: SpanContext): Span | null {
    if (!this.isEnabled()) {
      return null;
    }

    const options: any = {};
    if (parentSpanContext) {
      options.childOf = parentSpanContext;
    }

    return this.tracer.startSpan(operationName, options);
  }

  /**
   * 完成一个 span
   * @param span Span 实例
   * @param error 错误信息（可选）
   */
  finishSpan(span: Span | null, error?: Error): void {
    if (!span) return;

    if (error) {
      span.setTag('error', true);
      span.log({
        event: 'error',
        'error.kind': error.name,
        message: error.message,
        stack: error.stack,
      });
    }

    span.finish();
  }

  /**
   * 为 span 添加标签
   * @param span Span 实例
   * @param key 标签键
   * @param value 标签值
   */
  setTag(span: Span | null, key: string, value: any): void {
    if (!span) return;
    span.setTag(key, value);
  }

  /**
   * 为 span 添加日志
   * @param span Span 实例
   * @param log 日志对象
   */
  addLog(span: Span | null, log: Record<string, any>): void {
    if (!span) return;
    span.log(log);
  }

  /**
   * 便捷方法：追踪数据库查询
   * @param operationName 操作名称
   * @param queryFn 查询函数
   * @param parentSpanContext 父 span 上下文（可选）
   * @returns 查询结果
   */
  async traceDbQuery<T>(
    operationName: string,
    queryFn: () => Promise<T>,
    parentSpanContext?: SpanContext,
  ): Promise<T> {
    const span = this.startSpan(`db.${operationName}`, parentSpanContext);

    if (span) {
      span.setTag('db.type', 'postgres');
      span.setTag('span.kind', 'client');
    }

    try {
      const result = await queryFn();

      if (span && Array.isArray(result)) {
        span.setTag('db.result.count', result.length);
      }

      this.finishSpan(span);
      return result;
    } catch (error) {
      this.finishSpan(span, error as Error);
      throw error;
    }
  }

  /**
   * 便捷方法：追踪 HTTP 请求
   * @param method HTTP 方法
   * @param url URL
   * @param requestFn 请求函数
   * @param parentSpanContext 父 span 上下文（可选）
   * @returns 请求结果
   */
  async traceHttpRequest<T>(
    method: string,
    url: string,
    requestFn: () => Promise<T>,
    parentSpanContext?: SpanContext,
  ): Promise<T> {
    const span = this.startSpan(`http.${method.toLowerCase()}`, parentSpanContext);

    if (span) {
      span.setTag('http.method', method);
      span.setTag('http.url', url);
      span.setTag('span.kind', 'client');
    }

    try {
      const result = await requestFn();

      if (span) {
        span.setTag('http.status_code', 200);
      }

      this.finishSpan(span);
      return result;
    } catch (error) {
      if (span) {
        span.setTag('http.status_code', (error as any).status || 500);
      }
      this.finishSpan(span, error as Error);
      throw error;
    }
  }

  /**
   * 便捷方法：追踪缓存操作
   * @param operation 操作类型（get/set/del）
   * @param key 缓存键
   * @param operationFn 操作函数
   * @param parentSpanContext 父 span 上下文（可选）
   * @returns 操作结果
   */
  async traceCacheOperation<T>(
    operation: 'get' | 'set' | 'del',
    key: string,
    operationFn: () => Promise<T>,
    parentSpanContext?: SpanContext,
  ): Promise<T> {
    const span = this.startSpan(`cache.${operation}`, parentSpanContext);

    if (span) {
      span.setTag('cache.key', key);
      span.setTag('cache.type', 'redis');
    }

    try {
      const result = await operationFn();

      if (span && operation === 'get') {
        span.setTag('cache.hit', result !== null && result !== undefined);
      }

      this.finishSpan(span);
      return result;
    } catch (error) {
      this.finishSpan(span, error as Error);
      throw error;
    }
  }

  /**
   * 便捷方法：创建计时器，自动完成 span
   * @param operationName 操作名称
   * @param parentSpanContext 父 span 上下文（可选）
   * @returns 完成函数
   */
  createTimer(operationName: string, parentSpanContext?: SpanContext): () => void {
    const span = this.startSpan(operationName, parentSpanContext);

    return (error?: Error) => {
      this.finishSpan(span, error);
    };
  }
}
