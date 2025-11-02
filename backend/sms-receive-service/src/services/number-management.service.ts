import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualNumber, ProviderConfig, NumberPool } from '../entities';
import { PlatformSelectorService } from './platform-selector.service';
import { EventBusService } from '@cloudphone/shared';
import { ProviderError } from '../providers/provider.interface';

interface RequestNumberDto {
  service: string;
  country?: string;
  deviceId: string;
  provider?: string;
  usePool?: boolean;
  forceProvider?: boolean;
}

/**
 * 虚拟号码管理服务
 */
@Injectable()
export class NumberManagementService {
  private readonly logger = new Logger(NumberManagementService.name);
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(
    @InjectRepository(VirtualNumber)
    private readonly numberRepo: Repository<VirtualNumber>,
    @InjectRepository(ProviderConfig)
    private readonly providerRepo: Repository<ProviderConfig>,
    @InjectRepository(NumberPool)
    private readonly poolRepo: Repository<NumberPool>,
    private readonly platformSelector: PlatformSelectorService,
    private readonly eventBus: EventBusService,
  ) {}

  async requestNumber(dto: RequestNumberDto): Promise<VirtualNumber> {
    const { service, country, deviceId, provider, usePool, forceProvider } = dto;

    this.logger.log(`Request number for ${service}/${country || 'default'} by device ${deviceId}`);

    if (usePool) {
      const pooledNumber = await this.getFromPool(service, country);
      if (pooledNumber) {
        this.logger.log(`Pool hit: ${pooledNumber.phoneNumber}`);
        return await this.assignPooledNumber(pooledNumber, deviceId);
      }
      this.logger.log(`Pool miss for ${service}/${country}, buying new number`);
    }

    let selectedPlatform;
    let selectionMethod = 'manual';

    if (forceProvider && provider) {
      selectedPlatform = { providerName: provider, fallbackLevel: 0 };
      selectionMethod = 'forced';
      this.logger.log(`Force using provider: ${provider}`);
    } else if (provider) {
      selectedPlatform = { providerName: provider, fallbackLevel: 0 };
      selectionMethod = 'manual-with-fallback';
      this.logger.log(`Prefer provider: ${provider} (with fallback)`);
    } else {
      selectedPlatform = await this.platformSelector.selectBestPlatform(service, country || 'RU');
      selectionMethod = 'smart-routing';
      this.logger.log(`Smart routing selected: ${selectedPlatform.providerName} (score=${selectedPlatform.score.toFixed(2)})`);
    }

    return await this.requestNumberWithRetry(selectedPlatform.providerName, service, country, deviceId, selectionMethod, 0);
  }

