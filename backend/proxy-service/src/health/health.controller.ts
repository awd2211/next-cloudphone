import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * 健康检查控制器
 * 用于服务健康状态监控和负载均衡器探测
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  /**
   * 健康检查端点
   * 返回服务状态和基本信息
   */
  @Get()
  @ApiOperation({ summary: '健康检查', description: '检查服务是否正常运行' })
  @ApiResponse({
    status: 200,
    description: '服务健康',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'proxy-service' },
        version: { type: 'string', example: '1.0.0' },
        timestamp: { type: 'string', example: '2025-11-03T04:15:30.123Z' },
        uptime: { type: 'number', example: 123.456 },
      },
    },
  })
  healthCheck() {
    return {
      status: 'ok',
      service: 'proxy-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * 就绪检查端点
   * 检查服务是否准备好接收流量
   */
  @Get('ready')
  @ApiOperation({ summary: '就绪检查', description: '检查服务是否准备好接收请求' })
  @ApiResponse({
    status: 200,
    description: '服务就绪',
  })
  readyCheck() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 存活检查端点
   * 最基础的存活探测
   */
  @Get('live')
  @ApiOperation({ summary: '存活检查', description: '检查服务进程是否存活' })
  @ApiResponse({
    status: 200,
    description: '服务存活',
  })
  liveCheck() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
