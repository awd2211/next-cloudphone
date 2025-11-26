import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 5sim 订单查询参数 DTO
 */
export class FiveSimOrderQueryDto {
  @ApiPropertyOptional({
    description: '订单类型',
    enum: ['activation', 'hosting'],
    example: 'activation',
  })
  @IsOptional()
  @IsEnum(['activation', 'hosting'])
  category?: 'activation' | 'hosting';

  @ApiPropertyOptional({
    description: '分页限制',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: '分页偏移',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['id', 'date'],
    example: 'date',
  })
  @IsOptional()
  @IsEnum(['id', 'date'])
  order?: 'id' | 'date';

  @ApiPropertyOptional({
    description: '是否倒序',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  reverse?: boolean;
}

/**
 * 5sim 订单响应 DTO
 */
export class FiveSimOrderDto {
  @ApiProperty({ description: '订单ID', example: 12345 })
  id: number;

  @ApiProperty({ description: '手机号码', example: '+79001234567' })
  phone: string;

  @ApiProperty({ description: '服务名称', example: 'telegram' })
  product: string;

  @ApiPropertyOptional({ description: '国家代码', example: 'russia' })
  country?: string;

  @ApiProperty({ description: '运营商', example: 'mts' })
  operator: string;

  @ApiProperty({ description: '价格', example: 15.5 })
  price: number;

  @ApiProperty({ description: '状态', example: 'FINISHED' })
  status: string;

  @ApiProperty({ description: '创建时间', example: '2024-01-15T10:30:00Z' })
  created_at: string;

  @ApiPropertyOptional({ description: '过期时间', example: '2024-01-15T11:30:00Z' })
  expires?: string;

  @ApiPropertyOptional({ description: '接收到的短信' })
  sms?: any[];
}

/**
 * 5sim 支付记录响应 DTO
 */
export class FiveSimPaymentDto {
  @ApiProperty({ description: '支付ID', example: 12345 })
  id: number;

  @ApiProperty({ description: '支付类型', example: 'deposit' })
  type: string;

  @ApiProperty({ description: '供应商', example: 'paypal' })
  provider: string;

  @ApiProperty({ description: '金额', example: 100.0 })
  amount: number;

  @ApiProperty({ description: '余额', example: 250.5 })
  balance: number;

  @ApiProperty({ description: '创建时间', example: '2024-01-15T10:30:00Z' })
  created_at: string;
}

/**
 * 5sim 短信消息 DTO
 */
export class FiveSimSmsDto {
  @ApiProperty({ description: '短信ID', example: 12345 })
  id: number;

  @ApiProperty({ description: '创建时间', example: '2024-01-15T10:30:00Z' })
  created_at: string;

  @ApiProperty({ description: '接收日期', example: '2024-01-15' })
  date: string;

  @ApiProperty({ description: '发送者', example: 'Telegram' })
  sender: string;

  @ApiProperty({ description: '短信内容', example: 'Your code is 123456' })
  text: string;

  @ApiProperty({ description: '提取的验证码', example: '123456' })
  code: string;
}

/**
 * 5sim 价格上限响应 DTO
 */
export class FiveSimMaxPriceDto {
  @ApiProperty({ description: '国家', example: 'russia' })
  country: string;

  @ApiProperty({ description: '服务', example: 'telegram' })
  product: string;

  @ApiProperty({ description: '最高价格', example: 20.0 })
  maxPrice: number;
}

/**
 * 5sim 租用号码请求 DTO
 */
export class RentNumberDto {
  @ApiProperty({ description: '服务名称', example: 'telegram' })
  @IsString()
  service: string;

  @ApiProperty({ description: '国家（名称或代码）', example: 'russia' })
  @IsString()
  country: string;

  @ApiPropertyOptional({
    description: '租用小时数',
    example: 24,
    minimum: 1,
    maximum: 8760,
    default: 24,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(8760)
  hours?: number;
}

/**
 * 5sim 国家信息 DTO
 */
export class FiveSimCountryDto {
  @ApiProperty({ description: '国家名称（英文）', example: 'Russia' })
  name: string;

  @ApiProperty({ description: 'ISO 国家代码', example: 'ru' })
  iso: string;

  @ApiProperty({ description: '电话前缀', example: '7' })
  prefix: string;
}

/**
 * 5sim 运营商信息 DTO
 */
export class FiveSimOperatorDto {
  @ApiProperty({ description: '运营商名称', example: 'mts' })
  name: string;

  @ApiProperty({
    description: '各服务的价格',
    example: { telegram: 15.5, whatsapp: 20.0 },
  })
  prices: Record<string, number>;
}

/**
 * 通用成功响应 DTO
 */
export class FiveSimSuccessDto {
  @ApiProperty({ description: '操作是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '消息', example: 'Operation completed successfully' })
  message: string;

  @ApiPropertyOptional({ description: '额外数据' })
  data?: any;
}

/**
 * 5sim 价格查询参数 DTO
 */
export class FiveSimPriceQueryDto {
  @ApiPropertyOptional({
    description: '国家代码或名称',
    example: 'russia',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: '产品/服务代码',
    example: 'telegram',
  })
  @IsOptional()
  @IsString()
  product?: string;
}

/**
 * 5sim 运营商价格详情 DTO
 */
export class FiveSimOperatorPriceDto {
  @ApiProperty({ description: '价格', example: 15.5 })
  cost: number;

  @ApiProperty({ description: '可用数量', example: 1000 })
  count: number;

  @ApiPropertyOptional({ description: '成功率', example: 0.95 })
  rate?: number;
}

/**
 * 5sim 价格信息响应 DTO
 */
export class FiveSimPriceInfoDto {
  @ApiProperty({
    description: '按国家/产品/运营商分组的价格信息',
    example: {
      russia: {
        telegram: {
          mts: { cost: 15.5, count: 1000, rate: 0.95 },
          beeline: { cost: 14.0, count: 500 },
        },
      },
    },
  })
  prices: Record<string, Record<string, Record<string, FiveSimOperatorPriceDto>>>;
}

/**
 * 5sim 系统通知 DTO
 */
export class FiveSimNotificationDto {
  @ApiProperty({ description: '通知ID', example: 123 })
  id: number;

  @ApiProperty({ description: '通知内容', example: 'System maintenance scheduled...' })
  text: string;

  @ApiProperty({ description: '通知类型', enum: ['info', 'warning', 'error'], example: 'info' })
  type: string;

  @ApiProperty({ description: '创建时间', example: '2024-01-15T10:30:00Z' })
  created_at: string;
}

/**
 * 5sim 系统通知查询参数 DTO
 */
export class FiveSimNotificationQueryDto {
  @ApiPropertyOptional({
    description: '语言代码',
    example: 'en',
    default: 'en',
    enum: ['en', 'ru', 'cn', 'de', 'fr', 'es'],
  })
  @IsOptional()
  @IsString()
  language?: string;
}

/**
 * 5sim 设置价格上限请求 DTO
 */
export class FiveSimSetMaxPriceDto {
  @ApiProperty({ description: '国家代码或名称', example: 'russia' })
  @IsString()
  country: string;

  @ApiProperty({ description: '产品/服务代码', example: 'telegram' })
  @IsString()
  product: string;

  @ApiProperty({
    description: '价格上限（单位：卢布）',
    example: 20.0,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  price: number;
}

/**
 * 5sim 删除价格上限请求 DTO
 */
export class FiveSimDeleteMaxPriceDto {
  @ApiProperty({ description: '国家代码或名称', example: 'russia' })
  @IsString()
  country: string;

  @ApiProperty({ description: '产品/服务代码', example: 'telegram' })
  @IsString()
  product: string;
}
