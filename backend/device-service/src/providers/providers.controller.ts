import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Logger,
  ParseEnumPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { DeviceProviderType } from './provider.types';
import {
  QueryCloudSyncDto,
  TriggerCloudSyncDto,
  UpdateProviderConfigDto,
  CloudBillingReconciliationDto,
  ListProviderConfigsDto,
  CreateProviderConfigDto,
  UpdateProviderConfigByIdDto,
} from './dto/provider.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * 提供商管理控制器
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class ProvidersController {
  private readonly logger = new Logger(ProvidersController.name);

  constructor(private readonly providersService: ProvidersService) {}

  /**
   * 获取所有提供商规格
   * GET /devices/providers/specs
   */
  @Get('devices/providers/specs')
  async getAllProviderSpecs() {
    this.logger.log('Fetching all provider specs');
    const specs = await this.providersService.getAllProviderSpecs();
    return { data: specs };
  }

  /**
   * 获取指定提供商的规格列表
   * GET /devices/providers/:provider/specs
   */
  @Get('devices/providers/:provider/specs')
  async getProviderSpecsByType(
    @Param('provider', new ParseEnumPipe(DeviceProviderType)) provider: DeviceProviderType,
  ) {
    this.logger.log(`Fetching specs for provider: ${provider}`);
    const specs = await this.providersService.getProviderSpecsByType(provider);
    return { data: specs };
  }

  /**
   * 获取云设备同步状态
   * GET /devices/cloud/sync-status
   */
  @Get('devices/cloud/sync-status')
  async getCloudSyncStatus(@Query() query: QueryCloudSyncDto) {
    this.logger.log(`Fetching cloud sync status with filters: ${JSON.stringify(query)}`);
    return this.providersService.getCloudSyncStatus(query);
  }

  /**
   * 手动触发云设备同步
   * POST /devices/cloud/sync
   */
  @Post('devices/cloud/sync')
  async triggerCloudSync(@Body() dto: TriggerCloudSyncDto) {
    this.logger.log(`Triggering cloud sync for provider: ${dto.provider || 'all'}`);
    return this.providersService.triggerCloudSync(dto.provider);
  }

  /**
   * 获取提供商健康状态
   * GET /devices/providers/health
   */
  @Get('devices/providers/health')
  async getProviderHealth() {
    this.logger.log('Fetching provider health status');
    const healthStatus = await this.providersService.getProviderHealth();
    return healthStatus;
  }

  /**
   * 获取提供商配置（管理端）
   * GET /admin/providers/:provider/config
   */
  @Get('admin/providers/:provider/config')
  async getProviderConfig(
    @Param('provider', new ParseEnumPipe(DeviceProviderType)) provider: DeviceProviderType,
  ) {
    this.logger.log(`Fetching config for provider: ${provider}`);
    return this.providersService.getProviderConfig(provider);
  }

  /**
   * 更新提供商配置（管理端）
   * PUT /admin/providers/:provider/config
   */
  @Put('admin/providers/:provider/config')
  async updateProviderConfig(
    @Param('provider', new ParseEnumPipe(DeviceProviderType)) provider: DeviceProviderType,
    @Body() updateDto: UpdateProviderConfigDto,
  ) {
    this.logger.log(`Updating config for provider: ${provider}`);
    return this.providersService.updateProviderConfig(provider, updateDto);
  }

  /**
   * 测试提供商连接（管理端）
   * POST /admin/providers/:provider/test
   */
  @Post('admin/providers/:provider/test')
  async testProviderConnection(
    @Param('provider', new ParseEnumPipe(DeviceProviderType)) provider: DeviceProviderType,
  ) {
    this.logger.log(`Testing connection for provider: ${provider}`);
    return this.providersService.testProviderConnection(provider);
  }

  /**
   * 获取云账单对账数据（管理端）
   * GET /admin/billing/cloud-reconciliation
   */
  @Get('admin/billing/cloud-reconciliation')
  async getCloudBillingReconciliation(@Query() query: CloudBillingReconciliationDto) {
    this.logger.log(`Fetching billing reconciliation: ${JSON.stringify(query)}`);
    return this.providersService.getCloudBillingReconciliation(query);
  }

  // ==================== 多账号配置管理端点 ====================

  /**
   * 列出所有提供商配置（支持过滤）
   * GET /admin/providers/configs
   */
  @Get('admin/providers/configs')
  async listProviderConfigs(@Query() query: ListProviderConfigsDto) {
    this.logger.log(`Listing provider configs with filters: ${JSON.stringify(query)}`);
    return this.providersService.listProviderConfigs(query);
  }

  /**
   * 根据 ID 获取单个提供商配置
   * GET /admin/providers/configs/:id
   */
  @Get('admin/providers/configs/:id')
  async getProviderConfigById(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Fetching provider config: ${id}`);
    const config = await this.providersService.getProviderConfigById(id);
    return { data: config };
  }

  /**
   * 创建新的提供商配置
   * POST /admin/providers/configs
   */
  @Post('admin/providers/configs')
  async createProviderConfig(@Body() createDto: CreateProviderConfigDto) {
    this.logger.log(`Creating provider config: ${createDto.name} (${createDto.providerType})`);
    const config = await this.providersService.createProviderConfig(createDto);
    return {
      success: true,
      message: 'Provider configuration created successfully',
      data: config,
    };
  }

  /**
   * 通过 ID 更新提供商配置
   * PUT /admin/providers/configs/:id
   */
  @Put('admin/providers/configs/:id')
  async updateProviderConfigById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProviderConfigByIdDto,
  ) {
    this.logger.log(`Updating provider config: ${id}`);
    const config = await this.providersService.updateProviderConfigById(id, updateDto);
    return {
      success: true,
      message: 'Provider configuration updated successfully',
      data: config,
    };
  }

  /**
   * 删除提供商配置
   * DELETE /admin/providers/configs/:id
   */
  @Delete('admin/providers/configs/:id')
  async deleteProviderConfig(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Deleting provider config: ${id}`);
    return this.providersService.deleteProviderConfig(id);
  }

  /**
   * 测试特定配置的连接
   * POST /admin/providers/configs/:id/test
   */
  @Post('admin/providers/configs/:id/test')
  async testProviderConfigById(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Testing provider config connection: ${id}`);
    return this.providersService.testProviderConfigById(id);
  }

  /**
   * 设置为默认配置
   * POST /admin/providers/configs/:id/set-default
   */
  @Post('admin/providers/configs/:id/set-default')
  async setDefaultProviderConfig(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Setting provider config as default: ${id}`);
    return this.providersService.setDefaultProviderConfig(id);
  }
}
