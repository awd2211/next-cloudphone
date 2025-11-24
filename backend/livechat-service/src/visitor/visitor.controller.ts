import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { VisitorService } from './visitor.service';
import {
  CreateVisitorProfileDto,
  UpdateVisitorProfileDto,
  AddTagsDto,
  RemoveTagsDto,
  TrackEventDto,
  QueryVisitorProfilesDto,
  QueryVisitorEventsDto,
} from './dto';

@ApiTags('Visitor')
@ApiBearerAuth()
@Controller('visitor')
@UseGuards(JwtAuthGuard)
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  // ========== Profile Management ==========

  @Post('profiles')
  @ApiOperation({ summary: '创建/更新访客画像' })
  async createOrUpdateProfile(
    @Request() req,
    @Body() dto: CreateVisitorProfileDto,
    @Ip() ip: string,
  ) {
    return this.visitorService.createOrUpdateProfile(req.user.tenantId, dto, ip);
  }

  @Get('profiles')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: '获取访客画像列表' })
  async getProfiles(@Request() req, @Query() query: QueryVisitorProfilesDto) {
    return this.visitorService.getProfiles(req.user.tenantId, query);
  }

  @Get('profiles/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: '获取访客画像详情' })
  async getProfile(@Request() req, @Param('id') id: string) {
    return this.visitorService.getProfile(req.user.tenantId, id);
  }

  @Get('profiles/by-visitor/:visitorId')
  @ApiOperation({ summary: '通过访客ID获取画像' })
  async getProfileByVisitorId(@Request() req, @Param('visitorId') visitorId: string) {
    return this.visitorService.getProfileByVisitorId(req.user.tenantId, visitorId);
  }

  @Put('profiles/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: '更新访客画像' })
  async updateProfile(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateVisitorProfileDto,
  ) {
    return this.visitorService.updateProfile(req.user.tenantId, id, dto);
  }

  @Post('profiles/:id/tags')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: '添加标签' })
  async addTags(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AddTagsDto,
  ) {
    return this.visitorService.addTags(req.user.tenantId, id, dto.tags);
  }

  @Delete('profiles/:id/tags')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: '移除标签' })
  async removeTags(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RemoveTagsDto,
  ) {
    return this.visitorService.removeTags(req.user.tenantId, id, dto.tags);
  }

  @Get('profiles/:id/timeline')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: '获取访客时间线' })
  async getTimeline(@Request() req, @Param('id') id: string) {
    return this.visitorService.getVisitorTimeline(req.user.tenantId, id);
  }

  // ========== Event Tracking ==========

  @Post('events/track')
  @ApiOperation({ summary: '记录访客事件' })
  async trackEvent(@Request() req, @Body() dto: TrackEventDto, @Ip() ip: string) {
    return this.visitorService.trackEvent(req.user.tenantId, dto, ip);
  }

  @Get('events')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '获取访客事件列表' })
  async getEvents(@Request() req, @Query() query: QueryVisitorEventsDto) {
    return this.visitorService.getEvents(req.user.tenantId, query);
  }

  // ========== Statistics ==========

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '获取访客统计数据' })
  async getStats(@Request() req) {
    return this.visitorService.getStats(req.user.tenantId);
  }
}
