/**
 * HTTP Client Context Propagation 示例
 *
 * 本文件展示如何配置跨服务的 trace context 传播
 */

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { trace, context, propagation } from '@opentelemetry/api';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TracedHttpClientExample {
  constructor(private readonly httpService: HttpService) {}

  /**
   * 示例 1: 使用 @nestjs/axios 进行跨服务调用（推荐方式）
   *
   * @nestjs/axios 已经通过 auto-instrumentations-node 自动添加了
   * OpenTelemetry instrumentation，无需手动配置
   */
  async callOtherServiceAutomatic(userId: string) {
    // 直接使用 HttpService，trace context 会自动传播
    const response = await firstValueFrom(
      this.httpService.get(
        `http://device-service:30002/devices?userId=${userId}`,
      ),
    );

    return response.data;
  }

  /**
   * 示例 2: 手动添加 trace context headers（备选方案）
   */
  async callOtherServiceManual(userId: string) {
    // 获取当前 span 的 context
    const currentSpan = trace.getActiveSpan();
    const currentContext = context.active();

    // 准备 headers 对象
    const headers: Record<string, string> = {};

    // 使用 W3C Trace Context 格式注入 trace context
    propagation.inject(currentContext, headers);

    // 发起 HTTP 请求，headers 会包含 traceparent 和 tracestate
    const response = await firstValueFrom(
      this.httpService.get(
        `http://device-service:30002/devices?userId=${userId}`,
        { headers },
      ),
    );

    return response.data;
  }

  /**
   * 示例 3: 使用 axios 原生客户端配置拦截器
   */
  setupAxiosInterceptor() {
    // 在模块初始化时配置
    this.httpService.axiosRef.interceptors.request.use(
      (config) => {
        // 获取当前 context
        const currentContext = context.active();

        // 注入 trace context 到 headers
        if (!config.headers) {
          config.headers = {};
        }

        propagation.inject(currentContext, config.headers);

        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    this.httpService.axiosRef.interceptors.response.use(
      (response) => {
        // 可以从响应中提取 trace context
        const span = trace.getActiveSpan();
        if (span) {
          span.addEvent('HTTP response received', {
            'http.status_code': response.status,
            'http.response_content_length': response.data?.length || 0,
          });
        }
        return response;
      },
      (error) => {
        const span = trace.getActiveSpan();
        if (span) {
          span.recordException(error);
          span.addEvent('HTTP request failed', {
            'http.status_code': error.response?.status,
            'error.message': error.message,
          });
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * 示例 4: 完整的跨服务调用示例（带自定义 span）
   */
  async callDeviceServiceWithSpan(userId: string) {
    const tracer = trace.getTracer('http-client-example');

    return await tracer.startActiveSpan(
      'call_device_service',
      {
        attributes: {
          'user.id': userId,
          'http.target_service': 'device-service',
        },
      },
      async (span) => {
        try {
          // 这里的 HTTP 调用会自动继承 span context
          const response = await firstValueFrom(
            this.httpService.get(
              `http://device-service:30002/devices?userId=${userId}`,
            ),
          );

          span.setAttributes({
            'http.status_code': response.status,
            'device.count': response.data.length,
          });

          span.setStatus({ code: 0 }); // OK
          return response.data;
        } catch (error) {
          span.recordException(error);
          span.setStatus({
            code: 2, // ERROR
            message: error.message,
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }
}

/**
 * 示例 5: HTTP Module 配置（在模块中配置）
 */
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
      // axios 的 transformRequest 可以用于添加自定义逻辑
      transformRequest: [
        (data, headers) => {
          // 这里可以添加额外的 headers
          // 但 auto-instrumentation 已经处理了 trace context
          return data;
        },
      ],
    }),
  ],
  providers: [TracedHttpClientExample],
  exports: [TracedHttpClientExample],
})
export class TracedHttpModule {}

/**
 * 示例 6: Context Propagation 验证
 */
@Injectable()
export class ContextPropagationValidator {
  /**
   * 验证 trace context 是否正确传播
   */
  async validatePropagation() {
    const span = trace.getActiveSpan();
    const spanContext = span?.spanContext();

    console.log('Current Trace Context:', {
      traceId: spanContext?.traceId,
      spanId: spanContext?.spanId,
      traceFlags: spanContext?.traceFlags,
    });

    // 模拟 HTTP headers
    const headers: Record<string, string> = {};
    propagation.inject(context.active(), headers);

    console.log('Propagated Headers:', headers);
    // 输出类似:
    // {
    //   traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    //   tracestate: 'vendor1=value1,vendor2=value2'
    // }
  }

  /**
   * 从 HTTP headers 中提取 trace context
   */
  extractContextFromHeaders(headers: Record<string, string>) {
    // 从 headers 中提取 context
    const extractedContext = propagation.extract(context.active(), headers);

    return trace.getSpanContext(extractedContext);
  }
}

/**
 * W3C Trace Context 格式说明
 *
 * traceparent header 格式:
 * version-trace-id-parent-id-trace-flags
 *
 * 示例:
 * 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
 *
 * - version: 00 (当前版本)
 * - trace-id: 4bf92f3577b34da6a3ce929d0e0e4736 (128 bit)
 * - parent-id: 00f067aa0ba902b7 (64 bit)
 * - trace-flags: 01 (采样标志)
 */
