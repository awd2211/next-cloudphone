import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

/**
 * IPIDEA 流量统计 DTO
 */
export class IPIDEAFlowStatsDto {
  @ApiProperty({ description: '剩余流量（MB）', example: 5000 })
  flowLeftMB: number;

  @ApiProperty({ description: '剩余流量（GB）', example: 4.88 })
  flowLeftGB: number;

  @ApiProperty({ description: '总流量（MB）', example: 10000 })
  totalFlowMB?: number;

  @ApiProperty({ description: '已使用流量（MB）', example: 5000 })
  usedFlowMB?: number;

  @ApiProperty({ description: '使用百分比', example: 50 })
  usagePercentage?: number;
}

/**
 * IPIDEA 流量使用记录 DTO
 */
export class IPIDEAUsageRecordDto {
  @ApiProperty({ description: '总流量使用（MB）', example: 1250 })
  totalFlowMB: number;

  @ApiProperty({ description: '总流量使用（GB）', example: 1.22 })
  totalFlowGB: number;

  @ApiProperty({ description: '总请求数', example: 5000 })
  totalRequests?: number;

  @ApiProperty({ description: '成功请求数', example: 4800 })
  successfulRequests?: number;

  @ApiProperty({ description: '失败请求数', example: 200 })
  failedRequests?: number;

  @ApiProperty({ description: '成功率（%）', example: 96 })
  successRate?: number;

  @ApiProperty({ description: '平均延迟（毫秒）', example: 250 })
  averageLatency?: number;

  @ApiProperty({ description: '统计周期开始时间' })
  periodStart: Date;

  @ApiProperty({ description: '统计周期结束时间' })
  periodEnd: Date;

  @ApiPropertyOptional({ description: '每日使用记录' })
  dailyRecords?: Array<{
    date: string;
    flowMB: number;
    requests: number;
  }>;
}

/**
 * IPIDEA 设置流量预警 DTO
 */
export class IPIDEAFlowWarningDto {
  @ApiProperty({ description: '预警阈值（MB）', example: 1000 })
  @IsNumber()
  @Min(1)
  thresholdMB: number;
}

/**
 * IPIDEA 白名单操作 DTO
 */
export class IPIDEAWhitelistDto {
  @ApiProperty({ description: 'IP 地址', example: '192.168.1.100' })
  @IsString()
  ip: string;
}

/**
 * IPIDEA 认证账户信息 DTO
 */
export class IPIDEAAccountDto {
  @ApiProperty({ description: '账户ID' })
  id: string;

  @ApiProperty({ description: '账户名称' })
  account: string;

  @ApiProperty({ description: '账户密码（已脱敏）' })
  password: string;

  @ApiPropertyOptional({ description: '流量限制（MB）' })
  flowLimit?: number;

  @ApiPropertyOptional({ description: '已使用流量（MB）' })
  flowUsed?: number;

  @ApiPropertyOptional({ description: '剩余流量（MB）' })
  flowRemaining?: number;

  @ApiPropertyOptional({ description: '地区' })
  region?: string;

  @ApiPropertyOptional({ description: '状态' })
  status?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}

/**
 * IPIDEA 账户列表 DTO
 */
export class IPIDEAAccountListDto {
  @ApiProperty({ description: '账户列表', type: [IPIDEAAccountDto] })
  accounts: IPIDEAAccountDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;
}

/**
 * IPIDEA 配置扩展字段
 */
export class IPIDEAConfigDto {
  @ApiProperty({ description: 'IPIDEA AppKey（用于API认证）' })
  @IsString()
  apiKey: string;

  @ApiProperty({ description: '代理认证用户名' })
  @IsString()
  username: string;

  @ApiProperty({ description: '代理认证密码' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: '用户专属网关地址', example: 'e255c08e04856698.lqz.na.ipidea.online' })
  @IsOptional()
  @IsString()
  gateway?: string;

  @ApiPropertyOptional({ description: '代理端口', example: 2336, default: 2336 })
  @IsOptional()
  @IsNumber()
  port?: number;

  @ApiPropertyOptional({ description: 'API 端点', default: 'https://api.ipidea.net' })
  @IsOptional()
  @IsString()
  apiUrl?: string;

  @ApiPropertyOptional({ description: '代理类型', example: 'residential' })
  @IsOptional()
  @IsString()
  proxyType?: string;
}
