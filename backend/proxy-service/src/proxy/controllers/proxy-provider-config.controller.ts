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
import { ProxyProviderConfigService } from '../services/proxy-provider-config.service';

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

  constructor(
    private readonly providerConfigService: ProxyProviderConfigService,
    @InjectRepository(ProxyProvider)
    private readonly providerRepo: Repository<ProxyProvider>,
  ) {}

  /**
   * 获取所有代理供应商配置
   * ✅ 使用 Service 层缓存优化
   */
  @Get()
  @ApiOperation({ summary: '获取所有代理供应商配置列表' })
  @ApiResponse({
    status: 200,
    description: '成功返回供应商配置列表',
    type: [ProxyProviderResponseDto],
  })
  async getAllProviders(): Promise<ProxyProviderResponseDto[]> {
    return this.providerConfigService.getAllProviders();
  }

  /**
   * 获取提供商排名 (前端兼容别名)
   * 注意：必须放在 :id 参数路由之前
   */
  @Get('ranking')
  @ApiOperation({ summary: '获取提供商排名' })
  @ApiResponse({
    status: 200,
    description: '返回提供商排名列表',
  })
  async getProviderRanking(): Promise<any> {
    // 返回前端兼容的静态响应
    return {
      success: true,
      data: [],
      message: 'Success',
    };
  }

  /**
   * 获取提供商排名(rankings路径)
   * 注意：必须放在 :id 参数路由之前
   */
  @Get('rankings')
  @ApiOperation({ summary: '获取提供商排名列表' })
  @ApiResponse({
    status: 200,
    description: '返回提供商排名列表',
  })
  async getProviderRankings(): Promise<any> {
    // 返回前端兼容的静态响应
    return {
      success: true,
      data: [],
      message: 'Success',
    };
  }

  /**
   * 获取提供商统计
   * 注意：必须放在 :id 参数路由之前
   */
  @Get('statistics')
  @ApiOperation({ summary: '获取提供商统计信息' })
  @ApiResponse({
    status: 200,
    description: '返回提供商统计信息',
  })
  async getProviderStatistics(): Promise<any> {
    // 返回前端兼容的静态响应
    return {
      success: true,
      data: {
        totalProviders: 0,
        avgTotalScore: 0,
        highestScore: 0,
        lowestScore: 0,
        scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
        marketShare: {},
      },
      message: 'Success',
    };
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
    return this.providerConfigService.getProviderById(id);
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
    return this.providerConfigService.createProvider(createDto);
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
    return this.providerConfigService.updateProvider(id, updateDto);
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
    return this.providerConfigService.deleteProvider(id);
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
    return this.providerConfigService.toggleProvider(id);
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
    // 先获取提供商信息
    const providerDto = await this.providerConfigService.getProviderById(id);

    // 获取完整的 provider entity (包含加密配置)
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Proxy provider with ID ${id} not found`);
    }

    this.logger.log(`Testing connection for proxy provider: ${providerDto.name}`);

    const startTime = Date.now();

    try {
      // 使用 Service 解密配置
      const config = this.providerConfigService.decryptConfig(provider.config);

      // 根据供应商类型进行测试
      let testResult: { success: boolean; proxyCount?: number; message?: string };

      switch (providerDto.type) {
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
        case 'ipidea':
          testResult = await this.testIPIDEAConnection(config);
          break;
        default:
          throw new Error(`Unsupported provider type: ${providerDto.type}`);
      }

      const latency = Date.now() - startTime;

      return {
        success: testResult.success,
        message: testResult.message || `Successfully connected to ${providerDto.name}`,
        latency,
        proxyCount: testResult.proxyCount,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error(`Connection test failed for ${providerDto.name}: ${error.message}`);

      return {
        success: false,
        message: error.message || 'Connection test failed',
        latency,
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
    return this.providerConfigService.resetStats(id);
  }

  // 测试连接的私有方法保留在 Controller 中（这些是 HTTP 连接逻辑，不是业务逻辑）

  /**
   * 测试Bright Data连接
   */
  private async testBrightDataConnection(config: any): Promise<{
    success: boolean;
    proxyCount?: number;
    message?: string;
  }> {
    try {
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
          proxyCount: undefined,
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
   * 测试IPIDEA连接 (家宽代理)
   *
   * IPIDEA 使用隧道代理模式，用户名格式为:
   * {account}-zone-custom-region-{country}-st-{state}-city-{city}
   *
   * 配置参数:
   * - gateway: 用户专属网关地址 (如: e255c08e04856698.lqz.na.ipidea.online)
   * - port: 代理端口 (默认 2336)
   * - username: 认证用户名
   * - password: 认证密码
   */
  private async testIPIDEAConnection(config: any): Promise<{
    success: boolean;
    proxyCount?: number;
    message?: string;
  }> {
    try {
      const { HttpsProxyAgent } = await import('https-proxy-agent');

      // IPIDEA 隧道代理配置
      const gateway = config.gateway || 'proxy.ipidea.net';
      const port = config.port || 2336;

      // 构建用户名 (基础格式)
      let username = config.username || '';
      if (!username.includes('-zone-custom')) {
        username += '-zone-custom';
      }

      const proxyUrl = `http://${username}:${config.password}@${gateway}:${port}`;
      const agent = new HttpsProxyAgent(proxyUrl);

      const response = await fetch('https://api.ipify.org?format=json', {
        // @ts-ignore
        agent,
        signal: AbortSignal.timeout(15000), // IPIDEA 可能需要更长时间
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Connected successfully via IPIDEA. Proxy IP: ${data.ip}`,
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
        message: `IPIDEA connection failed: ${error.message}`,
      };
    }
  }
}
