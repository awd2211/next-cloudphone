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
import axios from 'axios';
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
   * 获取供应商的解密配置（用于编辑）
   * 注意：此端点返回敏感信息，仅供编辑表单使用
   */
  @Get(':id/config')
  @ApiOperation({ summary: '获取供应商的解密配置（用于编辑）' })
  @ApiResponse({
    status: 200,
    description: '成功返回解密的供应商配置',
  })
  @ApiResponse({ status: 404, description: '供应商配置不存在' })
  async getProviderConfig(@Param('id') id: string): Promise<Record<string, any>> {
    this.logger.log(`Fetching decrypted config for provider: ${id}`);
    return this.providerConfigService.getProviderConfig(id);
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
        case 'kookeey':
          testResult = await this.testKookeeyConnection(config);
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
   *
   * 官方文档: https://docs.brightdata.com/proxy-networks/config-options
   * 代理端点: brd.superproxy.io:33335
   * 用户名格式: brd-customer-{id}-zone-{zone} (用户在控制台获取完整用户名)
   *
   * 使用 axios + HttpsProxyAgent 替代 fetch (Node.js fetch 不支持 agent 选项)
   */
  private async testBrightDataConnection(config: any): Promise<{
    success: boolean;
    proxyCount?: number;
    message?: string;
  }> {
    try {
      const { HttpsProxyAgent } = await import('https-proxy-agent');

      // BrightData 超级代理端点 (官方文档: 33335)
      const host = 'brd.superproxy.io';
      const port = 33335;

      // 用户名应该已经是完整格式: brd-customer-xxx-zone-xxx
      const username = config.username;
      const password = config.password;

      const proxyUrl = `http://${username}:${password}@${host}:${port}`;
      this.logger.log(`Testing BrightData proxy: ${host}:${port}`);

      const agent = new HttpsProxyAgent(proxyUrl);

      const response = await axios.get('https://api.ipify.org?format=json', {
        httpsAgent: agent,
        timeout: 15000,
      });

      return {
        success: true,
        message: `Connected successfully via Bright Data. Proxy IP: ${response.data.ip}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Bright Data connection failed: ${error.message}`,
      };
    }
  }

  /**
   * 测试Oxylabs连接
   *
   * Oxylabs 代理端点：
   * - 住宅代理: pr.oxylabs.io:7777
   * - 数据中心: dc.oxylabs.io:8001
   * - 用户名需要 customer- 前缀
   */
  private async testOxylabsConnection(config: any): Promise<{
    success: boolean;
    proxyCount?: number;
    message?: string;
  }> {
    try {
      const { HttpsProxyAgent } = await import('https-proxy-agent');

      // 确定代理类型和端点
      const proxyType = config.proxyType || 'residential';
      const host = proxyType === 'residential' ? 'pr.oxylabs.io' : 'dc.oxylabs.io';
      const port = proxyType === 'residential' ? 7777 : 8001;

      // 构建用户名（需要 customer- 前缀）
      let username = config.username;
      if (!username.startsWith('customer-')) {
        username = `customer-${username}`;
      }

      const proxyUrl = `http://${username}:${config.password}@${host}:${port}`;
      const agent = new HttpsProxyAgent(proxyUrl);

      const response = await axios.get('https://api.ipify.org?format=json', {
        httpsAgent: agent,
        timeout: 15000,
      });

      return {
        success: true,
        message: `Connected successfully via Oxylabs (${proxyType}). Proxy IP: ${response.data.ip}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Oxylabs connection failed: ${error.message}`,
      };
    }
  }

  /**
   * 测试IPRoyal连接
   *
   * 官方文档: https://docs.iproyal.com/proxies/residential/proxy
   * 代理端点: geo.iproyal.com:12321
   *
   * 认证格式 (网关模式):
   * - 用户名: 账户用户名
   * - 密码: password_country-xx_city-xx_session-xxxxxxxx_lifetime-10m
   *
   * 注意: 位置参数在密码中传递，不是用户名
   */
  private async testIPRoyalConnection(config: any): Promise<{
    success: boolean;
    proxyCount?: number;
    message?: string;
  }> {
    try {
      const { HttpsProxyAgent } = await import('https-proxy-agent');

      // IPRoyal 网关端点
      const host = 'geo.iproyal.com';
      const port = 12321;

      const username = config.username;
      // 密码可能已包含参数，直接使用
      const password = config.password;

      const proxyUrl = `http://${username}:${password}@${host}:${port}`;
      this.logger.log(`Testing IPRoyal proxy: ${host}:${port}`);

      const agent = new HttpsProxyAgent(proxyUrl);

      const response = await axios.get('https://api.ipify.org?format=json', {
        httpsAgent: agent,
        timeout: 15000,
      });

      return {
        success: true,
        message: `Connected successfully via IPRoyal. Proxy IP: ${response.data.ip}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `IPRoyal connection failed: ${error.message}`,
      };
    }
  }

  /**
   * 测试 SmartProxy (Decodo) 连接
   *
   * SmartProxy 已更名为 Decodo，使用网关模式:
   * - 端点: gate.decodo.com:7000
   * - 用户名格式: user-{username}-country-{cc}
   *
   * 官方文档: https://help.decodo.com/docs/residential-proxy-quick-start
   *
   * 配置参数:
   * - username: 代理用户名
   * - password: 代理密码
   * - defaultCountry (可选): 默认国家代码
   */
  private async testSmartProxyConnection(config: any): Promise<{
    success: boolean;
    proxyCount?: number;
    message?: string;
  }> {
    try {
      const { HttpsProxyAgent } = await import('https-proxy-agent');

      // SmartProxy 网关端点 (现更名为 Decodo)
      const host = 'gate.decodo.com';
      const port = 7000;

      // 构建用户名 (格式: user-{username})
      let username = config.username || '';
      if (!username.startsWith('user-')) {
        username = `user-${username}`;
      }

      const proxyUrl = `http://${username}:${config.password}@${host}:${port}`;
      this.logger.log(`Testing SmartProxy proxy: ${host}:${port}`);

      const agent = new HttpsProxyAgent(proxyUrl);

      const response = await axios.get('https://api.ipify.org?format=json', {
        httpsAgent: agent,
        timeout: 15000,
      });

      return {
        success: true,
        message: `Connected successfully via SmartProxy (Decodo). Proxy IP: ${response.data.ip}`,
      };
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
      this.logger.log(`Testing IPIDEA proxy: ${gateway}:${port} with user ${username}`);

      const agent = new HttpsProxyAgent(proxyUrl);

      const response = await axios.get('https://api.ipify.org?format=json', {
        httpsAgent: agent,
        timeout: 15000, // IPIDEA 可能需要更长时间
      });

      return {
        success: true,
        message: `Connected successfully via IPIDEA. Proxy IP: ${response.data.ip}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `IPIDEA connection failed: ${error.message}`,
      };
    }
  }

  /**
   * 测试Kookeey (KKOIP) 连接
   *
   * Kookeey 代理格式:
   * {gateway}:{port}:{accountId}-{username}:{password}-{country}-{sessionId}-{duration}
   * 示例: gate-hk.kkoip.com:18705:2375007-cfa06e52:24e06433-US-80067216-5m
   *
   * 配置参数:
   * - gateway: 代理网关地址 (如: gate-hk.kkoip.com)
   * - port: 代理端口 (默认 18705)
   * - accountId: 账号 ID
   * - username: 认证用户名
   * - password: 认证密码
   */
  private async testKookeeyConnection(config: any): Promise<{
    success: boolean;
    proxyCount?: number;
    message?: string;
  }> {
    try {
      const { HttpsProxyAgent } = await import('https-proxy-agent');

      // Kookeey 代理配置
      const gateway = config.gateway || 'gate-hk.kkoip.com';
      const port = config.port || 18705;
      const accountId = config.accountId || '';
      const username = config.username || '';
      const password = config.password || '';

      if (!accountId || !username || !password) {
        return {
          success: false,
          message: 'Missing required Kookeey config: accountId, username, or password',
        };
      }

      // 构建代理认证用户名: {accountId}-{username}
      const proxyUser = `${accountId}-${username}`;

      // 构建代理认证密码: {password}-{country}-{sessionId}-{duration}
      const country = 'US'; // 测试时使用美国 IP
      const sessionId = Math.random().toString(36).substring(2, 10);
      const duration = '5m'; // 5分钟会话
      const proxyPass = `${password}-${country}-${sessionId}-${duration}`;

      const proxyUrl = `http://${proxyUser}:${proxyPass}@${gateway}:${port}`;
      this.logger.log(`Testing Kookeey proxy: ${gateway}:${port} with user ${proxyUser}`);

      const agent = new HttpsProxyAgent(proxyUrl);

      const response = await axios.get('https://api.ipify.org?format=json', {
        httpsAgent: agent,
        timeout: 15000, // 15秒超时
      });

      return {
        success: true,
        message: `Connected successfully via Kookeey. Proxy IP: ${response.data.ip}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Kookeey connection failed: ${error.message}`,
      };
    }
  }
}
