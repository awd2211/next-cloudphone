import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Consul from 'consul';

@Injectable()
export class ConsulService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConsulService.name);
  private consul: any;
  private serviceId: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get('CONSUL_HOST', 'localhost');
    const port = this.configService.get('CONSUL_PORT', '8500');

    this.consul = new (Consul as any)({
      host,
      port,
      promisify: true,
    });

    this.logger.log(`Consul client initialized: ${host}:${port}`);
  }

  async onModuleInit() {
    // 模块初始化时可以进行健康检查
    try {
      const leader = await this.consul.status.leader();
      this.logger.log(`Consul leader: ${leader}`);
    } catch (error) {
      this.logger.warn(`Consul not available: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    // 模块销毁时注销服务
    if (this.serviceId) {
      try {
        await this.deregisterService(this.serviceId);
        this.logger.log(`✅ Service ${this.serviceId} deregistered from Consul`);
      } catch (error) {
        this.logger.warn(`⚠️ Failed to deregister service: ${error.message}`);
      }
    }
  }

  /**
   * 注册服务到 Consul
   */
  async registerService(
    name: string,
    port: number,
    tags: string[] = [],
    healthPath: string = '/health'
  ): Promise<string | null> {
    const serviceId = `${name}-${process.env.HOSTNAME || 'dev'}-${Date.now()}`;
    const address = process.env.SERVICE_HOST || 'host.docker.internal';

    try {
      const config = {
        id: serviceId,
        name,
        address,
        port,
        tags: ['cloudphone', process.env.NODE_ENV || 'development', ...tags],
        check: {
          http: `http://${address}:${port}${healthPath}`,
          interval: '15s',
          timeout: '10s',
          deregistercriticalserviceafter: '3m',
          tlsskipverify: true,
        },
        meta: {
          version: process.env.npm_package_version || '1.0.0',
          env: process.env.NODE_ENV || 'development',
          registeredAt: new Date().toISOString(),
        },
      };

      this.logger.debug(`Registering service with config: ${JSON.stringify(config, null, 2)}`);

      await this.consul.agent.service.register(config);

      this.serviceId = serviceId;
      this.logger.log(`✅ Service registered: ${serviceId} at ${address}:${port}${healthPath}`);

      return serviceId;
    } catch (error) {
      this.logger.error(`❌ Failed to register service: ${error.message}`, error.stack);
      // 不抛出错误，允许服务继续运行
      return null;
    }
  }

  /**
   * 注销服务
   */
  async deregisterService(serviceId: string): Promise<void> {
    try {
      await this.consul.agent.service.deregister(serviceId);
      this.logger.log(`Service deregistered: ${serviceId}`);
    } catch (error) {
      this.logger.error(`Failed to deregister service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取健康的服务实例
   */
  async getService(serviceName: string): Promise<string> {
    try {
      const result = await this.consul.health.service({
        service: serviceName,
        passing: true, // 只返回健康检查通过的实例
      });

      if (!result || result.length === 0) {
        throw new Error(`No healthy instances found for service: ${serviceName}`);
      }

      // 简单的随机负载均衡
      const instance = result[Math.floor(Math.random() * result.length)];
      const address = instance.Service.Address;
      const port = instance.Service.Port;

      const serviceUrl = `http://${address}:${port}`;
      this.logger.debug(`Resolved service ${serviceName} to ${serviceUrl}`);

      return serviceUrl;
    } catch (error) {
      this.logger.error(`Failed to get service ${serviceName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取所有服务实例（包括不健康的）
   */
  async getAllServiceInstances(serviceName: string): Promise<any[]> {
    try {
      const result = await this.consul.health.service({
        service: serviceName,
      });

      return result || [];
    } catch (error) {
      this.logger.error(`Failed to get all instances for ${serviceName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取所有已注册的服务
   */
  async getAllServices(): Promise<Record<string, string[]>> {
    try {
      const services = await this.consul.catalog.service.list();
      return services;
    } catch (error) {
      this.logger.error(`Failed to list services: ${error.message}`);
      throw error;
    }
  }

  /**
   * 设置键值对
   */
  async setKey(key: string, value: string): Promise<void> {
    try {
      await this.consul.kv.set(key, value);
      this.logger.debug(`Key set: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to set key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取键值
   */
  async getKey(key: string): Promise<string | null> {
    try {
      const result = await this.consul.kv.get(key);
      return result ? result.Value : null;
    } catch (error) {
      this.logger.error(`Failed to get key ${key}: ${error.message}`);
      return null;
    }
  }
}
