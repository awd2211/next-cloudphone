import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 分配指定代理的请求 DTO
 */
export class AssignProxyDto {
  @ApiProperty({
    description: '代理ID',
    example: 'brightdata-1234567890-abc',
  })
  @IsString()
  @IsNotEmpty()
  proxyId: string;

  @ApiProperty({
    description: '是否验证代理可用性',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  validate?: boolean;
}
