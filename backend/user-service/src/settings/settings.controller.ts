import { Controller, Get, Put, Body, Param, Delete, UseGuards, Post } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingCategory } from './entities/setting.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * 获取所有设置
   * GET /settings
   * 🔒 需要 admin 角色
   */
  @Get()
  @Roles('admin')
  getAll() {
    return this.settingsService.getAll();
  }

  /**
   * 获取指定类别的设置
   * GET /settings/:category
   * 🔒 需要 admin 角色
   */
  @Get(':category')
  @Roles('admin')
  getByCategory(@Param('category') category: SettingCategory) {
    return this.settingsService.getByCategory(category);
  }

  /**
   * 更新基本设置
   * PUT /settings/basic
   * 🔒 需要 admin 角色
   */
  @Put('basic')
  @Roles('admin')
  async updateBasic(@Body() data: Record<string, any>) {
    await this.settingsService.updateCategory(SettingCategory.BASIC, data);
    return { success: true, message: 'Basic settings updated' };
  }

  /**
   * 更新邮件设置
   * PUT /settings/email
   * 🔒 需要 admin 角色
   */
  @Put('email')
  @Roles('admin')
  async updateEmail(@Body() data: Record<string, any>) {
    await this.settingsService.updateCategory(SettingCategory.EMAIL, data);
    return { success: true, message: 'Email settings updated' };
  }

  /**
   * 更新短信设置
   * PUT /settings/sms
   * 🔒 需要 admin 角色
   */
  @Put('sms')
  @Roles('admin')
  async updateSms(@Body() data: Record<string, any>) {
    await this.settingsService.updateCategory(SettingCategory.SMS, data);
    return { success: true, message: 'SMS settings updated' };
  }

  /**
   * 更新支付设置
   * PUT /settings/payment
   * 🔒 需要 admin 角色
   */
  @Put('payment')
  @Roles('admin')
  async updatePayment(@Body() data: Record<string, any>) {
    await this.settingsService.updateCategory(SettingCategory.PAYMENT, data);
    return { success: true, message: 'Payment settings updated' };
  }

  /**
   * 更新存储设置
   * PUT /settings/storage
   * 🔒 需要 admin 角色
   */
  @Put('storage')
  @Roles('admin')
  async updateStorage(@Body() data: Record<string, any>) {
    await this.settingsService.updateCategory(SettingCategory.STORAGE, data);
    return { success: true, message: 'Storage settings updated' };
  }

  /**
   * 初始化默认设置
   * POST /settings/initialize
   * 🔒 需要 admin 角色
   */
  @Post('initialize')
  @Roles('admin')
  async initialize() {
    await this.settingsService.initializeDefaults();
    return { success: true, message: 'Default settings initialized' };
  }
}
