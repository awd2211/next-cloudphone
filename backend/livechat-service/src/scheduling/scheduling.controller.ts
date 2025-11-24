import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';
import {
  CreateShiftTemplateDto,
  UpdateShiftTemplateDto,
  CreateScheduleDto,
  BatchCreateScheduleDto,
  UpdateScheduleDto,
  RequestLeaveDto,
  ApproveLeaveDto,
  CheckInOutDto,
  CreateRecurringScheduleDto,
  UpdateRecurringScheduleDto,
  QuerySchedulesDto,
  QueryShiftTemplatesDto,
} from './dto';

@ApiTags('Scheduling')
@ApiBearerAuth()
@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  // ========== Shift Templates ==========

  @Post('shifts')
  @ApiOperation({ summary: '创建班次模板' })
  async createShiftTemplate(
    @Request() req,
    @Body() dto: CreateShiftTemplateDto,
  ) {
    return this.schedulingService.createShiftTemplate(req.user.tenantId, dto);
  }

  @Put('shifts/:id')
  @ApiOperation({ summary: '更新班次模板' })
  async updateShiftTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateShiftTemplateDto,
  ) {
    return this.schedulingService.updateShiftTemplate(req.user.tenantId, id, dto);
  }

  @Delete('shifts/:id')
  @ApiOperation({ summary: '删除班次模板' })
  async deleteShiftTemplate(
    @Request() req,
    @Param('id') id: string,
  ) {
    await this.schedulingService.deleteShiftTemplate(req.user.tenantId, id);
    return { success: true };
  }

  @Get('shifts')
  @ApiOperation({ summary: '获取班次模板列表' })
  async getShiftTemplates(
    @Request() req,
    @Query() query: QueryShiftTemplatesDto,
  ) {
    return this.schedulingService.getShiftTemplates(req.user.tenantId, query);
  }

  @Get('shifts/:id')
  @ApiOperation({ summary: '获取班次模板详情' })
  async getShiftTemplate(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.schedulingService.getShiftTemplate(req.user.tenantId, id);
  }

  // ========== Agent Schedules ==========

  @Post('schedules')
  @ApiOperation({ summary: '创建排班' })
  async createSchedule(
    @Request() req,
    @Body() dto: CreateScheduleDto,
  ) {
    const createdBy = req.user.sub;
    return this.schedulingService.createSchedule(req.user.tenantId, dto, createdBy);
  }

  @Post('schedules/batch')
  @ApiOperation({ summary: '批量创建排班' })
  async batchCreateSchedules(
    @Request() req,
    @Body() dto: BatchCreateScheduleDto,
  ) {
    const createdBy = req.user.sub;
    return this.schedulingService.batchCreateSchedules(req.user.tenantId, dto, createdBy);
  }

  @Put('schedules/:id')
  @ApiOperation({ summary: '更新排班' })
  async updateSchedule(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulingService.updateSchedule(req.user.tenantId, id, dto);
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: '删除排班' })
  async deleteSchedule(
    @Request() req,
    @Param('id') id: string,
  ) {
    await this.schedulingService.deleteSchedule(req.user.tenantId, id);
    return { success: true };
  }

  @Get('schedules')
  @ApiOperation({ summary: '获取排班列表' })
  async getSchedules(
    @Request() req,
    @Query() query: QuerySchedulesDto,
  ) {
    return this.schedulingService.getSchedules(req.user.tenantId, query);
  }

  @Get('schedules/calendar')
  @ApiOperation({ summary: '获取排班日历视图' })
  async getScheduleCalendar(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.schedulingService.getScheduleCalendar(
      req.user.tenantId,
      startDate,
      endDate,
      groupId,
    );
  }

  @Post('schedules/leave')
  @ApiOperation({ summary: '请假申请' })
  async requestLeave(
    @Request() req,
    @Body() dto: RequestLeaveDto,
  ) {
    const agentId = req.user.agentId || req.user.sub;
    return this.schedulingService.requestLeave(req.user.tenantId, dto, agentId);
  }

  @Post('schedules/leave/approve')
  @ApiOperation({ summary: '审批请假' })
  async approveLeave(
    @Request() req,
    @Body() dto: ApproveLeaveDto,
  ) {
    const approvedBy = req.user.sub;
    return this.schedulingService.approveLeave(req.user.tenantId, dto, approvedBy);
  }

  @Post('schedules/check')
  @ApiOperation({ summary: '签到/签退' })
  async checkInOut(
    @Request() req,
    @Body() dto: CheckInOutDto,
  ) {
    const agentId = req.user.agentId || req.user.sub;
    return this.schedulingService.checkInOut(req.user.tenantId, dto, agentId);
  }

  // ========== Recurring Schedules ==========

  @Post('recurring')
  @ApiOperation({ summary: '创建周期性排班规则' })
  async createRecurringSchedule(
    @Request() req,
    @Body() dto: CreateRecurringScheduleDto,
  ) {
    const createdBy = req.user.sub;
    return this.schedulingService.createRecurringSchedule(req.user.tenantId, dto, createdBy);
  }

  @Put('recurring/:id')
  @ApiOperation({ summary: '更新周期性排班规则' })
  async updateRecurringSchedule(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringScheduleDto,
  ) {
    return this.schedulingService.updateRecurringSchedule(req.user.tenantId, id, dto);
  }

  @Delete('recurring/:id')
  @ApiOperation({ summary: '删除周期性排班规则' })
  async deleteRecurringSchedule(
    @Request() req,
    @Param('id') id: string,
  ) {
    await this.schedulingService.deleteRecurringSchedule(req.user.tenantId, id);
    return { success: true };
  }

  @Get('recurring')
  @ApiOperation({ summary: '获取周期性排班规则列表' })
  async getRecurringSchedules(
    @Request() req,
    @Query('agentId') agentId?: string,
  ) {
    return this.schedulingService.getRecurringSchedules(req.user.tenantId, agentId);
  }

  // ========== Statistics ==========

  @Get('stats/agent/:agentId')
  @ApiOperation({ summary: '获取客服排班统计' })
  async getAgentScheduleStats(
    @Request() req,
    @Param('agentId') agentId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.schedulingService.getAgentScheduleStats(
      req.user.tenantId,
      agentId,
      startDate,
      endDate,
    );
  }

  @Get('stats/daily')
  @ApiOperation({ summary: '获取每日排班概览' })
  async getDailyOverview(
    @Request() req,
    @Query('date') date: string,
  ) {
    return this.schedulingService.getDailyOverview(req.user.tenantId, date);
  }
}
