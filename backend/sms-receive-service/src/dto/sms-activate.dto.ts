import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  Max,
  IsIn,
} from 'class-validator';

// ============================================
// 请求 DTO
// ============================================

/**
 * 获取号码请求 DTO
 */
export class SmsActivateGetNumberDto {
  @ApiProperty({ description: '服务代码', example: 'telegram' })
  @IsString()
  service: string;

  @ApiPropertyOptional({ description: '国家ID（0=俄罗斯）', example: 0 })
  @IsNumber()
  @IsOptional()
  country?: number;

  @ApiPropertyOptional({ description: '运营商代码' })
  @IsString()
  @IsOptional()
  operator?: string;

  @ApiPropertyOptional({ description: '是否启用转发' })
  @IsBoolean()
  @IsOptional()
  forward?: boolean;

  @ApiPropertyOptional({ description: '排除的号码前缀' })
  @IsString()
  @IsOptional()
  phoneException?: string;
}

/**
 * 多服务号码请求 DTO
 */
export class SmsActivateMultiServiceDto {
  @ApiProperty({ description: '服务代码数组', example: ['telegram', 'whatsapp'] })
  @IsArray()
  @IsString({ each: true })
  services: string[];

  @ApiPropertyOptional({ description: '国家ID', example: 0 })
  @IsNumber()
  @IsOptional()
  country?: number;

  @ApiPropertyOptional({ description: '运营商代码' })
  @IsString()
  @IsOptional()
  operator?: string;

