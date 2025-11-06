import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Between, IsNull } from 'typeorm';
import { UsageRecord } from './entities/usage-record.entity';
import {
  AdminUsageQueryDto,
  AdminUsageRecordsResponseDto,
  AdminUsageStatsDto,
  ExportUsageDto,
  UsageRecordWithRelationsDto,
} from './dto/admin-usage.dto';
import { HttpClientService } from '@cloudphone/shared';

/**
 * 管理员使用监控Service
 *
 * 提供管理员专用的使用记录查询、统计和导出功能
 */
@Injectable()
export class AdminUsageService {
  private readonly logger = new Logger(AdminUsageService.name);

  constructor(
    @InjectRepository(UsageRecord)
    private readonly usageRecordRepository: Repository<UsageRecord>,
    private readonly httpClient: HttpClientService
  ) {}

  /**
   * 获取使用记录列表（带分页和筛选）
   */
  async getUsageRecords(query: AdminUsageQueryDto): Promise<AdminUsageRecordsResponseDto> {
    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    // 构建查询
    const qb = this.buildUsageQuery(query);

    // 执行分页查询
    const [records, total] = await qb
      .orderBy('usage.createdAt', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    // 增强记录（添加用户和设备信息）
    const enrichedRecords = await this.enrichUsageRecords(records);

    return {
      data: enrichedRecords,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取使用统计数据
   */
  async getUsageStats(query: AdminUsageQueryDto): Promise<AdminUsageStatsDto> {
    // 构建查询
    const qb = this.buildUsageQuery(query);

    // 获取所有记录用于统计
    const records = await qb.getMany();

    // 计算统计数据
    const totalDuration = records.reduce((sum, record) => sum + (record.durationSeconds || 0), 0);
    const totalCost = records.reduce((sum, record) => {
      const cost = typeof record.cost === 'string' ? parseFloat(record.cost) : record.cost;
      return sum + (cost || 0);
    }, 0);

    const activeUsers = new Set(records.map((r) => r.userId)).size;
    const activeDevices = new Set(records.map((r) => r.deviceId)).size;
    const avgDuration = records.length > 0 ? totalDuration / records.length : 0;

    const result: AdminUsageStatsDto = {
      totalDuration,
      totalCost,
      activeUsers,
      activeDevices,
      avgDuration,
      totalRecords: records.length,
    };

    // 添加日期范围信息
    if (query.startDate && query.endDate) {
      result.dateRange = {
        startDate: query.startDate,
        endDate: query.endDate,
      };
    }

    return result;
  }

  /**
   * 导出使用记录
   */
  async exportUsageRecords(query: ExportUsageDto): Promise<{ data: Buffer | string }> {
    // 获取所有记录（不分页）
    const qb = this.buildUsageQuery(query);
    const records = await qb.orderBy('usage.createdAt', 'DESC').getMany();

    // 增强记录
    const enrichedRecords = await this.enrichUsageRecords(records);

    // 根据格式生成导出数据
    switch (query.format) {
      case 'csv':
        return { data: this.generateCSV(enrichedRecords) };
      case 'excel':
        return { data: await this.generateExcel(enrichedRecords) };
      case 'json':
        return { data: JSON.stringify(enrichedRecords, null, 2) };
      default:
        return { data: this.generateCSV(enrichedRecords) };
    }
  }

  /**
   * 构建使用记录查询
   */
  private buildUsageQuery(query: AdminUsageQueryDto): SelectQueryBuilder<UsageRecord> {
    const qb = this.usageRecordRepository.createQueryBuilder('usage');

    // 用户筛选
    if (query.userId) {
      qb.andWhere('usage.userId = :userId', { userId: query.userId });
    }

    // 设备筛选
    if (query.deviceId) {
      qb.andWhere('usage.deviceId = :deviceId', { deviceId: query.deviceId });
    }

    // 状态筛选
    if (query.status) {
      if (query.status === 'active') {
        qb.andWhere('usage.endTime IS NULL');
      } else if (query.status === 'completed') {
        qb.andWhere('usage.endTime IS NOT NULL');
      }
    }

    // 日期范围筛选
    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999); // 包含整天

      qb.andWhere('usage.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    // 关键词搜索（用户ID或设备ID）
    if (query.search) {
      qb.andWhere('(usage.userId LIKE :search OR usage.deviceId LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    return qb;
  }

  /**
   * 增强使用记录（添加用户和设备信息）
   */
  private async enrichUsageRecords(records: UsageRecord[]): Promise<UsageRecordWithRelationsDto[]> {
    // 收集所有唯一的用户ID和设备ID
    const userIds = [...new Set(records.map((r) => r.userId))];
    const deviceIds = [...new Set(records.map((r) => r.deviceId).filter(Boolean))];

    // 批量获取用户和设备信息
    const usersMap = await this.fetchUsersInfo(userIds);
    const devicesMap = await this.fetchDevicesInfo(deviceIds);

    // 组装增强的记录
    return records.map((record) => ({
      id: record.id,
      userId: record.userId,
      deviceId: record.deviceId,
      tenantId: record.tenantId,
      usageType: record.usageType,
      startTime: record.startTime,
      endTime: record.endTime,
      duration: record.durationSeconds || 0,
      cpuUsage: record.metadata?.cpuUsage,
      memoryUsage: record.metadata?.memoryUsage,
      networkUsage: record.metadata?.networkUsage,
      cost: record.cost,
      isBilled: record.isBilled,
      createdAt: record.createdAt,
      device: devicesMap.get(record.deviceId),
      user: usersMap.get(record.userId),
    }));
  }

  /**
   * 批量获取用户信息
   */
  private async fetchUsersInfo(
    userIds: string[]
  ): Promise<Map<string, { id: string; username?: string; email?: string }>> {
    const usersMap = new Map<string, { id: string; username?: string; email?: string }>();

    if (userIds.length === 0) {
      return usersMap;
    }

    try {
      // 调用user-service获取用户信息
      // 假设有批量查询接口: GET /users/batch?ids=id1,id2,id3
      const response = await this.httpClient.get<any>(
        `http://user-service:30001/users/batch?ids=${userIds.join(',')}`,
        { timeout: 5000 }
      );

      if (response.data?.data) {
        const users = Array.isArray(response.data.data) ? response.data.data : [];
        users.forEach((user: any) => {
          usersMap.set(user.id, {
            id: user.id,
            username: user.username,
            email: user.email,
          });
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch users info: ${error.message}`);
      // 失败时填充默认数据
      userIds.forEach((id) => {
        usersMap.set(id, { id });
      });
    }

    return usersMap;
  }

  /**
   * 批量获取设备信息
   */
  private async fetchDevicesInfo(
    deviceIds: string[]
  ): Promise<
    Map<string, { id: string; name?: string; deviceType?: string; providerType?: string }>
  > {
    const devicesMap = new Map<
      string,
      { id: string; name?: string; deviceType?: string; providerType?: string }
    >();

    if (deviceIds.length === 0) {
      return devicesMap;
    }

    try {
      // 调用device-service获取设备信息
      // 假设有批量查询接口: GET /devices/batch?ids=id1,id2,id3
      const response = await this.httpClient.get<any>(
        `http://device-service:30002/devices/batch?ids=${deviceIds.join(',')}`,
        { timeout: 5000 }
      );

      if (response.data?.data) {
        const devices = Array.isArray(response.data.data) ? response.data.data : [];
        devices.forEach((device: any) => {
          devicesMap.set(device.id, {
            id: device.id,
            name: device.name,
            deviceType: device.deviceType,
            providerType: device.providerType,
          });
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch devices info: ${error.message}`);
      // 失败时填充默认数据
      deviceIds.forEach((id) => {
        devicesMap.set(id, { id });
      });
    }

    return devicesMap;
  }

  /**
   * 生成CSV格式
   */
  private generateCSV(records: UsageRecordWithRelationsDto[]): string {
    // CSV头部
    const headers = [
      'ID',
      '用户ID',
      '用户名',
      '邮箱',
      '设备ID',
      '设备名称',
      '设备类型',
      '开始时间',
      '结束时间',
      '使用时长(秒)',
      'CPU使用率(%)',
      '内存使用(MB)',
      '网络使用(KB)',
      '费用',
      '是否已计费',
      '创建时间',
    ];

    const rows = records.map((record) => [
      record.id,
      record.userId,
      record.user?.username || '',
      record.user?.email || '',
      record.deviceId || '',
      record.device?.name || '',
      record.device?.deviceType || '',
      record.startTime ? new Date(record.startTime).toISOString() : '',
      record.endTime ? new Date(record.endTime).toISOString() : '',
      record.duration.toString(),
      record.cpuUsage?.toString() || '',
      record.memoryUsage?.toString() || '',
      record.networkUsage?.toString() || '',
      record.cost.toString(),
      record.isBilled ? '是' : '否',
      record.createdAt ? new Date(record.createdAt).toISOString() : '',
    ]);

    // 组装CSV
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    // 添加UTF-8 BOM以支持Excel中文显示
    return `\ufeff${csvContent}`;
  }

  /**
   * 生成Excel格式（简单实现，实际应使用 exceljs 库）
   */
  private async generateExcel(records: UsageRecordWithRelationsDto[]): Promise<Buffer> {
    // 简单实现：返回CSV格式作为Excel
    // 实际生产环境应使用 exceljs 生成真正的 .xlsx 文件
    this.logger.warn(
      'Excel export is using CSV format. Consider installing exceljs for production.'
    );
    const csv = this.generateCSV(records);
    return Buffer.from(csv, 'utf-8');
  }
}
