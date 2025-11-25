import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

/**
 * OnlineSim 获取号码请求 DTO
 */
export class OnlineSimGetNumberDto {
  @ApiProperty({ description: '服务名称', example: 'telegram' })
  @IsString()
  service: string;

  @ApiPropertyOptional({ description: '国家代码 (E.164格式)', example: 7, default: 7 })
  @IsNumber()
  @IsOptional()
  country?: number;

  @ApiPropertyOptional({ description: '是否返回号码', default: true })
  @IsBoolean()
  @IsOptional()
  number?: boolean;
}

/**
 * OnlineSim 获取状态请求 DTO
 */
export class OnlineSimGetStateDto {
  @ApiPropertyOptional({ description: '操作ID (tzid)' })
  @IsNumber()
  @IsOptional()
  tzid?: number;

  @ApiPropertyOptional({ description: '是否只返回验证码', default: true })
  @IsBoolean()
  @IsOptional()
  messageToCode?: boolean;
}

/**
 * OnlineSim 设置操作状态请求 DTO
 */
export class OnlineSimSetStatusDto {
  @ApiProperty({ description: '操作ID (tzid)' })
  @IsNumber()
  tzid: number;

  @ApiProperty({ description: '操作类型', enum: ['ok', 'revise'] })
  @IsString()
  action: 'ok' | 'revise';
}

/**
 * OnlineSim 余额响应 DTO
 */
export class OnlineSimBalanceDto {
  @ApiProperty({ description: '响应状态' })
  response: number | string;

  @ApiProperty({ description: '余额' })
  balance: string;

  @ApiProperty({ description: 'Z余额 (冻结金额)' })
  zbalance: number;
}

/**
 * OnlineSim 获取号码响应 DTO
 */
export class OnlineSimNumResultDto {
  @ApiProperty({ description: '响应状态' })
  response: number | string;

  @ApiProperty({ description: '操作ID' })
  tzid: number;
}

/**
 * OnlineSim 短信消息 DTO
 */
export class OnlineSimMessageDto {
  @ApiProperty({ description: '服务名称' })
  service: string;

  @ApiProperty({ description: '短信文本' })
  text: string;

  @ApiProperty({ description: '验证码' })
  code: string;

  @ApiProperty({ description: '创建时间' })
  created_at: string;
}

/**
 * OnlineSim 操作状态响应 DTO
 */
export class OnlineSimStateDto {
  @ApiProperty({ description: '国家代码' })
  country: number;

  @ApiProperty({ description: '费用' })
  sum: number;

  @ApiProperty({ description: '服务名称' })
  service: string;

  @ApiProperty({ description: '电话号码' })
  number: string;

  @ApiProperty({ description: '响应状态 (TZ_NUM_WAIT, TZ_NUM_ANSWER, TZ_OVER_EMPTY, TZ_OVER_OK)' })
  response: string;

  @ApiProperty({ description: '操作ID' })
  tzid: number;

  @ApiProperty({ description: '时间戳' })
  time: number;

  @ApiProperty({ description: '表单类型' })
  form: string;

  @ApiPropertyOptional({ description: '短信消息列表', type: [OnlineSimMessageDto] })
  msg?: OnlineSimMessageDto[];
}

/**
 * OnlineSim 服务信息 DTO
 */
export class OnlineSimServiceDto {
  @ApiProperty({ description: '服务ID' })
  id: number;

  @ApiProperty({ description: '服务名称' })
  name: string;

  @ApiProperty({ description: '服务别名' })
  slug: string;
}

/**
 * OnlineSim 国家信息 DTO
 */
export class OnlineSimCountryDto {
  @ApiProperty({ description: '国家ID (E.164格式)' })
  id: number;

  @ApiProperty({ description: '国家名称' })
  name: string;

  @ApiProperty({ description: '国家代码 (ISO)' })
  code: string;
}

/**
 * OnlineSim 号码统计 DTO
 */
export class OnlineSimNumbersStatsDto {
  @ApiProperty({ description: '服务名称' })
  service: string;

  @ApiProperty({ description: '可用数量' })
  count: number;

  @ApiProperty({ description: '是否热门' })
  popular: boolean;
}

/**
 * OnlineSim 通用成功响应 DTO
 */
export class OnlineSimSuccessDto {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '消息' })
  message: string;

  @ApiPropertyOptional({ description: '额外数据' })
  data?: any;
}

/**
 * OnlineSim 服务映射响应 DTO
 */
export class OnlineSimServiceMappingDto {
  @ApiProperty({ description: '服务代码映射表' })
  mapping: Record<string, string>;
}
