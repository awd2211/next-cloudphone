import { Module, Global } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { EventBusService } from "@cloudphone/shared";

/**
 * Device Service 本地 RabbitMQ 模块
 *
 * ⚠️ 暂时禁用 Consumer 以避免 DiscoveryService 依赖问题
 *
 * 已知问题：
 * - @golevelup/nestjs-rabbitmq v6.0.2 与 @nestjs/core v11 存在 DiscoveryService 依赖冲突
 * - enableControllerDiscovery: false 无法完全禁用 DiscoveryService 注入
 *
 * TODO:
 * 1. 升级 @golevelup/nestjs-rabbitmq 到支持 NestJS 11 的版本
 * 2. 或者使用原生 amqplib 重写 Consumer
 */
@Global() // ✅ 设为全局模块，这样 EventBusService 可以在任何地方使用
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get(
          "RABBITMQ_URL",
          "amqp://admin:admin123@localhost:5672/cloudphone",
        ),
        connectionInitOptions: {
          wait: false,
          timeout: 5000,
        },
        enableControllerDiscovery: false, // ✅ 禁用自动发现
        exchanges: [
          {
            name: "cloudphone.events",
            type: "topic",
            options: {
              durable: true,
            },
          },
        ],
        connectionManagerOptions: {
          heartbeatIntervalInSeconds: 30,
          reconnectTimeInSeconds: 5,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    // DevicesConsumer,  // ⚠️ 暂时禁用以避免 DiscoveryService 错误
    EventBusService, // ✅ 提供 EventBusService 给其他模块使用（仅发布事件）
  ],
  exports: [
    RabbitMQModule,
    EventBusService, // ✅ 导出 EventBusService
  ],
})
export class DeviceRabbitMQModule {}
