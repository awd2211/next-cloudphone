import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

/**
 * SMSPVA 获取号码请求 DTO
 */
export class SmspvaGetNumberDto {
  @ApiProperty({ description: '服务ID', example: 1 })
  @IsNumber()
  serviceId: number;

  @ApiPropertyOptional({ description: '国家ID', example: 1, default: 1 })
  @IsNumber()
  @IsOptional()
  countryId?: number;
}

/**
 * SMSPVA 获取短信请求 DTO
 */
export class SmspvaGetSmsDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  numberId: string;

  @ApiPropertyOptional({ description: '是否保持订单打开以接收更多短信', default: false })
  @IsBoolean()
  @IsOptional()
  notClose?: boolean;
}

/**
 * SMSPVA 设置状态请求 DTO
 */
export class SmspvaSetStatusDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  numberId: string;

  @ApiProperty({ description: '操作类型', enum: ['deny', 'close', 'ban'] })
  @IsString()
  action: 'deny' | 'close' | 'ban';
}

/**
 * SMSPVA 用户信息响应 DTO
 */
export class SmspvaUserInfoDto {
  @ApiProperty({ description: '响应状态' })
  response: string;

  @ApiProperty({ description: '用户ID' })
  user_id: number;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '余额' })
  balance: string;

  @ApiProperty({ description: 'Karma信用分' })
  karma: string;

  @ApiProperty({ description: '用户组' })
  group: string;
}

/**
 * SMSPVA 余额响应 DTO
 */
export class SmspvaBalanceDto {
  @ApiProperty({ description: '余额' })
  balance: number;

  @ApiProperty({ description: '货币', default: 'USD' })
  currency: string;
}

/**
 * SMSPVA 号码数量响应 DTO
 */
export class SmspvaCountInfoDto {
  @ApiProperty({ description: '响应状态' })
  response: string;

  @ApiProperty({ description: '服务ID' })
  service_id: number;

  @ApiProperty({ description: '服务名称' })
  service_name: string;

  @ApiProperty({ description: '可用数量' })
  total: number;

  @ApiProperty({ description: '价格' })
  price: string;
}

/**
 * SMSPVA 获取号码响应 DTO
 */
export class SmspvaNumberResultDto {
  @ApiProperty({ description: '响应状态' })
  response: string;

  @ApiProperty({ description: '订单ID' })
  id: number;

  @ApiProperty({ description: '国家区号' })
  country_code: string;

  @ApiProperty({ description: '电话号码' })
  number: string;
}

/**
 * SMSPVA 短信结果响应 DTO
 */
export class SmspvaSmsResultDto {
  @ApiProperty({ description: '响应状态' })
  response: string;

  @ApiProperty({ description: '短信内容/验证码' })
  sms: string;

  @ApiProperty({ description: '电话号码' })
  number: string;

  @ApiProperty({ description: '发送方' })
  from: string;

  @ApiProperty({ description: '完整短信文本' })
  text: string;
}

/**
 * SMSPVA 通用成功响应 DTO
 */
export class SmspvaSuccessDto {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '消息' })
  message: string;

  @ApiPropertyOptional({ description: '额外数据' })
  data?: any;
}

/**
 * SMSPVA 服务信息 DTO
 */
export class SmspvaServiceDto {
  @ApiProperty({ description: '服务ID' })
  id: number;

  @ApiProperty({ description: '服务名称' })
  name: string;

  @ApiProperty({ description: '价格' })
  price: number;
}

/**
 * SMSPVA 国家信息 DTO
 */
export class SmspvaCountryDto {
  @ApiProperty({ description: '国家ID' })
  id: number;

  @ApiProperty({ description: '国家名称' })
  name: string;

  @ApiProperty({ description: '国家代码' })
  code: string;
}
