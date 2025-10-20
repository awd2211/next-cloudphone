import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DeviceStatus } from '../entities/device.entity';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    const device = await this.devicesService.create(createDeviceDto);
    return {
      success: true,
      data: device,
      message: '设备创建中，请稍候...',
    };
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('userId') userId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: DeviceStatus,
  ) {
    const result = await this.devicesService.findAll(
      parseInt(page),
      parseInt(limit),
      userId,
      tenantId,
      status,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const device = await this.devicesService.findOne(id);
    return {
      success: true,
      data: device,
    };
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    const stats = await this.devicesService.getStats(id);
    return {
      success: true,
      data: stats,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    const device = await this.devicesService.update(id, updateDeviceDto);
    return {
      success: true,
      data: device,
      message: '设备更新成功',
    };
  }

  @Post(':id/start')
  async start(@Param('id') id: string) {
    const device = await this.devicesService.start(id);
    return {
      success: true,
      data: device,
      message: '设备启动成功',
    };
  }

  @Post(':id/stop')
  async stop(@Param('id') id: string) {
    const device = await this.devicesService.stop(id);
    return {
      success: true,
      data: device,
      message: '设备停止成功',
    };
  }

  @Post(':id/restart')
  async restart(@Param('id') id: string) {
    const device = await this.devicesService.restart(id);
    return {
      success: true,
      data: device,
      message: '设备重启成功',
    };
  }

  @Post(':id/heartbeat')
  async heartbeat(@Param('id') id: string, @Body() stats: any) {
    await this.devicesService.updateHeartbeat(id, stats);
    return {
      success: true,
      message: '心跳更新成功',
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.devicesService.remove(id);
    return {
      success: true,
      message: '设备删除成功',
    };
  }
}
