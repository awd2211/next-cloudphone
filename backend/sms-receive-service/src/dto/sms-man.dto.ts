import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';

/**
 * SMS-Man 获取号码请求 DTO
 */
export class SmsManGetNumberDto {
  @ApiProperty({ description: '服务代码', example: 'telegram' })
  @IsString()
  service: string;

  @ApiPropertyOptional({ description: '国家代码', example: 0, default: 0 })
  @IsNumber()
  @IsOptional()
  country?: number;

  @ApiPropertyOptional({ description: '运营商代码' })
  @IsString()
  @IsOptional()
  operator?: string;
}

/**
 * SMS-Man 设置状态请求 DTO
 */
export class SmsManSetStatusDto {
  @ApiProperty({ description: '激活ID' })
  @IsString()
  activationId: string;

  @ApiProperty({ description: '状态码 (1=准备, 3=重发, 6=完成, 8=取消)', enum: [1, 3, 6, 8] })
  @IsNumber()
  @IsEnum([1, 3, 6, 8])
  status: number;
}

/**
 * SMS-Man 价格查询 DTO
 */
export class SmsManPriceQueryDto {
  @ApiPropertyOptional({ description: '服务代码' })
  @IsString()
  @IsOptional()
  service?: string;

  @ApiPropertyOptional({ description: '国家代码' })
  @IsNumber()
  @IsOptional()
  country?: number;
}

/**
 * SMS-Man 国家信息响应 DTO
 */
export class SmsManCountryDto {
  @ApiProperty({ description: '国家ID' })
  id: number;

  @ApiProperty({ description: '国家名称（俄语）' })
  name: string;

  @ApiProperty({ description: '国家名称（英语）' })
  name_en: string;
}

/**
 * SMS-Man 服务信息响应 DTO
 */
export class SmsManServiceDto {
  @ApiProperty({ description: '服务ID' })
  id: number;

  @ApiProperty({ description: '服务名称（俄语）' })
  name: string;

  @ApiProperty({ description: '服务名称（英语）' })
  name_en: string;
}

/**
 * SMS-Man 余额响应 DTO
 */
export class SmsManBalanceDto {
  @ApiProperty({ description: '余额' })
  balance: number;

  @ApiProperty({ description: '货币', default: 'RUB' })
  currency: string;
}

/**
 * SMS-Man 通用成功响应 DTO
 */
export class SmsManSuccessDto {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '消息' })
  message: string;

  @ApiPropertyOptional({ description: '额外数据' })
  data?: any;
}

/**
 * SMS-Man 服务映射响应 DTO
 */
export class SmsManServiceMappingDto {
  @ApiProperty({ description: '服务代码映射表' })
  mapping: Record<string, string>;
}
