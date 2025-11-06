import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProxyProvider } from '../../entities/proxy-provider.entity';
import {
  CreateProxyProviderDto,
  UpdateProxyProviderDto,
  ProxyProviderResponseDto,
  TestProviderConnectionDto,
} from '../dto/provider-config.dto';
import * as crypto from 'crypto';

/**
 * 代理供应商配置管理Controller
 *
 * 功能：
 * - 创建、查询、更新、删除代理供应商配置
 * - 配置信息加密存储
 * - 连接测试和性能监控
 */
@ApiTags('代理供应商配置管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('proxy/providers')
export class ProxyProviderConfigController {
  private readonly logger = new Logger(ProxyProviderConfigController.name);
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(ProxyProvider)
    private readonly providerRepo: Repository<ProxyProvider>,
  ) {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    if (this.encryptionKey === 'default-key-change-in-production') {
      this.logger.warn('Using default encryption key! Please set ENCRYPTION_KEY in production!');
    }
  }

  /**
   * 获取所有代理供应商配置
   */
  @Get()
  @ApiOperation({ summary: '获取所有代理供应商配置列表' })
  @ApiResponse({
    status: 200,
    description: '成功返回供应商配置列表',
    type: [ProxyProviderResponseDto],
  })
  async getAllProviders(): Promise<ProxyProviderResponseDto[]> {
    const providers = await this.providerRepo.find({
      order: { priority: 'DESC', createdAt: 'DESC' },
    });

    return providers.map((provider) => this.toResponseDto(provider));
  }

  /**
   * 根据ID获取供应商配置
   */
  @Get(':id')
  @ApiOperation({ summary: '根据ID获取代理供应商配置详情' })
  @ApiResponse({
    status: 200,
    description: '成功返回供应商配置详情',
    type: ProxyProviderResponseDto,
  })
  @ApiResponse({ status: 404, description: '供应商配置不存在' })
  async getProviderById(@Param('id') id: string): Promise<ProxyProviderResponseDto> {
    const provider = await this.providerRepo.findOne({ where: { id } });

    if (!provider) {
      throw new NotFoundException(`Proxy provider with ID ${id} not found`);
    }

    return this.toResponseDto(provider);
  }

  /**
   * 创建新的代理供应商配置
   */
  @Post()
  @ApiOperation({ summary: '创建新的代理供应商配置' })
  @ApiResponse({
    status: 201,
    description: '供应商配置创建成功',
    type: ProxyProviderResponseDto,
  })
  @ApiResponse({ status: 409, description: '供应商名称已存在' })
  async createProvider(
    @Body() createDto: CreateProxyProviderDto,
  ): Promise<ProxyProviderResponseDto> {
    // 检查供应商名称是否已存在
    const existing = await this.providerRepo.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException(`Provider with name ${createDto.name} already exists`);
    }

    // 加密配置信息
    const encryptedConfig = this.encryptConfig(createDto.config);

    // 创建新配置
    const newProvider = this.providerRepo.create({
      ...createDto,
      config: encryptedConfig,
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      successRate: 0,
      avgLatencyMs: 0,
    });

    const saved = await this.providerRepo.save(newProvider);
    this.logger.log(`Created new proxy provider: ${saved.name} (ID: ${saved.id})`);

    return this.toResponseDto(saved);
  }

  /**
   * 更新供应商配置
   */
  @Put(':id')
  @ApiOperation({ summary: '更新代理供应商配置' })
  @ApiResponse({
    status: 200,
    description: '供应商配置更新成功',
    type: ProxyProviderResponseDto,
  })
  @ApiResponse({ status: 404, description: '供应商配置不存在' })
  async updateProvider(
    @Param('id') id: string,
    @Body() updateDto: UpdateProxyProviderDto,
  ): Promise<ProxyProviderResponseDto> {
    const provider = await this.providerRepo.findOne({ where: { id } });

    if (!provider) {
      throw new NotFoundException(`Proxy provider with ID ${id} not found`);
    }

    // 如果更新配置，需要重新加密
    if (updateDto.config) {
      updateDto.config = this.encryptConfig(updateDto.config);
    }

    // 更新配置
    Object.assign(provider, updateDto);
    const updated = await this.providerRepo.save(provider);

    this.logger.log(`Updated proxy provider: ${updated.name} (ID: ${updated.id})`);

    return this.toResponseDto(updated);
  }

  /**
   * 删除供应商配置
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除代理供应商配置' })
  @ApiResponse({ status: 204, description: '供应商配置删除成功' })
  @ApiResponse({ status: 404, description: '供应商配置不存在' })
  async deleteProvider(@Param('id') id: string): Promise<void> {
    const provider = await this.providerRepo.findOne({ where: { id } });

    if (!provider) {
      throw new NotFoundException(`Proxy provider with ID ${id} not found`);
    }

    await this.providerRepo.remove(provider);
    this.logger.log(`Deleted proxy provider: ${provider.name} (ID: ${id})`);
  }

  /**
   * 启用/禁用供应商
   */
  @Put(':id/toggle')
  @ApiOperation({ summary: '启用或禁用代理供应商' })
  @ApiResponse({
    status: 200,
    description: '供应商状态切换成功',
    type: ProxyProviderResponseDto,
  })
  @ApiResponse({ status: 404, description: '供应商配置不存在' })
  async toggleProvider(@Param('id') id: string): Promise<ProxyProviderResponseDto> {
    const provider = await this.providerRepo.findOne({ where: { id } });

    if (!provider) {
      throw new NotFoundException(`Proxy provider with ID ${id} not found`);
    }

    provider.enabled = !provider.enabled;
    const updated = await this.providerRepo.save(provider);

    this.logger.log(
      `Toggled proxy provider ${updated.name}: ${updated.enabled ? 'enabled' : 'disabled'}`,
    );

    return this.toResponseDto(updated);
  }

  /**
   * 测试供应商连接
   */
  @Post(':id/test')
  @ApiOperation({ summary: '测试代理供应商连接' })
  @ApiResponse({ status: 200, description: '连接测试成功' })
  @ApiResponse({ status: 404, description: '供应商配置不存在' })
  async testProvider(
    @Param('id') id: string,
    @Body() testDto: TestProviderConnectionDto = {},
  ): Promise<{
    success: boolean;
    message: string;
    latency?: number;
    proxyCount?: number;
  }> {
    const provider = await this.providerRepo.findOne({ where: { id } });

    if (!provider) {
      throw new NotFoundException(`Proxy provider with ID ${id} not found`);
    }

    this.logger.log(`Testing connection for proxy provider: ${provider.name}`);

    const startTime = Date.now();

    try {
      // 解密配置
      const config = this.decryptConfig(provider.config);

      // 根据供应商类型进行测试
      let testResult: { success: boolean; proxyCount?: number; message?: string };

      switch (provider.type) {
        case 'brightdata':
          testResult = await this.testBrightDataConnection(config);
          break;
        case 'oxylabs':
          testResult = await this.testOxylabsConnection(config);
          break;
        case 'iproyal':
          testResult = await this.testIPRoyalConnection(config);
          break;
        case 'smartproxy':
          testResult = await this.testSmartProxyConnection(config);
          break;
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      const latency = Date.now() - startTime;

      return {
        success: testResult.success,
        message: testResult.message || `Successfully connected to ${provider.name}`,
        latency,
        proxyCount: testResult.proxyCount,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error(`Connection test failed for ${provider.name}: ${error.message}`);

      return {
        success: false,
        message: error.message || 'Connection test failed',
        latency,
      };
    }
  }

  /**
   * 测试Bright Data连接
   */
  private async testBrightDataConnection(config: any): Promise<{
    success: boolean;
    proxyCount?: number;
    message?: string;
  }> {
    try {
      // 测试代理连接：通过代理访问ipify API获取IP
      const proxyUrl = `http://${config.username}:${config.password}@${config.zone || 'brd-customer-hl_xxxxx'}.zproxy.lum-superproxy.io:22225`;

      const https = await import('https');
      const { HttpsProxyAgent } = await import('https-proxy-agent');

      const agent = new HttpsProxyAgent(proxyUrl);

      const response = await fetch('https://api.ipify.org?format=json', {
        // @ts-ignore
        agent,
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Connected successfully. Proxy IP: ${data.ip}`,
          proxyCount: undefined, // Bright Data不直接返回代理数量
        };
      } else {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * 测试Oxylabs连接
   */
  private async testOxylabsConnection(config: any): Promise<{
    success: boolean;
    proxyCount?: number;
    message?: string;
  }> {
    try {
      const { HttpsProxyAgent } = await import('https-proxy-agent');

      const proxyUrl = `http://${config.username}:${config.password}@pr.oxylabs.io:7777`;
      const agent = new HttpsProxyAgent(proxyUrl);

      const response = await fetch('https://api.ipify.org?format=json', {
        // @ts-ignore
        agent,
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Connected successfully. Proxy IP: ${data.ip}`,
        };
      } else {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * 测试IPRoyal连接
   */
  private async testIPRoyalConnection(config: any): Promise<{
    success: boolean;
    proxyCount?: number;
    message?: string;
  }> {
    try {
      const { HttpsProxyAgent } = await import('https-proxy-agent');

      const proxyUrl = `http://${config.username}:${config.password}@geo.iproyal.com:12321`;
      const agent = new HttpsProxyAgent(proxyUrl);

      const response = await fetch('https://api.ipify.org?format=json', {
        // @ts-ignore
        agent,
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Connected successfully. Proxy IP: ${data.ip}`,
        };
      } else {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * 测试SmartProxy连接
   */
  private async testSmartProxyConnection(config: any): Promise<{
    success: boolean;
    proxyCount?: number;
    message?: string;
  }> {
    try {
      const { HttpsProxyAgent } = await import('https-proxy-agent');

      const proxyUrl = `http://${config.username}:${config.password}@gate.smartproxy.com:7000`;
      const agent = new HttpsProxyAgent(proxyUrl);

      const response = await fetch('https://api.ipify.org?format=json', {
        // @ts-ignore
        agent,
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Connected successfully. Proxy IP: ${data.ip}`,
        };
      } else {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * 重置供应商统计数据
   */
  @Post(':id/reset-stats')
  @ApiOperation({ summary: '重置代理供应商统计数据' })
  @ApiResponse({ status: 200, description: '统计数据重置成功' })
  @ApiResponse({ status: 404, description: '供应商配置不存在' })
  async resetStats(@Param('id') id: string): Promise<ProxyProviderResponseDto> {
    const provider = await this.providerRepo.findOne({ where: { id } });

    if (!provider) {
      throw new NotFoundException(`Proxy provider with ID ${id} not found`);
    }

    provider.totalRequests = 0;
    provider.successRequests = 0;
    provider.failedRequests = 0;
    provider.successRate = 0;
    provider.avgLatencyMs = 0;

    const updated = await this.providerRepo.save(provider);
    this.logger.log(`Reset statistics for proxy provider: ${provider.name}`);

    return this.toResponseDto(updated);
  }

  /**
   * 转换为响应DTO
   */
  private toResponseDto(provider: ProxyProvider): ProxyProviderResponseDto {
    return {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      enabled: provider.enabled,
      priority: provider.priority,
      costPerGB: Number(provider.costPerGB),
      totalRequests: provider.totalRequests,
      successRequests: provider.successRequests,
      failedRequests: provider.failedRequests,
      successRate: Number(provider.successRate),
      avgLatencyMs: provider.avgLatencyMs,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      hasConfig: !!provider.config && Object.keys(provider.config).length > 0,
    };
  }

  /**
   * 加密配置信息
   */
  private encryptConfig(config: Record<string, any>): Record<string, any> {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const jsonString = JSON.stringify(config);
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted: true,
      data: `${iv.toString('hex')}:${encrypted}`,
    };
  }

  /**
   * 解密配置信息（内部使用）
   */
  private decryptConfig(encryptedConfig: Record<string, any>): Record<string, any> {
    if (!encryptedConfig.encrypted || !encryptedConfig.data) {
      return encryptedConfig;
    }

    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

    const parts = encryptedConfig.data.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}
