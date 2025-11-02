import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 请求虚拟号码 DTO
 */
export class RequestNumberDto {
  @ApiProperty({ description: '服务名称', example: 'telegram' })
  @IsString()
  service: string;

  @ApiPropertyOptional({ description: '国家代码（2位ISO）', example: 'RU' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ description: '设备ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  deviceId: string;

  @ApiPropertyOptional({ description: '用户ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: '指定平台', example: 'sms-activate' })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({ description: '是否使用号码池', default: false })
  @IsBoolean()
  @IsOptional()
  usePool?: boolean;

  @ApiPropertyOptional({ description: '强制使用指定平台（不自动降级）', default: false })
  @IsBoolean()
  @IsOptional()
  forceProvider?: boolean;
}

/**
 * 批量请求虚拟号码 DTO
 */
export class BatchRequestDto {
  @ApiProperty({ description: '服务名称', example: 'telegram' })
  @IsString()
  service: string;

  @ApiPropertyOptional({ description: '国家代码（2位ISO）', example: 'RU' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({
    description: '设备ID列表（最多100个）',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsUUID('4', { each: true })
  deviceIds: string[];

  @ApiPropertyOptional({ description: '指定平台', example: 'sms-activate' })
  @IsString()
  @IsOptional()
  provider?: string;
}
