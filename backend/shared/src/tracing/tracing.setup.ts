/**
 * OpenTelemetry 追踪配置
 *
 * 提供分布式追踪的统一配置和初始化
 * 支持 Jaeger exporter 和自动仪器化
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';

export interface TracingConfig {
  serviceName: string;
  serviceVersion?: string;
  jaegerEndpoint?: string;
  enabled?: boolean;
}

let sdk: NodeSDK | null = null;

/**
 * 初始化 OpenTelemetry SDK
 *
 * @param config 追踪配置
 * @returns NodeSDK 实例
 */
export function initTracing(config: TracingConfig): NodeSDK | null {
  // 如果已经初始化或禁用追踪，跳过
  if (sdk || config.enabled === false) {
    return sdk;
  }

  const {
    serviceName,
    serviceVersion = '1.0.0',
    jaegerEndpoint = 'http://localhost:4318/v1/traces', // OTLP HTTP endpoint
  } = config;

  try {
    // 创建 OTLP HTTP Exporter（兼容 Jaeger）
    const traceExporter = new OTLPTraceExporter({
      url: jaegerEndpoint,
    });

    // 创建资源标识
    const resource = resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });

    // 初始化 SDK
    sdk = new NodeSDK({
      resource,
      spanProcessor: new BatchSpanProcessor(traceExporter),
      instrumentations: [
        // 自动仪器化 HTTP
        new HttpInstrumentation({
          ignoreIncomingRequestHook: (request) => {
            // 忽略健康检查和监控端点
            const url = request.url || '';
            return (
              url.includes('/health') ||
              url.includes('/metrics') ||
              url.includes('/favicon.ico')
            );
          },
        }),
        // 自动仪器化 Express
        new ExpressInstrumentation(),
        // 自动仪器化 NestJS
        new NestInstrumentation(),
        // 其他自动仪器化
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // 禁用文件系统追踪（噪音太多）
          },
        }),
      ],
    });

    // 启动 SDK
    sdk.start();

    console.log(`✅ OpenTelemetry initialized for service: ${serviceName}`);
    console.log(`📊 Jaeger endpoint: ${jaegerEndpoint}`);

    // 优雅关闭
    process.on('SIGTERM', async () => {
      try {
        await sdk?.shutdown();
        console.log('✅ OpenTelemetry SDK shut down successfully');
      } catch (error) {
        console.error('❌ Error shutting down OpenTelemetry SDK', error);
      }
    });

    return sdk;
  } catch (error) {
    console.error('❌ Failed to initialize OpenTelemetry:', error);
    return null;
  }
}

/**
 * 关闭追踪
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}

/**
 * 获取当前 SDK 实例
 */
export function getTracingSDK(): NodeSDK | null {
  return sdk;
}
