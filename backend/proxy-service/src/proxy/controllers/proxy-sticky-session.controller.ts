import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '@cloudphone/shared';
import { ProxyStickySessionService } from '../services/proxy-sticky-session.service';
import {
  CreateStickySessionDto,
  RenewSessionDto,
  StickySessionResponseDto,
  SessionStatsResponseDto,
  ApiResponse as ProxyApiResponse,
} from '../dto';

/**
 * 代理粘性会话控制器
 *
 * 提供长期IP绑定会话管理功能
 */
@ApiTags('Proxy Sticky Sessions')
@Controller('proxy/sessions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProxyStickySessionController {
  constructor(
    private readonly stickySessionService: ProxyStickySessionService,
  ) {}

  /**
   * 创建粘性会话
   */
  @Post()
  @RequirePermission('proxy.session.create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建粘性会话',
    description: '为设备创建长期IP绑定会话，最长可持续30天',
  })
  @ApiResponse({
    status: 201,
    description: '会话创建成功',
    type: StickySessionResponseDto,
  })
  async createSession(
    @Body() dto: CreateStickySessionDto,
  ): Promise<ProxyApiResponse<StickySessionResponseDto>> {
    const session = await this.stickySessionService.createStickySession(dto);
    return ProxyApiResponse.success(session as any, 'Sticky session created');
  }

  /**
   * 续期会话
   */
  @Post(':sessionId/renew')
  @RequirePermission('proxy.session.renew')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '续期会话',
    description: '延长会话有效期，最多延长7天',
  })
  @ApiParam({ name: 'sessionId', description: '会话ID' })
  @ApiResponse({
    status: 200,
    description: '续期成功',
    type: StickySessionResponseDto,
  })
  async renewSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: RenewSessionDto,
  ): Promise<ProxyApiResponse<StickySessionResponseDto>> {
    const session = await this.stickySessionService.renewSession(
      sessionId,
      dto.extensionSeconds,
    );
    return ProxyApiResponse.success(session as any, 'Session renewed');
  }

  /**
   * 终止会话
   */
  @Delete(':sessionId')
  @RequirePermission('proxy.session.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '终止会话',
    description: '手动终止会话并释放代理',
  })
  @ApiParam({ name: 'sessionId', description: '会话ID' })
  @ApiResponse({
    status: 200,
    description: '会话已终止',
  })
  async terminateSession(
    @Param('sessionId') sessionId: string,
  ): Promise<ProxyApiResponse<{ terminated: boolean }>> {
    await this.stickySessionService.terminateSession(sessionId);
    return ProxyApiResponse.success(
      { terminated: true },
      'Session terminated',
    );
  }

  /**
   * 查询会话详情
   */
  @Get(':sessionId')
  @RequirePermission('proxy.session.read')
  @ApiOperation({
    summary: '查询会话详情',
    description: '获取会话的详细信息，包括续期历史和代理信息',
  })
  @ApiParam({ name: 'sessionId', description: '会话ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  async getSessionDetails(
    @Param('sessionId') sessionId: string,
  ): Promise<ProxyApiResponse<any>> {
    const details = await this.stickySessionService.getSessionDetails(
      sessionId,
    );
    return ProxyApiResponse.success(details);
  }

  /**
   * 查询设备的所有会话
   */
  @Get('device/:deviceId')
  @RequirePermission('proxy.session.read')
  @ApiOperation({
    summary: '查询设备会话',
    description: '获取指定设备的所有活跃会话',
  })
  @ApiParam({ name: 'deviceId', description: '设备ID' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [StickySessionResponseDto],
  })
  async getDeviceSessions(
    @Param('deviceId') deviceId: string,
  ): Promise<ProxyApiResponse<StickySessionResponseDto[]>> {
    const sessions = await this.stickySessionService.getDeviceSessions(
      deviceId,
    );
    return ProxyApiResponse.success(sessions as any);
  }

  /**
   * 查询用户的所有会话
   */
  @Get('user/:userId')
  @RequirePermission('proxy.session.read')
  @ApiOperation({
    summary: '查询用户会话',
    description: '获取指定用户的所有会话',
  })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiQuery({
    name: 'includeExpired',
    required: false,
    description: '是否包含已过期会话',
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: [StickySessionResponseDto],
  })
  async getUserSessions(
    @Param('userId') userId: string,
    @Query('includeExpired') includeExpired?: boolean,
  ): Promise<ProxyApiResponse<StickySessionResponseDto[]>> {
    const sessions = await this.stickySessionService.getUserSessions(
      userId,
      includeExpired,
    );
    return ProxyApiResponse.success(sessions as any);
  }

  /**
   * 获取会话统计
   */
  @Get('stats/overview')
  @RequirePermission('proxy.session.stats')
  @ApiOperation({
    summary: '会话统计',
    description: '获取会话的统计数据',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: '用户ID（可选，用于过滤）',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    type: SessionStatsResponseDto,
  })
  async getSessionStats(
    @Query('userId') userId?: string,
  ): Promise<ProxyApiResponse<SessionStatsResponseDto>> {
    const stats = await this.stickySessionService.getSessionStats(userId);
    return ProxyApiResponse.success(stats);
  }
}
