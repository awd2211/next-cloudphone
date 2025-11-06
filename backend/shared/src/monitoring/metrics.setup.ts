import { INestApplication } from '@nestjs/common';
import { register } from 'prom-client';

/**
 * 为 NestJS 应用添加 /metrics 端点
 *
 * 使用方法:
 * ```typescript
 * import { setupMetricsEndpoint } from '@cloudphone/shared';
 *
 * async function bootstrap() {
 *   const app = await NestFactory.create(AppModule);
 *
 *   // 添加 metrics 端点
 *   setupMetricsEndpoint(app);
 *
 *   await app.listen(3000);
 * }
 * ```
 */
export function setupMetricsEndpoint(app: INestApplication): void {
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.get('/metrics', async (_req: any, res: any) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res.status(500).end(error);
    }
  });
}
