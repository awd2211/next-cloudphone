import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, IsInt } from 'class-validator';

/**
 * Kookeey 配置 DTO
 */
export class KookeeyConfigDto {
  @ApiProperty({ description: 'Developer ID (accessid)', example: '12345' })
  @IsString()
  accessId: string;

  @ApiProperty({ description: 'Developer Token (用于签名)', example: 'your-secret-token' })
  @IsString()
  token: string;

  @ApiPropertyOptional({ description: 'API 端点', default: 'https://kookeey.com' })
  @IsOptional()
  @IsString()
  apiUrl?: string;
}

/**
 * Kookeey 库存查询 DTO
 */
export class KookeeyStockDto {
  @ApiProperty({ description: '分组ID', example: 433 })
  groupId: number;

  @ApiProperty({ description: '可用库存数量', example: 1500 })
  availableStock: number;

  @ApiProperty({ description: '总库存', example: 2000 })
  totalStock?: number;

  @ApiProperty({ description: '国家/地区', example: 'US' })
  country?: string;
}

/**
 * Kookeey 余额查询 DTO
 */
export class KookeeyBalanceDto {
  @ApiProperty({ description: '账户余额', example: 100.50 })
  balance: number;

  @ApiProperty({ description: '货币单位', example: 'USD' })
  currency?: string;

  @ApiProperty({ description: '剩余流量（MB）', example: 5000 })
  remainingBandwidthMB?: number;

  @ApiProperty({ description: '剩余流量（GB）', example: 4.88 })
  remainingBandwidthGB?: number;
}

/**
 * Kookeey 提取代理 DTO
 */
export class KookeeyExtractProxyDto {
  @ApiProperty({ description: '分组ID', example: 433 })
  @IsInt()
  @Min(1)
  groupId: number;

  @ApiPropertyOptional({ description: '提取数量', example: 10, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  num?: number;

  @ApiPropertyOptional({ description: '返回格式', example: 'json', default: 'json' })
  @IsOptional()
  @IsString()
  format?: 'json' | 'txt';

  @ApiPropertyOptional({ description: '国家代码', example: 'US' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: '州/省', example: 'California' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: '城市', example: 'Los Angeles' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'IP时效（分钟）', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;
}

/**
 * Kookeey 代理信息 DTO
 */
export class KookeeyProxyDto {
  @ApiProperty({ description: '代理ID' })
  id: string;

  @ApiProperty({ description: '代理主机' })
  host: string;

  @ApiProperty({ description: '代理端口' })
  port: number;

  @ApiPropertyOptional({ description: '用户名' })
  username?: string;

  @ApiPropertyOptional({ description: '密码' })
  password?: string;

  @ApiProperty({ description: '协议类型', example: 'http' })
  protocol: string;

  @ApiPropertyOptional({ description: '国家/地区' })
  country?: string;

  @ApiPropertyOptional({ description: '州/省' })
  state?: string;

  @ApiPropertyOptional({ description: '城市' })
  city?: string;

  @ApiPropertyOptional({ description: '过期时间' })
  expiresAt?: Date;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}

/**
 * Kookeey 代理列表 DTO
 */
export class KookeeyProxyListDto {
  @ApiProperty({ description: '代理列表', type: [KookeeyProxyDto] })
  proxies: KookeeyProxyDto[];

  @ApiProperty({ description: '总数' })
  total: number;
}

/**
 * Kookeey 订单信息 DTO
 */
export class KookeeyOrderDto {
  @ApiProperty({ description: '订单ID' })
  orderId: string;

  @ApiProperty({ description: '分组ID' })
  groupId: number;

  @ApiProperty({ description: '套餐名称' })
  packageName?: string;

  @ApiProperty({ description: '购买数量' })
  quantity: number;

  @ApiProperty({ description: '订单金额' })
  amount: number;

  @ApiProperty({ description: '订单状态', example: 'active' })
  status: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '过期时间' })
  expiresAt?: Date;
}

/**
 * Kookeey 订单列表 DTO
 */
export class KookeeyOrderListDto {
  @ApiProperty({ description: '订单列表', type: [KookeeyOrderDto] })
  orders: KookeeyOrderDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;
}

/**
 * Kookeey 使用统计 DTO
 */
export class KookeeyUsageStatsDto {
  @ApiProperty({ description: '总请求数' })
  totalRequests: number;

  @ApiProperty({ description: '成功请求数' })
  successfulRequests: number;

  @ApiProperty({ description: '失败请求数' })
  failedRequests: number;

  @ApiProperty({ description: '成功率（%）' })
  successRate: number;

  @ApiProperty({ description: '总流量（MB）' })
  totalBandwidthMB: number;

  @ApiProperty({ description: '总流量（GB）' })
  totalBandwidthGB: number;

  @ApiProperty({ description: '平均延迟（毫秒）' })
  averageLatency?: number;

  @ApiProperty({ description: '统计周期开始时间' })
  periodStart: Date;

  @ApiProperty({ description: '统计周期结束时间' })
  periodEnd: Date;
}
