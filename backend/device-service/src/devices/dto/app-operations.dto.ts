import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * 启动应用 DTO (阿里云专属)
 */
export class StartAppDto {
  @ApiProperty({
    description: '应用包名',
    example: 'com.tencent.mm',
  })
  @IsString()
  packageName: string;
}

/**
 * 停止应用 DTO (阿里云专属)
 */
export class StopAppDto {
  @ApiProperty({
    description: '应用包名',
    example: 'com.tencent.mm',
  })
  @IsString()
  packageName: string;
}

/**
 * 清除应用数据 DTO (阿里云专属)
 */
export class ClearAppDataDto {
  @ApiProperty({
    description: '应用包名',
    example: 'com.tencent.mm',
  })
  @IsString()
  packageName: string;
}

/**
 * 创建快照 DTO (阿里云专属)
 */
export class CreateSnapshotDto {
  @ApiProperty({
    description: '快照名称',
    example: 'backup-before-upgrade',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: '快照描述',
    example: '2025-11-01 升级前备份',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

/**
 * 恢复快照 DTO (阿里云专属)
 */
export class RestoreSnapshotDto {
  @ApiProperty({
    description: '快照 ID',
    example: 'snapshot-123456',
  })
  @IsString()
  snapshotId: string;
}