  private async requestNumberWithRetry(
    providerName: string,
    service: string,
    country: string | undefined,
    deviceId: string,
    selectionMethod: string,
    attempt: number,
  ): Promise<VirtualNumber> {
    const startTime = Date.now();

    try {
      const selection = await this.platformSelector.selectBestPlatform(service, country || 'RU');
      const provider = selection.provider;
      const serviceCode = this.getServiceCode(service);
      const countryCode = country || 'RU';

      this.logger.log(`Attempting to get number from ${providerName} (attempt ${attempt + 1}/${this.MAX_RETRY_ATTEMPTS})`);

      const result = await provider.getNumber(serviceCode, countryCode);
      const responseTime = Date.now() - startTime;

      await this.platformSelector.recordSuccess(providerName, responseTime, result.cost);

      const virtualNumber = this.numberRepo.create({
        provider: providerName,
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
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        fromPool: false,
        selectedByAlgorithm: selectionMethod,
        metadata: {
          providerResponse: result.raw,
          selectionDetails: {
            method: selectionMethod,
            providerName,
            score: selection.score,
            reason: selection.reason,
            fallbackLevel: selection.fallbackLevel,
            responseTime,
          },
        },
      });

      await this.numberRepo.save(virtualNumber);

      await this.eventBus.publish('cloudphone.events', 'sms.number.requested', {
        numberId: virtualNumber.id,
        deviceId,
        service,
        provider: providerName,
        phoneNumber: virtualNumber.phoneNumber,
        cost: virtualNumber.cost,
        selectionMethod,
        responseTime,
      });

      this.logger.log(`Successfully obtained number ${virtualNumber.phoneNumber} from ${providerName} in ${responseTime}ms`);

      return virtualNumber;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Failed to get number from ${providerName} (attempt ${attempt + 1}): ${error.message}`);

      await this.platformSelector.recordFailure(providerName, error);

      const canRetry = attempt < this.MAX_RETRY_ATTEMPTS - 1;
      const isRetryableError = error instanceof ProviderError && error.retryable;

      if (canRetry && isRetryableError) {
        this.logger.log(`Retrying with fallback platform (attempt ${attempt + 2}/${this.MAX_RETRY_ATTEMPTS})`);
        const fallbackSelection = await this.platformSelector.selectBestPlatform(service, country || 'RU');
        return await this.requestNumberWithRetry(fallbackSelection.providerName, service, country, deviceId, `${selectionMethod}-fallback-${attempt + 1}`, attempt + 1);
      }

      throw new BadRequestException(`Failed to request virtual number after ${attempt + 1} attempts: ${error.message}`);
    }
  }

  async getNumberStatus(numberId: string): Promise<VirtualNumber> {
    const number = await this.numberRepo.findOne({ where: { id: numberId } });
    if (!number) {
      throw new NotFoundException(`Virtual number ${numberId} not found`);
    }
    return number;
  }

  async cancelNumber(numberId: string): Promise<{ refunded: boolean; amount: number }> {
    const number = await this.numberRepo.findOne({ where: { id: numberId } });
    if (!number) {
      throw new NotFoundException(`Virtual number ${numberId} not found`);
    }

    if (!['active', 'waiting_sms'].includes(number.status)) {
      throw new BadRequestException(`Cannot cancel number in status: ${number.status}`);
    }

    try {
      const selection = await this.platformSelector.selectBestPlatform(number.serviceName, number.countryCode);
      await selection.provider.cancel(number.providerActivationId);

      number.status = 'cancelled';
      number.completedAt = new Date();
      await this.numberRepo.save(number);

      await this.eventBus.publish('cloudphone.events', 'sms.number.cancelled', {
        numberId,
        deviceId: number.deviceId,
        provider: number.provider,
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

  async batchRequest(
    service: string,
    country: string | undefined,
    deviceIds: string[],
    provider?: string,
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    numbers: Array<{
      deviceId: string;
      numberId: string | null;
      phoneNumber: string | null;
      provider: string | null;
      error: string | null;
    }>;
  }> {
    if (deviceIds.length > 100) {
      throw new BadRequestException('Maximum batch size is 100');
    }

    this.logger.log(`Batch request for ${deviceIds.length} devices (${service}/${country})`);

    const results: Array<{
      deviceId: string;
      numberId: string | null;
      phoneNumber: string | null;
      provider: string | null;
      error: string | null;
    }> = [];

    for (const deviceId of deviceIds) {
      try {
        const number = await this.requestNumber({ service, country, deviceId, provider });
        results.push({
          deviceId,
          numberId: number.id,
          phoneNumber: number.phoneNumber,
          provider: number.provider,
          error: null,
        });
        await this.sleep(500);
      } catch (error) {
        results.push({
          deviceId,
          numberId: null,
          phoneNumber: null,
          provider: null,
          error: error.message,
        });
        this.logger.warn(`Failed to request number for device ${deviceId}: ${error.message}`);
      }
    }

    const successful = results.filter((r) => r.numberId !== null).length;
    const failed = results.filter((r) => r.numberId === null).length;

    this.logger.log(`Batch request completed: ${successful} successful, ${failed} failed`);

    return {
      total: deviceIds.length,
      successful,
      failed,
      numbers: results,
    };
  }

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
      poolNumber.status = 'reserved';
      poolNumber.reservedAt = new Date();
      poolNumber.reservedCount += 1;
      await this.poolRepo.save(poolNumber);

      this.logger.log(`Pool hit: ${poolNumber.phoneNumber} for ${service}`);
      return poolNumber;
    }

    return null;
  }

  private async assignPooledNumber(poolNumber: NumberPool, deviceId: string): Promise<VirtualNumber> {
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
      selectedByAlgorithm: 'pool',
      metadata: { fromPool: true, poolId: poolNumber.id },
    });

    await this.numberRepo.save(virtualNumber);

    poolNumber.status = 'used';
    poolNumber.usedCount += 1;
    await this.poolRepo.save(poolNumber);

    await this.eventBus.publish('cloudphone.events', 'sms.number.from_pool', {
      numberId: virtualNumber.id,
      deviceId,
      poolId: poolNumber.id,
      phoneNumber: virtualNumber.phoneNumber,
    });

    return virtualNumber;
  }

  private getServiceCode(service: string): string {
    const mapping: Record<string, string> = {
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
      amazon: 'am',
      microsoft: 'mm',
    };
    return mapping[service.toLowerCase()] || service;
  }

  private getServiceName(code: string): string {
    const mapping: Record<string, string> = {
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
      am: 'amazon',
      mm: 'microsoft',
    };
    return mapping[code] || code;
  }

  private getCountryName(country?: string): string {
    const mapping: Record<string, string> = {
      RU: 'Russia',
      UA: 'Ukraine',
      CN: 'China',
      IN: 'India',
      US: 'United States',
      GB: 'United Kingdom',
      UK: 'United Kingdom',
      FR: 'France',
      DE: 'Germany',
      PH: 'Philippines',
      ID: 'Indonesia',
      VN: 'Vietnam',
      MY: 'Malaysia',
    };
    const countryCode = country?.toUpperCase();
    return (countryCode && mapping[countryCode]) || 'Russia';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
