import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  Max,
  IsIP,
} from "class-validator";

/**
 * 手动注册设备 DTO
 */
export class RegisterDeviceDto {
  @ApiProperty({
    description: "设备 IP 地址",
    example: "192.168.1.100",
  })
  @IsIP(4)
  ipAddress: string;

  @ApiProperty({
    description: "ADB 端口",
    example: 5555,
    default: 5555,
  })
  @IsInt()
  @Min(1024)
  @Max(65535)
  adbPort: number;

  @ApiPropertyOptional({
    description: "设备名称",
    example: "TestDevice-01",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: "设备分组（如机架位置）",
    example: "rack-A",
  })
  @IsOptional()
  @IsString()
  deviceGroup?: string;

  @ApiPropertyOptional({
    description: "设备标签",
    example: ["test", "debug"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
