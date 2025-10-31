import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationPreferencesService } from './preferences.service';
import { NotificationType, NotificationChannel } from '../entities/notification-preference.entity';
import { IsEnum, IsBoolean, IsArray, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { getAllNotificationTypes } from './default-preferences';

/**
 * 更新偏好 DTO
 */
export class UpdatePreferenceDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  enabledChannels?: NotificationChannel[];

  @IsOptional()
  @IsObject()
  customSettings?: Record<string, any>;
}

/**
 * 批量更新偏好 DTO
 */
export class BatchUpdatePreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceUpdateItem)
  preferences: PreferenceUpdateItem[];
}

export class PreferenceUpdateItem {
  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  enabledChannels?: NotificationChannel[];

  @IsOptional()
  @IsObject()
  customSettings?: Record<string, any>;
}

/**
 * 通知偏好控制器
 *
 * 提供用户通知偏好管理的 HTTP API
 *
 * 端点:
 * - GET /notifications/preferences - 获取所有偏好
 * - GET /notifications/preferences/:type - 获取特定类型偏好
 * - PUT /notifications/preferences/:type - 更新特定类型偏好
 * - POST /notifications/preferences/batch - 批量更新偏好
 * - POST /notifications/preferences/reset - 重置为默认设置
 * - GET /notifications/preferences/types - 获取所有可用类型
 * - GET /notifications/preferences/stats - 获取统计信息
 */
@Controller('notifications/preferences')
export class NotificationPreferencesController {
  constructor(private readonly preferencesService: NotificationPreferencesService) {}

  /**
   * 获取当前用户的所有通知偏好
   *
   * @param userId - 从请求头或 JWT 中提取（这里简化为查询参数）
   */
  @Get()
  async getUserPreferences(@Query('userId') userId: string) {
    const preferences = await this.preferencesService.getUserPreferences(userId);

    return {
      userId,
      preferences: preferences.map((p) => ({
        notificationType: p.notificationType,
        enabled: p.enabled,
        enabledChannels: p.enabledChannels,
        customSettings: p.customSettings,
        updatedAt: p.updatedAt,
      })),
    };
  }

  /**
   * 获取特定类型的通知偏好
   */
  @Get(':type')
  async getUserPreference(@Param('type') type: NotificationType, @Query('userId') userId: string) {
    const preference = await this.preferencesService.getUserPreference(userId, type);

    return {
      userId,
      notificationType: preference.notificationType,
      enabled: preference.enabled,
      enabledChannels: preference.enabledChannels,
      customSettings: preference.customSettings,
      updatedAt: preference.updatedAt,
    };
  }

  /**
   * 更新特定类型的通知偏好
   */
  @Put(':type')
  async updateUserPreference(
    @Param('type') type: NotificationType,
    @Query('userId') userId: string,
    @Body() dto: UpdatePreferenceDto
  ) {
    const preference = await this.preferencesService.updateUserPreference(userId, type, dto);

    return {
      success: true,
      message: 'Notification preference updated successfully',
      preference: {
        notificationType: preference.notificationType,
        enabled: preference.enabled,
        enabledChannels: preference.enabledChannels,
        customSettings: preference.customSettings,
        updatedAt: preference.updatedAt,
      },
    };
  }

  /**
   * 批量更新通知偏好
   */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  async batchUpdatePreferences(
    @Query('userId') userId: string,
    @Body() dto: BatchUpdatePreferencesDto
  ) {
    const preferences = await this.preferencesService.batchUpdatePreferences(
      userId,
      dto.preferences
    );

    return {
      success: true,
      message: `${preferences.length} preferences updated successfully`,
      updatedCount: preferences.length,
    };
  }

  /**
   * 重置为默认设置
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetToDefault(@Query('userId') userId: string) {
    const preferences = await this.preferencesService.resetToDefault(userId);

    return {
      success: true,
      message: 'Preferences reset to default successfully',
      totalPreferences: preferences.length,
    };
  }

  /**
   * 获取所有可用的通知类型
   */
  @Get('meta/types')
  async getAvailableNotificationTypes() {
    const types = getAllNotificationTypes();

    return {
      total: types.length,
      types: types.map((t) => ({
        type: t.type,
        description: t.description,
        priority: t.priority,
        defaultChannels: t.defaultChannels,
      })),
    };
  }

  /**
   * 获取用户通知偏好统计
   */
  @Get('meta/stats')
  async getUserPreferenceStats(@Query('userId') userId: string) {
    const stats = await this.preferencesService.getUserPreferenceStats(userId);

    return {
      userId,
      stats,
    };
  }

  /**
   * 检查用户是否应该接收某类型通知
   *
   * 内部 API，用于其他服务或通知发送逻辑
   */
  @Post('check')
  @HttpCode(HttpStatus.OK)
  async checkShouldReceive(
    @Body()
    body: {
      userId: string;
      notificationType: NotificationType;
      channel: NotificationChannel;
    }
  ) {
    const shouldReceive = await this.preferencesService.shouldReceiveNotification(
      body.userId,
      body.notificationType,
      body.channel
    );

    return {
      userId: body.userId,
      notificationType: body.notificationType,
      channel: body.channel,
      shouldReceive,
    };
  }

  /**
   * 获取用户在某个渠道启用的所有通知类型
   */
  @Get('channel/:channel')
  async getEnabledTypesForChannel(
    @Param('channel') channel: NotificationChannel,
    @Query('userId') userId: string
  ) {
    const types = await this.preferencesService.getEnabledNotificationTypes(userId, channel);

    return {
      userId,
      channel,
      enabledTypes: types,
      count: types.length,
    };
  }
}
