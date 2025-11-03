import { Controller, Post, Get, Body, Query, UseGuards, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SmsService } from './sms.service';
import { OtpService, OtpType } from './otp.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  IsPhoneNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 发送短信 DTO
 */
export class SendSmsDto {
  @IsPhoneNumber(undefined, { message: '请提供有效的国际电话号码 (例如: +1234567890)' })
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  from?: string;
}

/**
 * 发送验证码 DTO (旧版，保留兼容性)
 */
export class SendOtpDto {
  @IsPhoneNumber(undefined, { message: '请提供有效的国际电话号码 (例如: +1234567890)' })
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  expiryMinutes?: number;
}

/**
 * 发送 OTP 验证码 DTO (新版)
 */
export class SendOtpV2Dto {
  @IsPhoneNumber(undefined, { message: '请提供有效的国际电话号码 (例如: +1234567890)' })
  phoneNumber: string;

  @IsEnum(OtpType, { message: '无效的验证码类型' })
  type: OtpType;

  @IsOptional()
  @IsString()
  customMessage?: string;
}

/**
 * 验证 OTP 验证码 DTO
 */
export class VerifyOtpDto {
  @IsPhoneNumber(undefined, { message: '请提供有效的国际电话号码 (例如: +1234567890)' })
  phoneNumber: string;

  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  code: string;

  @IsEnum(OtpType, { message: '无效的验证码类型' })
  type: OtpType;
}

/**
 * 批量发送短信 DTO
 */
export class SendBatchSmsDto {
  @IsPhoneNumber(undefined, { each: true, message: '所有电话号码必须是有效的国际格式' })
  phoneNumbers: string[];

  @IsString()
  @IsNotEmpty()
  message: string;
}

/**
 * 查询 SMS 记录 DTO
 */
export class QuerySmsDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}

/**
 * SMS 控制器
 *
 * 提供短信发送和管理的 HTTP API
 *
 * 使用双层守卫：
 * 1. JwtAuthGuard - 验证 JWT token，设置 request.user
 * 2. PermissionsGuard - 检查用户权限
 *
 * 端点:
 * - POST /sms/send - 发送单条短信
 * - POST /sms/send-otp - 发送验证码
 * - POST /sms/send-batch - 批量发送短信
 * - GET /sms/stats - 获取发送统计
 * - GET /sms/health - 健康检查 (公开)
 */
@ApiTags('SMS')
@Controller('sms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SmsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly otpService: OtpService
  ) {}

  /**
   * 查询 SMS 记录列表
   * GET /sms?status=sent&page=1&limit=10
   */
  @Get()
  @RequirePermission('sms.read')
  async findAll(@Query() query: QuerySmsDto) {
    return this.smsService.findAll(query);
  }

  /**
   * 根据 ID 查询 SMS 记录
   * GET /sms/:id
   */
  @Get(':id')
  @RequirePermission('sms.read')
  async findOne(@Param('id') id: string) {
    return this.smsService.findOne(id);
  }

  /**
   * 发送单条短信
   */
  @Post('send')
  @RequirePermission('sms.send')
  async send(@Body() dto: SendSmsDto) {
    const result = await this.smsService.send({
      to: dto.phoneNumber,
      message: dto.message,
      from: dto.from,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }

  /**
   * 发送验证码
   */
  @Post('send-otp')
  @RequirePermission('sms.otp-send')
  async sendOtp(@Body() dto: SendOtpDto) {
    const result = await this.smsService.sendOtp(dto.phoneNumber, dto.code, dto.expiryMinutes);

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }

  /**
   * 批量发送短信
   */
  @Post('send-batch')
  @RequirePermission('sms.send-batch')
  async sendBatch(@Body() dto: SendBatchSmsDto) {
    const results = await this.smsService.sendBatch(dto.phoneNumbers, dto.message);

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return {
      total: results.length,
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * 获取发送统计
   */
  @Get('stats')
  @RequirePermission('sms.stats')
  async getStats() {
    return this.smsService.getAllStats();
  }

  /**
   * 健康检查 (公开端点，无需认证)
   */
  @Public()
  @Get('health')
  async healthCheck() {
    return this.smsService.healthCheck();
  }

  /**
   * 验证手机号格式
   */
  @Get('validate')
  @RequirePermission('sms.validate')
  async validatePhoneNumber(@Query('phoneNumber') phoneNumber: string) {
    const isValid = this.smsService.validatePhoneNumber(phoneNumber);

    return {
      phoneNumber,
      isValid,
      format: isValid
        ? 'Valid international format'
        : 'Invalid format (expected: +[country code][number])',
    };
  }

  // ========================================
  // OTP 验证码相关端点 (新版)
  // ========================================

  /**
   * 发送 OTP 验证码 (新版)
   *
   * 支持多种验证码类型:
   * - registration: 注册验证
   * - login: 登录验证
   * - password_reset: 密码重置
   * - phone_verify: 手机号验证
   * - payment: 支付确认
   * - device_op: 设备操作
   */
  @Post('otp/send')
  @RequirePermission('sms.otp-send')
  async sendOtpV2(@Body() dto: SendOtpV2Dto) {
    const result = await this.otpService.sendOtp(dto.phoneNumber, dto.type, dto.customMessage);

    return result;
  }

  /**
   * 验证 OTP 验证码
   */
  @Post('otp/verify')
  @RequirePermission('sms.otp-verify')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.otpService.verifyOtp(dto.phoneNumber, dto.code, dto.type);

    return result;
  }

  /**
   * 检查是否有活跃的验证码
   */
  @Get('otp/active')
  @RequirePermission('sms.otp-active')
  async hasActiveOtp(@Query('phoneNumber') phoneNumber: string, @Query('type') type: OtpType) {
    const hasActive = await this.otpService.hasActiveOtp(phoneNumber, type);
    const remainingTtl = hasActive ? await this.otpService.getRemainingTtl(phoneNumber, type) : 0;

    return {
      phoneNumber,
      type,
      hasActive,
      remainingSeconds: remainingTtl > 0 ? remainingTtl : 0,
    };
  }

  /**
   * 获取剩余重试次数
   */
  @Get('otp/retries')
  @RequirePermission('sms.otp-retries')
  async getRemainingRetries(
    @Query('phoneNumber') phoneNumber: string,
    @Query('type') type: OtpType
  ) {
    const retries = await this.otpService.getRemainingRetries(phoneNumber, type);

    return {
      phoneNumber,
      type,
      remainingRetries: retries,
    };
  }

  /**
   * 获取 OTP 统计信息
   */
  @Get('otp/stats')
  @RequirePermission('sms.otp-stats')
  async getOtpStats() {
    return this.otpService.getStats();
  }

  /**
   * 清除验证码 (测试/管理用)
   *
   * 需要管理员权限
   */
  @Post('otp/clear')
  @RequirePermission('sms.otp-clear')
  async clearOtp(@Body() body: { phoneNumber: string; type: OtpType }) {
    await this.otpService.clearOtp(body.phoneNumber, body.type);

    return {
      success: true,
      message: 'OTP cleared successfully',
    };
  }
}
