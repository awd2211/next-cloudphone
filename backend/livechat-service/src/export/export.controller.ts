import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthenticatedRequest } from '../auth/jwt.strategy';
import { ExportService } from './export.service';
import {
  CreateExportTaskDto,
  QueryExportTasksDto,
} from './dto';
import { ReportType } from '../entities';

@ApiTags('Export')
@ApiBearerAuth()
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  // ========== Export Tasks ==========

  @Post('tasks')
  @ApiOperation({ summary: '创建导出任务' })
  async createExportTask(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateExportTaskDto,
  ) {
    const createdBy = req.user.sub;
    return this.exportService.createExportTask(req.user.tenantId, dto, createdBy);
  }

  @Get('tasks')
  @ApiOperation({ summary: '获取导出任务列表' })
  async getExportTasks(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryExportTasksDto,
  ) {
    return this.exportService.getExportTasks(req.user.tenantId, query);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: '获取导出任务详情' })
  async getExportTask(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.exportService.getExportTask(req.user.tenantId, id);
  }

  @Get('tasks/:id/progress')
  @ApiOperation({ summary: '获取导出任务进度' })
  async getTaskProgress(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.exportService.getTaskProgress(req.user.tenantId, id);
  }

  @Post('tasks/:id/cancel')
  @ApiOperation({ summary: '取消导出任务' })
  async cancelExportTask(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.exportService.cancelExportTask(req.user.tenantId, id);
    return { success: true };
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: '删除导出任务' })
  async deleteExportTask(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.exportService.deleteExportTask(req.user.tenantId, id);
    return { success: true };
  }

  // ========== Download ==========

  @Get('download/:id')
  @ApiOperation({ summary: '下载导出文件' })
  async downloadExportFile(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const task = await this.exportService.getExportTask(req.user.tenantId, id);

    // TODO: Stream file from MinIO
    // For now, return a placeholder response
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${task.name}.${task.format}"`,
    });

    return { message: 'File download would be streamed here' };
  }

  // ========== Report Configuration ==========

  @Get('report-types')
  @ApiOperation({ summary: '获取所有报表类型配置' })
  async getReportTypes() {
    return this.exportService.getReportTypes();
  }

  @Get('report-types/:type')
  @ApiOperation({ summary: '获取报表类型配置详情' })
  async getReportTypeConfig(
    @Param('type') type: ReportType,
  ) {
    return this.exportService.getReportTypeConfig(type);
  }

  // ========== Statistics ==========

  @Get('stats')
  @ApiOperation({ summary: '获取导出统计' })
  async getExportStats(@Request() req: AuthenticatedRequest) {
    return this.exportService.getExportStats(req.user.tenantId);
  }
}
