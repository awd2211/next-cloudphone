import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, IsOptional, IsString } from 'class-validator';

/**
 * 报告代理使用DTO（成功）
 */
export class ReportSuccessDto {
  @ApiProperty({
    description: '带宽使用量（MB）',
    example: 50,
  })
  @IsNumber()
  @Min(0)
  bandwidthMB: number;

  @ApiPropertyOptional({
    description: '响应时间（毫秒）',
    example: 1200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  responseTime?: number;
}

/**
 * 报告代理失败DTO
 */
export class ReportFailureDto {
  @ApiProperty({
    description: '错误信息',
    example: 'Connection timeout',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: '错误代码',
    example: 'ETIMEDOUT',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: '带宽使用量（MB）',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bandwidthMB?: number;
}
