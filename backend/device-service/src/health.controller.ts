import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: '健康检查', description: '检查服务是否正常运行' })
  @ApiResponse({ status: 200, description: '服务正常' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'device-service',
    };
  }
}
