import { IsString, IsOptional, IsDateString, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

/**
 * 登录历史查询参数
 */
export class LoginHistoryQueryDto {
  @ApiPropertyOptional({ description: '开始日期', example: '2024-01-01' })
  @IsOptional()
  @IsDateString({}, { message: '开始日期格式无效' })
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2024-12-31' })
  @IsOptional()
  @IsDateString({}, { message: '结束日期格式无效' })
  endDate?: string;

  @ApiPropertyOptional({ description: '是否成功', example: true })
  @IsOptional()
  @IsBoolean({ message: '必须是布尔值' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  success?: boolean;

  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

/**
 * 终止会话 DTO
 */
export class TerminateSessionDto {
  @ApiProperty({ description: '会话ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('4', { message: '会话ID必须是有效的UUID' })
  sessionId: string;

  @ApiPropertyOptional({ description: '终止原因', example: '用户手动终止' })
  @IsOptional()
  @IsString({ message: '原因必须是字符串' })
  reason?: string;
}

/**
 * 会话响应 DTO
 */
export class SessionResponseDto {
  @ApiProperty({ description: '会话ID' })
  id: string;

  @ApiProperty({ description: '设备类型' })
  deviceType: string;

  @ApiProperty({ description: '设备名称' })
  deviceName: string;

  @ApiProperty({ description: '浏览器' })
  browser: string;

  @ApiProperty({ description: '操作系统' })
  os: string;

  @ApiProperty({ description: 'IP地址' })
  ip: string;

  @ApiProperty({ description: '位置' })
  location: string;

  @ApiProperty({ description: '是否为当前会话' })
  isCurrent: boolean;

  @ApiProperty({ description: '最后活跃时间' })
  lastActiveAt: Date;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}

/**
 * 登录历史响应 DTO
 */
export class LoginHistoryResponseDto {
  @ApiProperty({ description: '记录ID' })
  id: string;

  @ApiProperty({ description: '登录结果' })
  result: string;

  @ApiProperty({ description: 'IP地址' })
  ip: string;

  @ApiProperty({ description: '位置' })
  location: string;

  @ApiProperty({ description: '设备类型' })
  deviceType: string;

  @ApiProperty({ description: '浏览器' })
  browser: string;

  @ApiProperty({ description: '操作系统' })
  os: string;

  @ApiProperty({ description: '是否使用2FA' })
  used2FA: boolean;

  @ApiProperty({ description: '登录时间' })
  createdAt: Date;
}
