import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { RestoreSnapshotDto } from './dto/restore-snapshot.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('snapshots')
@UseGuards(JwtAuthGuard)
export class SnapshotsController {
  private readonly logger = new Logger(SnapshotsController.name);

  constructor(private readonly snapshotsService: SnapshotsService) {}

  /**
   * 为设备创建快照
   * POST /snapshots/device/:deviceId
   */
  @Post('device/:deviceId')
  async createSnapshot(
    @Param('deviceId') deviceId: string,
    @Body() createSnapshotDto: CreateSnapshotDto,
    @Request() req,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    this.logger.log(`User ${userId} creating snapshot for device ${deviceId}`);
    return await this.snapshotsService.createSnapshot(
      deviceId,
      createSnapshotDto,
      userId,
    );
  }

  /**
   * 从快照恢复设备
   * POST /snapshots/:id/restore
   */
  @Post(':id/restore')
  async restoreSnapshot(
    @Param('id') id: string,
    @Body() restoreDto: RestoreSnapshotDto,
    @Request() req,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    this.logger.log(`User ${userId} restoring from snapshot ${id}`);
    return await this.snapshotsService.restoreSnapshot(id, restoreDto, userId);
  }

  /**
   * 压缩快照
   * POST /snapshots/:id/compress
   */
  @Post(':id/compress')
  async compressSnapshot(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.sub;
    this.logger.log(`User ${userId} compressing snapshot ${id}`);
    return await this.snapshotsService.compressSnapshot(id);
  }

  /**
   * 删除快照
   * DELETE /snapshots/:id
   */
  @Delete(':id')
  async deleteSnapshot(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.sub;
    this.logger.log(`User ${userId} deleting snapshot ${id}`);
    await this.snapshotsService.deleteSnapshot(id, userId);
    return { message: 'Snapshot deleted successfully' };
  }

  /**
   * 获取单个快照详情
   * GET /snapshots/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.snapshotsService.findOne(id, userId);
  }

  /**
   * 获取设备的所有快照
   * GET /snapshots/device/:deviceId
   */
  @Get('device/:deviceId')
  async findByDevice(@Param('deviceId') deviceId: string) {
    return await this.snapshotsService.findByDevice(deviceId);
  }

  /**
   * 获取当前用户的所有快照
   * GET /snapshots
   */
  @Get()
  async findByUser(@Request() req) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.snapshotsService.findByUser(userId);
  }

  /**
   * 获取快照统计信息
   * GET /snapshots/stats/summary
   */
  @Get('stats/summary')
  async getStatistics(@Request() req) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.snapshotsService.getStatistics(userId);
  }
}