  @ApiPropertyOptional({ description: '转发服务数组' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  forward?: string[];

  @ApiPropertyOptional({ description: '排除的号码前缀' })
  @IsString()
  @IsOptional()
  phoneException?: string;
}

/**
 * 额外服务请求 DTO
 */
export class SmsActivateAdditionalServiceDto {
  @ApiProperty({ description: '服务代码', example: 'whatsapp' })
  @IsString()
  service: string;

  @ApiProperty({ description: '父激活ID', example: '123456789' })
  @IsString()
  parentActivationId: string;
}

/**
 * 设置状态请求 DTO
 */
export class SmsActivateSetStatusDto {
  @ApiProperty({ description: '激活ID', example: '123456789' })
  @IsString()
  activationId: string;

  @ApiProperty({
    description: '状态码（1=准备，3=重发，6=完成，8=取消）',
    example: 6,
    enum: [1, 3, 6, 8],
  })
  @IsNumber()
  @IsIn([1, 3, 6, 8])
  status: number;
}

/**
 * 租赁号码请求 DTO
 */
export class SmsActivateRentNumberDto {
  @ApiProperty({ description: '服务代码', example: 'telegram' })
  @IsString()
  service: string;

  @ApiPropertyOptional({ description: '国家ID', example: 0 })
  @IsNumber()
  @IsOptional()
  country?: number;

  @ApiPropertyOptional({ description: '租赁时长（小时）', example: 4, minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  hours?: number;

  @ApiPropertyOptional({ description: '运营商代码' })
  @IsString()
  @IsOptional()
  operator?: string;

  @ApiPropertyOptional({ description: 'Webhook URL' })
  @IsString()
  @IsOptional()
  webhookUrl?: string;
}

/**
 * 设置租赁状态请求 DTO
 */
export class SmsActivateSetRentStatusDto {
  @ApiProperty({ description: '租赁ID', example: '123456' })
  @IsString()
  rentId: string;

  @ApiProperty({ description: '状态码（1=完成，2=取消）', example: 1, enum: [1, 2] })
  @IsNumber()
  @IsIn([1, 2])
  status: 1 | 2;
}

/**
 * 价格查询 DTO
 */
export class SmsActivatePriceQueryDto {
  @ApiPropertyOptional({ description: '服务代码', example: 'telegram' })
  @IsString()
  @IsOptional()
  service?: string;

  @ApiPropertyOptional({ description: '国家ID', example: 0 })
  @IsNumber()
  @IsOptional()
  country?: number;
}

/**
 * 热门国家查询 DTO
 */
export class SmsActivateTopCountriesQueryDto {
  @ApiProperty({ description: '服务代码', example: 'telegram' })
  @IsString()
  service: string;

  @ApiPropertyOptional({ description: '是否使用自由价格' })
  @IsBoolean()
  @IsOptional()
  freePrice?: boolean;
}

/**
 * 可用号码查询 DTO
 */
export class SmsActivateNumbersStatusQueryDto {
  @ApiPropertyOptional({ description: '国家ID', example: 0 })
  @IsNumber()
  @IsOptional()
  country?: number;

  @ApiPropertyOptional({ description: '运营商代码' })
  @IsString()
  @IsOptional()
  operator?: string;
}

/**
 * 租赁服务查询 DTO
 */
export class SmsActivateRentServicesQueryDto {
  @ApiPropertyOptional({ description: '租赁时长（小时）', example: 4 })
  @IsNumber()
  @IsOptional()
  time?: number;

  @ApiPropertyOptional({ description: '运营商代码' })
  @IsString()
  @IsOptional()
  operator?: string;

  @ApiPropertyOptional({ description: '国家ID' })
  @IsNumber()
  @IsOptional()
  country?: number;
}

// ============================================
// 响应 DTO
// ============================================

/**
 * 国家信息 DTO
 */
export class SmsActivateCountryDto {
  @ApiProperty({ description: '国家ID', example: 0 })
  id: number;

  @ApiProperty({ description: '俄语名称', example: 'Россия' })
  rus: string;

  @ApiProperty({ description: '英语名称', example: 'Russia' })
  eng: string;

  @ApiProperty({ description: '中文名称', example: '俄罗斯' })
  chn: string;

  @ApiProperty({ description: '是否可见', example: true })
  visible: boolean;

  @ApiProperty({ description: '是否支持重试', example: true })
  retry: boolean;

  @ApiProperty({ description: '是否支持租赁', example: true })
  rent: boolean;

  @ApiProperty({ description: '是否支持多服务', example: true })
  multiService: boolean;
}

/**
 * 热门国家 DTO
 */
export class SmsActivateTopCountryDto {
  @ApiProperty({ description: '国家ID', example: 0 })
  country: number;

  @ApiProperty({ description: '可用数量', example: 10000 })
  count: number;

  @ApiProperty({ description: '价格', example: 15.5 })
  price: number;

  @ApiProperty({ description: '零售价格', example: 20.0 })
  retail_price: number;
}

/**
 * 当前激活 DTO
 */
export class SmsActivateCurrentActivationDto {
  @ApiProperty({ description: '激活ID', example: '123456789' })
  activationId: string;

  @ApiProperty({ description: '电话号码', example: '+79001234567' })
  phoneNumber: string;

  @ApiProperty({ description: '激活成本', example: '15.50' })
  activationCost: string;

  @ApiProperty({ description: '激活状态', example: 'STATUS_WAIT_CODE' })
  activationStatus: string;

  @ApiPropertyOptional({ description: '验证码', example: '123456' })
  smsCode: string | null;

  @ApiPropertyOptional({ description: '短信内容' })
  smsText: string | null;

  @ApiProperty({ description: '激活时间', example: '2024-01-15T10:30:00Z' })
  activationTime: string;

  @ApiProperty({ description: '是否可以获取另一个短信', example: true })
  canGetAnotherSms: boolean;

  @ApiProperty({ description: '国家代码', example: '0' })
  countryCode: string;

  @ApiProperty({ description: '服务代码', example: 'tg' })
  serviceCode: string;
}

/**
 * 租赁短信 DTO
 */
export class SmsActivateRentSmsDto {
  @ApiProperty({ description: '发送方号码', example: '+79001234567' })
  phoneFrom: string;

  @ApiProperty({ description: '短信内容', example: 'Your code is 123456' })
  text: string;

  @ApiProperty({ description: '接收时间', example: '2024-01-15T10:30:00Z' })
  date: string;
}

/**
 * 租赁状态 DTO
 */
export class SmsActivateRentStatusDto {
  @ApiProperty({ description: '状态', example: 'active' })
  status: string;

  @ApiProperty({ description: '短信数量', example: 2 })
  quantity: number;

  @ApiProperty({ description: '短信列表', type: [SmsActivateRentSmsDto] })
  values: SmsActivateRentSmsDto[];
}

/**
 * 租赁列表项 DTO
 */
export class SmsActivateRentItemDto {
  @ApiProperty({ description: '租赁ID', example: 123456 })
  id: number;

  @ApiProperty({ description: '电话号码', example: '+79001234567' })
  phone: string;

  @ApiProperty({ description: '状态', example: 'active' })
  status: string;

  @ApiProperty({ description: '结束时间', example: '2024-01-16T10:30:00Z' })
  endDate: string;
}

/**
 * 余额和返现 DTO
 */
export class SmsActivateBalanceAndCashBackDto {
  @ApiProperty({ description: '余额', example: 100.50 })
  balance: number;

  @ApiProperty({ description: '返现', example: 10.25 })
  cashBack: number;

  @ApiProperty({ description: '货币', example: 'RUB' })
  currency: string;
}

/**
 * 完整短信 DTO
 */
export class SmsActivateFullSmsDto {
  @ApiPropertyOptional({ description: '验证码', example: '123456' })
  code: string | null;

  @ApiPropertyOptional({ description: '完整短信内容' })
  fullSms: string | null;
}

/**
 * 通用成功响应 DTO
 */
export class SmsActivateSuccessDto {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '消息', example: 'Operation completed successfully' })
  message: string;

  @ApiPropertyOptional({ description: '附加数据' })
  data?: any;
}

/**
 * 服务代码映射 DTO
 */
export class SmsActivateServiceMappingDto {
  @ApiProperty({
    description: '服务代码映射',
    example: { telegram: 'tg', whatsapp: 'wa' },
  })
  mapping: Record<string, string>;
}
