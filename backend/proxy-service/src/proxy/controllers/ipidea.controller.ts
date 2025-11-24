import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { IPIDEAService } from '../services/ipidea.service';
import {
  IPIDEAFlowStatsDto,
  IPIDEAWhitelistDto,
  IPIDEAAccountListDto,
  IPIDEAFlowWarningDto,
  IPIDEAUsageRecordDto,
} from '../dto/ipidea.dto';

/**
 * IPIDEA 代理供应商专用控制器
 *
 * 提供 IPIDEA 特有的高级功能：
 * - 流量管理（剩余流量、使用记录、预警）
 * - 白名单管理（添加、删除、查询IP白名单）
 * - 账户管理（查询认证账户列表）
 * - 区域查询（获取支持的国家/地区）
 */
@ApiTags('IPIDEA 代理管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('proxy/ipidea')
export class IPIDEAController {
  private readonly logger = new Logger(IPIDEAController.name);

  constructor(private readonly ipideaService: IPIDEAService) {}

  /**
   * 获取剩余流量
   * GET /proxy/ipidea/:providerId/flow/remaining
   */
  @Get(':providerId/flow/remaining')
  @ApiOperation({ summary: '获取 IPIDEA 剩余流量' })
  @ApiResponse({
    status: 200,
    description: '成功返回剩余流量信息',
    type: IPIDEAFlowStatsDto,
  })
  async getRemainingFlow(
    @Param('providerId') providerId: string,
  ): Promise<IPIDEAFlowStatsDto> {
    this.logger.log(`Getting remaining flow for provider: ${providerId}`);
    return this.ipideaService.getRemainingFlow(providerId);
  }

  /**
   * 获取流量使用记录
   * GET /proxy/ipidea/:providerId/flow/usage
   */
  @Get(':providerId/flow/usage')
  @ApiOperation({ summary: '获取 IPIDEA 流量使用记录' })
  @ApiResponse({
    status: 200,
    description: '成功返回流量使用记录',
    type: IPIDEAUsageRecordDto,
  })
  async getFlowUsage(
    @Param('providerId') providerId: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ): Promise<IPIDEAUsageRecordDto> {
    this.logger.log(`Getting flow usage for provider: ${providerId}`);

    const startDate = startTime ? new Date(parseInt(startTime) * 1000) : undefined;
    const endDate = endTime ? new Date(parseInt(endTime) * 1000) : undefined;

    return this.ipideaService.getFlowUsage(providerId, startDate, endDate);
  }

  /**
   * 设置流量预警
   * POST /proxy/ipidea/:providerId/flow/warning
   */
  @Post(':providerId/flow/warning')
  @ApiOperation({ summary: '设置 IPIDEA 流量预警阈值' })
  @ApiResponse({
    status: 200,
    description: '流量预警设置成功',
  })
  async setFlowWarning(
    @Param('providerId') providerId: string,
    @Body() dto: IPIDEAFlowWarningDto,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Setting flow warning for provider: ${providerId}, threshold: ${dto.thresholdMB} MB`);

    const success = await this.ipideaService.setFlowWarning(providerId, dto.thresholdMB);

    return {
      success,
      message: success
        ? `流量预警已设置为 ${dto.thresholdMB} MB`
        : '流量预警设置失败',
    };
  }

  /**
   * 获取白名单IP列表
   * GET /proxy/ipidea/:providerId/whitelist
   */
  @Get(':providerId/whitelist')
  @ApiOperation({ summary: '获取 IPIDEA IP 白名单列表' })
  @ApiResponse({
    status: 200,
    description: '成功返回白名单列表',
    type: [String],
  })
  async getWhitelist(@Param('providerId') providerId: string): Promise<string[]> {
    this.logger.log(`Getting whitelist for provider: ${providerId}`);
    return this.ipideaService.getWhitelistIPs(providerId);
  }

  /**
   * 添加白名单IP
   * POST /proxy/ipidea/:providerId/whitelist
   */
  @Post(':providerId/whitelist')
  @ApiOperation({ summary: '添加 IP 到 IPIDEA 白名单' })
  @ApiResponse({
    status: 200,
    description: 'IP 添加成功',
  })
  async addWhitelistIP(
    @Param('providerId') providerId: string,
    @Body() dto: IPIDEAWhitelistDto,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Adding IP to whitelist: ${dto.ip} for provider: ${providerId}`);

    // 验证 IP 格式
    if (!this.isValidIP(dto.ip)) {
      throw new BadRequestException(`Invalid IP address: ${dto.ip}`);
    }

    const success = await this.ipideaService.addWhitelistIP(providerId, dto.ip);

    return {
      success,
      message: success
        ? `IP ${dto.ip} 已添加到白名单`
        : `添加 IP ${dto.ip} 到白名单失败`,
    };
  }

  /**
   * 删除白名单IP
   * DELETE /proxy/ipidea/:providerId/whitelist/:ip
   */
  @Delete(':providerId/whitelist/:ip')
  @ApiOperation({ summary: '从 IPIDEA 白名单删除 IP' })
  @ApiResponse({
    status: 200,
    description: 'IP 删除成功',
  })
  async removeWhitelistIP(
    @Param('providerId') providerId: string,
    @Param('ip') ip: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Removing IP from whitelist: ${ip} for provider: ${providerId}`);

    const success = await this.ipideaService.removeWhitelistIP(providerId, ip);

    return {
      success,
      message: success
        ? `IP ${ip} 已从白名单删除`
        : `删除 IP ${ip} 失败`,
    };
  }

  /**
   * 获取认证账户列表
   * GET /proxy/ipidea/:providerId/accounts
   */
  @Get(':providerId/accounts')
  @ApiOperation({ summary: '获取 IPIDEA 认证账户列表' })
  @ApiResponse({
    status: 200,
    description: '成功返回账户列表',
    type: IPIDEAAccountListDto,
  })
  async getAccounts(
    @Param('providerId') providerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<IPIDEAAccountListDto> {
    this.logger.log(`Getting accounts for provider: ${providerId}, page: ${page}, limit: ${limit}`);
    return this.ipideaService.getAccounts(providerId, page, limit);
  }

  /**
   * 获取支持的区域列表
   * GET /proxy/ipidea/:providerId/regions
   */
  @Get(':providerId/regions')
  @ApiOperation({ summary: '获取 IPIDEA 支持的国家/地区列表' })
  @ApiResponse({
    status: 200,
    description: '成功返回区域列表',
  })
  async getRegions(@Param('providerId') providerId: string): Promise<any[]> {
    this.logger.log(`Getting regions for provider: ${providerId}`);
    return this.ipideaService.getAvailableRegions(providerId);
  }

  /**
   * 验证 IP 地址格式
   */
  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}
