import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { ConsulService } from "@cloudphone/shared";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);

  // ========== 安全配置 ==========

  // Helmet 安全头配置
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Swagger需要
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Swagger需要
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false, // Swagger需要
      crossOriginResourcePolicy: { policy: "cross-origin" }, // API需要
    }),
  );

  // ========== 日志配置 ==========

  // 使用 Pino 作为应用的 Logger
  app.useLogger(app.get(Logger));
  app.flushLogs();

  // ========== 验证和转换 ==========

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ========== CORS 配置 ==========

  app.enableCors({
    origin: configService.get("CORS_ORIGINS")?.split(",") || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Request-ID",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["X-Request-ID"],
  });

  // 设置全局前缀
  app.setGlobalPrefix("api");

  // ========== Swagger API 文档配置 ==========

  const config = new DocumentBuilder()
    .setTitle("API Gateway")
    .setDescription("云手机平台 - API 网关统一文档")
    .setVersion("1.0")
    .addTag("auth", "认证授权")
    .addTag("proxy", "服务代理")
    .addTag("health", "健康检查")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // ========== 优雅关闭配置 ==========

  app.enableShutdownHooks();

  const port = parseInt(configService.get("PORT") || "30000");
  await app.listen(port);

  // ========== 注册到 Consul ==========

  try {
    const consulService = app.get(ConsulService);
    await consulService.registerService(
      "api-gateway",
      port,
      ["v1", "gateway"],
      "/api/health",
    );
    console.log(`✅ Service registered to Consul`);
  } catch (error) {
    console.warn(`⚠️  Failed to register to Consul: ${error.message}`);
  }

  // ========== 服务启动日志 ==========

  console.log(`🚀 API Gateway is running on: http://localhost:${port}`);
  console.log(`📡 API prefix: /api`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`✅ Health check: http://localhost:${port}/health`);
  console.log(
    `🔗 Consul: http://${configService.get("CONSUL_HOST", "localhost")}:${configService.get("CONSUL_PORT", 8500)}`,
  );
  console.log(`🔒 Helmet security: ENABLED`);
  console.log(`🔄 Graceful shutdown: ENABLED`);
}

bootstrap();
