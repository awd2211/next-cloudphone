import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: '健康检查', description: '检查服务是否正常运行' })
  @ApiResponse({ status: 200, description: '服务正常' })
  getHealth() {
    return this.appService.getHealth();
  }
}
