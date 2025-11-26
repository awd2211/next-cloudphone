import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * 网络扫描 DTO
 */
export class ScanNetworkDto {
  @ApiProperty({
    description: '网络 CIDR 地址（如 192.168.1.0/24）',
    example: '192.168.1.0/24',
  })
  @IsString()
  networkCidr: string;

  @ApiPropertyOptional({
    description: 'ADB 端口起始范围',
    example: 5555,
    default: 5555,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1024)
  @Max(65535)
  portStart?: number;

  @ApiPropertyOptional({
    description: 'ADB 端口结束范围',
    example: 5565,
    default: 5565,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1024)
  @Max(65535)
  portEnd?: number;

  @ApiPropertyOptional({
    description: '并发扫描数量',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  concurrency?: number;

  @ApiPropertyOptional({
    description: '超时时间（毫秒）',
    example: 2000,
    default: 2000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(500)
  @Max(10000)
  timeoutMs?: number;
}
