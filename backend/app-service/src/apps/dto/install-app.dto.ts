import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InstallAppDto {
  @ApiProperty({
    description: '应用 ID',
    example: 'app-123',
  })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({
    description: '设备 ID 列表',
    type: [String],
    example: ['device-1', 'device-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  deviceIds: string[];
}

export class UninstallAppDto {
  @ApiProperty({
    description: '应用 ID',
    example: 'app-123',
  })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({
    description: '设备 ID 列表',
    type: [String],
    example: ['device-1', 'device-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  deviceIds: string[];
}
