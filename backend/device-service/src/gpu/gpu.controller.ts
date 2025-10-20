import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GpuManagerService } from './gpu-manager.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('GPU Management - GPU管理')
@Controller('gpu')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GpuController {
  constructor(private readonly gpuManager: GpuManagerService) {}

  @Get('info')
  @ApiOperation({
    summary: '获取GPU信息',
    description: '检测系统GPU可用性和配置信息'
  })
  @ApiResponse({ status: 200, description: 'GPU信息' })
  async getGpuInfo() {
    return await this.gpuManager.detectGpu();
  }

  @Get('diagnostics')
  @ApiOperation({
    summary: 'GPU诊断',
    description: '获取GPU诊断报告，包含推荐配置和警告'
  })
  @ApiResponse({ status: 200, description: 'GPU诊断报告' })
  async getDiagnostics() {
    return await this.gpuManager.getDiagnostics();
  }

  @Get('recommended-config')
  @ApiOperation({
    summary: '获取推荐GPU配置',
    description: '根据系统环境获取推荐的GPU配置'
  })
  @ApiResponse({ status: 200, description: '推荐的GPU配置' })
  getRecommendedConfig() {
    return {
      high: this.gpuManager.getRecommendedConfig('high'),
      balanced: this.gpuManager.getRecommendedConfig('balanced'),
      low: this.gpuManager.getRecommendedConfig('low'),
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: '获取GPU使用统计',
    description: 'GPU设备使用情况和利用率'
  })
  @ApiResponse({ status: 200, description: 'GPU统计信息' })
  async getGpuStats() {
    return await this.gpuManager.getGpuStats();
  }
}
