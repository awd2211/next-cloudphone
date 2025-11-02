import { IsString, IsOptional, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 请求虚拟 SMS 号码 DTO
 *
 * 用于为设备请求一个虚拟手机号码，用于接收短信验证码
 */
export class RequestSmsDto {
  @ApiProperty({
    description: '国家代码 (ISO 3166-1 alpha-2)',
    example: 'RU',
    examples: ['RU', 'US', 'CN', 'IN'],
  })
  @IsString()
  country: string;

  @ApiPropertyOptional({
    description: '目标服务名称（可选，如 telegram、whatsapp、discord）',
    example: 'telegram',
    examples: ['telegram', 'whatsapp', 'discord', 'twitter', 'facebook'],
  })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({
    description: '操作员名称（可选，如 mts、beeline、megafon）',
    example: 'any',
  })
  @IsOptional()
  @IsString()
  operator?: string;
}

/**
 * 批量请求虚拟 SMS 号码 DTO
 *
 * 用于为多个设备批量请求虚拟手机号码
 */
export class BatchRequestSmsDto {
  @ApiProperty({
    description: '设备 ID 数组',
    example: ['device-1', 'device-2', 'device-3'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  deviceIds: string[];

  @ApiProperty({
    description: '国家代码 (ISO 3166-1 alpha-2)',
    example: 'RU',
  })
  @IsString()
  country: string;

  @ApiPropertyOptional({
    description: '目标服务名称（可选）',
    example: 'telegram',
  })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({
    description: '操作员名称（可选）',
    example: 'any',
  })
  @IsOptional()
  @IsString()
  operator?: string;
}

/**
 * 取消虚拟 SMS 号码 DTO
 *
 * 用于取消设备的虚拟手机号码（主动取消或号码已使用完毕）
 */
export class CancelSmsDto {
  @ApiPropertyOptional({
    description: '取消原因（可选）',
    example: 'Number no longer needed',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * 虚拟 SMS 号码响应 DTO
 *
 * 返回请求成功后的虚拟号码信息
 */
export interface SmsNumberResponse {
  /**
   * 请求 ID
   */
  requestId: string;

  /**
   * 设备 ID
   */
  deviceId: string;

  /**
   * 虚拟手机号码
   */
  phoneNumber: string;

  /**
   * 号码国家代码
   */
  country: string;

  /**
   * 目标服务
   */
  service?: string;

  /**
   * 号码状态
   */
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'expired';

  /**
   * 过期时间
   */
  expiresAt: string;

  /**
   * 请求时间
   */
  requestedAt: string;
}

/**
 * 批量 SMS 号码请求响应 DTO
 */
export interface BatchSmsNumberResponse {
  /**
   * 成功的请求
   */
  successful: SmsNumberResponse[];

  /**
   * 失败的请求
   */
  failed: Array<{
    deviceId: string;
    error: string;
  }>;

  /**
   * 统计信息
   */
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * SMS 验证码消息 DTO
 *
 * 设备接收到的短信验证码信息
 */
export interface SmsMessageDto {
  /**
   * 消息 ID
   */
  messageId: string;

  /**
   * 验证码
   */
  verificationCode: string;

  /**
   * 虚拟手机号码
   */
  phoneNumber: string;

  /**
   * 服务名称
   */
  service?: string;

  /**
   * 接收时间
   */
  receivedAt: string;

  /**
   * 推送到设备的时间
   */
  pushedAt?: string;
}
