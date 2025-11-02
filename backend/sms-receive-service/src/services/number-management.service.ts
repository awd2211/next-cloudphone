import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualNumber, ProviderConfig, NumberPool } from '../entities';
import { SmsActivateAdapter } from '../providers/sms-activate.adapter';
import { EventBusService } from '@cloudphone/shared';

interface RequestNumberDto {
  service: string;
  country?: string;
  deviceId: string;
  provider?: string;
  usePool?: boolean;
}

@Injectable()
export class NumberManagementService {
  private readonly logger = new Logger(NumberManagementService.name);

  constructor(
    @InjectRepository(VirtualNumber)
    private readonly numberRepo: Repository<VirtualNumber>,
    @InjectRepository(ProviderConfig)
    private readonly providerRepo: Repository<ProviderConfig>,
    @InjectRepository(NumberPool)
    private readonly poolRepo: Repository<NumberPool>,
    private readonly smsActivate: SmsActivateAdapter,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * 请求虚拟号码
   */
  async requestNumber(dto: RequestNumberDto): Promise<VirtualNumber> {
    const { service, country, deviceId, provider, usePool } = dto;

    // 1. 如果使用号码池，先尝试从池中获取
    if (usePool) {
      const pooledNumber = await this.getFromPool(service, country);
      if (pooledNumber) {
        return await this.assignPooledNumber(pooledNumber, deviceId);
      }
      this.logger.log(`Pool miss for ${service}/${country}, buying new number`);
    }

    // 2. 选择平台（目前只支持SMS-Activate，后续扩展）
    const selectedProvider = provider || 'sms-activate';

    if (selectedProvider !== 'sms-activate') {
      throw new BadRequestException(`Provider ${selectedProvider} not supported yet`);
    }

    // 3. 将服务名转换为平台代码
    const serviceCode = this.getServiceCode(service);
    const countryCode = this.getCountryCode(country);

    // 4. 调用平台API获取号码
    try {
      const result = await this.smsActivate.getNumber(serviceCode, countryCode);

      // 5. 保存到数据库
      const virtualNumber = this.numberRepo.create({
        provider: selectedProvider,
        providerActivationId: result.activationId,
        phoneNumber: result.phoneNumber,
        countryCode: country || 'RU',
        countryName: this.getCountryName(country),
        serviceCode,
        serviceName: service,
        cost: result.cost,
        status: 'active',
        deviceId,
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10分钟
        fromPool: false,
        selectedByAlgorithm: 'manual',
        metadata: { providerResponse: result.raw },
      });

      await this.numberRepo.save(virtualNumber);

      // 6. 发布事件
      await this.eventBus.publish('cloudphone.events', 'sms.number.requested', {
        numberId: virtualNumber.id,
        deviceId,
        service,
        provider: selectedProvider,
        phoneNumber: virtualNumber.phoneNumber,
        cost: virtualNumber.cost,
      });

      this.logger.log(
        `Virtual number requested: ${virtualNumber.phoneNumber} for device ${deviceId}`,
      );

      return virtualNumber;
    } catch (error) {
      this.logger.error(`Failed to request number: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to request virtual number: ${error.message}`);
    }
  }

  /**
   * 获取号码状态
   */
  async getNumberStatus(numberId: string): Promise<VirtualNumber> {
    const number = await this.numberRepo.findOne({ where: { id: numberId } });
    if (!number) {
      throw new NotFoundException(`Virtual number ${numberId} not found`);
    }
    return number;
  }

  /**
   * 取消号码（退款）
   */
  async cancelNumber(numberId: string): Promise<{ refunded: boolean; amount: number }> {
    const number = await this.numberRepo.findOne({ where: { id: numberId } });
    if (!number) {
      throw new NotFoundException(`Virtual number ${numberId} not found`);
    }

    // 只有active或waiting_sms状态才能取消
    if (!['active', 'waiting_sms'].includes(number.status)) {
      throw new BadRequestException(`Cannot cancel number in status: ${number.status}`);
    }

    try {
      // 调用平台API取消
      if (number.provider === 'sms-activate') {
        await this.smsActivate.cancel(number.providerActivationId);
      }

      // 更新状态
      number.status = 'cancelled';
      number.completedAt = new Date();
      await this.numberRepo.save(number);

      // 发布事件
      await this.eventBus.publish('cloudphone.events', 'sms.number.cancelled', {
        numberId,
        deviceId: number.deviceId,
        refunded: true,
        amount: number.cost,
      });

      this.logger.log(`Number ${number.phoneNumber} cancelled and refunded`);

      return { refunded: true, amount: number.cost };
    } catch (error) {
      this.logger.error(`Failed to cancel number ${numberId}`, error.stack);
      throw new BadRequestException(`Failed to cancel number: ${error.message}`);
    }
  }

  /**
   * 批量请求号码
   */
  async batchRequest(
    service: string,
    country: string | undefined,
    deviceIds: string[],
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    numbers: Array<{
      deviceId: string;
      numberId: string | null;
      phoneNumber: string | null;
      error: string | null;
    }>;
  }> {
    if (deviceIds.length > 100) {
      throw new BadRequestException('Maximum batch size is 100');
    }

    const results: Array<{
      deviceId: string;
      numberId: string | null;
      phoneNumber: string | null;
      error: string | null;
    }> = [];

    for (const deviceId of deviceIds) {
      try {
        const number = await this.requestNumber({
          service,
          country,
          deviceId,
        });

        results.push({
          deviceId,
          numberId: number.id,
          phoneNumber: number.phoneNumber,
          error: null,
        });

        // 避免触发限流，每个请求间隔500ms
        await this.sleep(500);
      } catch (error) {
        results.push({
          deviceId,
          numberId: null,
          phoneNumber: null,
          error: error.message,
        });
      }
    }

    const successful = results.filter((r) => r.numberId !== null).length;
    const failed = results.filter((r) => r.numberId === null).length;

    return {
      total: deviceIds.length,
      successful,
      failed,
      numbers: results,
    };
  }

  /**
   * 从号码池获取号码
   */
  private async getFromPool(service: string, country?: string): Promise<NumberPool | null> {
    const serviceCode = this.getServiceCode(service);

    const poolNumber = await this.poolRepo.findOne({
      where: {
        serviceCode,
        countryCode: country || 'RU',
        status: 'available',
      },
      order: {
        priority: 'DESC',
        createdAt: 'ASC',
      },
    });

    if (poolNumber && poolNumber.expiresAt > new Date()) {
      // 标记为已预留
      poolNumber.status = 'reserved';
      poolNumber.reservedAt = new Date();
      poolNumber.reservedCount += 1;
      await this.poolRepo.save(poolNumber);

      this.logger.log(`Pool hit: ${poolNumber.phoneNumber} for ${service}`);
      return poolNumber;
    }

    return null;
  }

  /**
   * 分配池中的号码给设备
   */
  private async assignPooledNumber(
    poolNumber: NumberPool,
    deviceId: string,
  ): Promise<VirtualNumber> {
    const virtualNumber = this.numberRepo.create({
      provider: poolNumber.provider,
      providerActivationId: poolNumber.providerActivationId,
      phoneNumber: poolNumber.phoneNumber,
      countryCode: poolNumber.countryCode,
      serviceCode: poolNumber.serviceCode,
      serviceName: this.getServiceName(poolNumber.serviceCode),
      cost: poolNumber.cost,
      status: 'active',
      deviceId,
      activatedAt: new Date(),
      expiresAt: poolNumber.expiresAt,
      fromPool: true,
      poolId: poolNumber.id,
      metadata: { fromPool: true },
    });

    await this.numberRepo.save(virtualNumber);

    // 更新池状态
    poolNumber.status = 'used';
    poolNumber.usedCount += 1;
    await this.poolRepo.save(poolNumber);

    return virtualNumber;
  }

  /**
   * 服务名 -> 平台代码映射
   */
  private getServiceCode(service: string): string {
    const mapping = {
      google: 'go',
      telegram: 'tg',
      whatsapp: 'wa',
      facebook: 'fb',
      instagram: 'ig',
      twitter: 'tw',
      wechat: 'wx',
      tiktok: 'tk',
      discord: 'ds',
      uber: 'ub',
    };

    return mapping[service.toLowerCase()] || service;
  }

  /**
   * 平台代码 -> 服务名映射
   */
  private getServiceName(code: string): string {
    const mapping = {
      go: 'google',
      tg: 'telegram',
      wa: 'whatsapp',
      fb: 'facebook',
      ig: 'instagram',
      tw: 'twitter',
      wx: 'wechat',
      tk: 'tiktok',
      ds: 'discord',
      ub: 'uber',
    };

    return mapping[code] || code;
  }

  /**
   * 国家名 -> 代码映射
   */
  private getCountryCode(country?: string): number {
    if (!country) return 0; // 默认俄罗斯

    const mapping = {
      RU: 0,
      UA: 1,
      CN: 3,
      IN: 6,
      US: 12,
      GB: 16,
      UK: 16,
    };

    return mapping[country.toUpperCase()] || 0;
  }

  /**
   * 国家代码 -> 名称
   */
  private getCountryName(country?: string): string {
    const mapping: Record<string, string> = {
      RU: 'Russia',
      UA: 'Ukraine',
      CN: 'China',
      IN: 'India',
      US: 'United States',
      GB: 'United Kingdom',
      UK: 'United Kingdom',
    };

    const countryCode = country?.toUpperCase();
    return (countryCode && mapping[countryCode]) || 'Russia';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
