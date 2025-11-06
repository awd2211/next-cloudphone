import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminUsageService } from './admin-usage.service';
import {
  AdminUsageQueryDto,
  AdminUsageRecordsResponseDto,
  AdminUsageStatsDto,
  ExportUsageDto,
} from './dto/admin-usage.dto';

/**
 * 管理员使用监控Controller
 *
 * 功能：
 * - 获取所有用户的使用记录（分页、筛选）
 * - 获取使用统计数据
 * - 导出使用记录
 */
@ApiTags('管理员-使用监控')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing/admin/usage')
export class AdminUsageController {
  private readonly logger = new Logger(AdminUsageController.name);

  constructor(private readonly adminUsageService: AdminUsageService) {}

  /**
   * 获取所有用户的使用记录（管理员专用）
   */
  @Get('records')
  @ApiOperation({ summary: '获取所有用户使用记录（管理员专用）' })
  @ApiResponse({
    status: 200,
    description: '成功返回使用记录列表',
    type: AdminUsageRecordsResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  async getUsageRecords(@Query() query: AdminUsageQueryDto): Promise<AdminUsageRecordsResponseDto> {
    this.logger.log(`Admin fetching usage records with filters: ${JSON.stringify(query)}`);

    // 验证日期范围
    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      if (start > end) {
        throw new BadRequestException('开始日期不能大于结束日期');
      }
    }

    return this.adminUsageService.getUsageRecords(query);
  }

  /**
   * 获取使用统计数据（管理员专用）
   */
  @Get('stats')
  @ApiOperation({ summary: '获取使用统计数据（管理员专用）' })
  @ApiResponse({
    status: 200,
    description: '成功返回统计数据',
    type: AdminUsageStatsDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  async getUsageStats(@Query() query: AdminUsageQueryDto): Promise<AdminUsageStatsDto> {
    this.logger.log(`Admin fetching usage stats with filters: ${JSON.stringify(query)}`);

    // 验证日期范围
    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      if (start > end) {
        throw new BadRequestException('开始日期不能大于结束日期');
      }
    }

    return this.adminUsageService.getUsageStats(query);
  }

  /**
   * 导出使用记录（管理员专用）
   */
  @Get('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '导出使用记录（管理员专用）' })
  @ApiResponse({
    status: 200,
    description: '成功导出使用记录',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  async exportUsageRecords(@Query() query: ExportUsageDto, @Res() res: Response): Promise<void> {
    this.logger.log(`Admin exporting usage records with format: ${query.format}`);

    // 验证日期范围
    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      if (start > end) {
        throw new BadRequestException('开始日期不能大于结束日期');
      }
    }

    try {
      const result = await this.adminUsageService.exportUsageRecords(query);

      // 设置响应头
      const timestamp = new Date().toISOString().split('T')[0];
      let contentType: string;
      let extension: string;

      switch (query.format) {
        case 'csv':
          contentType = 'text/csv';
          extension = 'csv';
          break;
        case 'excel':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          extension = 'xlsx';
          break;
        case 'json':
          contentType = 'application/json';
          extension = 'json';
          break;
        default:
          contentType = 'text/csv';
          extension = 'csv';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="usage-records-${timestamp}.${extension}"`
      );

      res.send(result.data);
    } catch (error) {
      this.logger.error(`Failed to export usage records: ${error.message}`, error.stack);
      throw new BadRequestException(`导出失败: ${error.message}`);
    }
  }
}
