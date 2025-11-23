import { Controller, Get, Post, Param, Query, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { DeviceAssistService } from './device-assist.service';

@ApiTags('livechat/device-assist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('livechat/device-assist')
export class DeviceAssistController {
  constructor(private readonly deviceAssistService: DeviceAssistService) {}

  @Get('devices')
  @ApiOperation({ summary: '获取用户设备列表' })
  async getUserDevices(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    return this.deviceAssistService.getUserDevices(user.userId, token);
  }

  @Get('devices/:id')
  @ApiOperation({ summary: '获取设备详情' })
  async getDeviceInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const info = await this.deviceAssistService.getDeviceInfo(id, token);

    if (info) {
      return {
        ...info,
        suggestions: this.deviceAssistService.generateTroubleshootingGuide(info),
      };
    }

    return null;
  }

  @Get('devices/:id/screenshot')
  @ApiOperation({ summary: '获取设备截图' })
  async getDeviceScreenshot(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    return this.deviceAssistService.getDeviceScreenshot(id, token);
  }

  @Post('devices/:id/restart')
  @ApiOperation({ summary: '重启设备' })
  async restartDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const success = await this.deviceAssistService.restartDevice(id, token);
    return { success };
  }

  @Get('devices/:id/logs')
  @ApiOperation({ summary: '获取设备日志' })
  async getDeviceLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lines') lines: number = 100,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const logs = await this.deviceAssistService.getDeviceLogs(id, lines, token);
    return { logs };
  }
}
