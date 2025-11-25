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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedRequest } from '../auth/jwt.strategy';
import { SurveyService } from './survey.service';
import {
  CreateSurveyTemplateDto,
  UpdateSurveyTemplateDto,
  SubmitSurveyResponseDto,
  SendSurveyDto,
  QuerySurveyTemplatesDto,
  QuerySurveyResponsesDto,
} from './dto';

@ApiTags('Survey')
@ApiBearerAuth()
@Controller('survey')
@UseGuards(JwtAuthGuard)
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  // ========== Template Management ==========

  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '创建调查模板' })
  async createTemplate(@Request() req: AuthenticatedRequest, @Body() dto: CreateSurveyTemplateDto) {
    return this.surveyService.createTemplate(req.user.tenantId, dto, req.user.sub);
  }

  @Get('templates')
  @ApiOperation({ summary: '获取调查模板列表' })
  async getTemplates(@Request() req: AuthenticatedRequest, @Query() query: QuerySurveyTemplatesDto) {
    return this.surveyService.getTemplates(req.user.tenantId, query);
  }

  @Get('templates/default')
  @ApiOperation({ summary: '获取默认调查模板' })
  async getDefaultTemplate(@Request() req: AuthenticatedRequest) {
    return this.surveyService.getDefaultTemplate(req.user.tenantId);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: '获取调查模板详情' })
  async getTemplate(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.surveyService.getTemplate(req.user.tenantId, id);
  }

  @Put('templates/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '更新调查模板' })
  async updateTemplate(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSurveyTemplateDto,
  ) {
    return this.surveyService.updateTemplate(req.user.tenantId, id, dto);
  }

  @Delete('templates/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '删除调查模板' })
  async deleteTemplate(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.surveyService.deleteTemplate(req.user.tenantId, id);
    return { success: true };
  }

  // ========== Survey Sending ==========

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: '发送调查问卷' })
  async sendSurvey(@Request() req: AuthenticatedRequest, @Body() dto: SendSurveyDto) {
    return this.surveyService.sendSurvey(req.user.tenantId, dto);
  }

  // ========== Survey Response ==========

  @Post('submit')
  @ApiOperation({ summary: '提交调查响应' })
  async submitResponse(@Request() req: AuthenticatedRequest, @Body() dto: SubmitSurveyResponseDto) {
    return this.surveyService.submitResponse(req.user.tenantId, dto);
  }

  @Post('responses/:id/skip')
  @ApiOperation({ summary: '跳过调查' })
  async skipSurvey(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.surveyService.skipSurvey(req.user.tenantId, id);
    return { success: true };
  }

  @Get('responses')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: '获取调查响应列表' })
  async getResponses(@Request() req: AuthenticatedRequest, @Query() query: QuerySurveyResponsesDto) {
    return this.surveyService.getResponses(req.user.tenantId, query);
  }

  // ========== Statistics ==========

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '获取调查统计数据' })
  async getStats(
    @Request() req: AuthenticatedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.surveyService.getStats(req.user.tenantId, startDate, endDate);
  }

  @Get('stats/agent/:agentId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: '获取客服调查统计' })
  async getAgentStats(@Request() req: AuthenticatedRequest, @Param('agentId') agentId: string) {
    return this.surveyService.getAgentStats(req.user.tenantId, agentId);
  }
}
