import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export enum BatchOperationType {
  START = "start",
  STOP = "stop",
  RESTART = "restart",
  DELETE = "delete",
  EXECUTE_COMMAND = "execute_command",
  INSTALL_APP = "install_app",
  UNINSTALL_APP = "uninstall_app",
}

export class BatchCreateDeviceDto {
  @ApiProperty({ description: "批量创建数量", example: 10 })
  @IsNumber()
  @Min(1)
  @Max(100)
  count: number;

  @ApiProperty({ description: "设备名称前缀", example: "game-device" })
  @IsString()
  namePrefix: string;

  @ApiProperty({ description: "用户ID", required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: "租户ID", required: false })
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiProperty({ description: "CPU核心数", example: 4 })
  @IsNumber()
  @Min(1)
  @Max(16)
  cpuCores: number;

  @ApiProperty({ description: "内存大小(MB)", example: 8192 })
  @IsNumber()
  @Min(1024)
  @Max(32768)
  memoryMB: number;

  @ApiProperty({ description: "存储大小(MB)", example: 10240, required: false })
  @IsNumber()
  @IsOptional()
  storageMB?: number;

  @ApiProperty({ description: "分辨率", example: "1080x1920" })
  @IsString()
  resolution: string;

  @ApiProperty({ description: "DPI", example: 320 })
  @IsNumber()
  dpi: number;

  @ApiProperty({ description: "Android版本", example: "11", required: false })
  @IsString()
  @IsOptional()
  androidVersion?: string;

  @ApiProperty({ description: "设备分组", required: false })
  @IsString()
  @IsOptional()
  groupName?: string;

  @ApiProperty({ description: "启用GPU", required: false })
  @IsOptional()
  enableGpu?: boolean;

  @ApiProperty({ description: "启用音频", required: false })
  @IsOptional()
  enableAudio?: boolean;
}

export class BatchOperationDto {
  @ApiProperty({
    description: "操作类型",
    enum: BatchOperationType,
    example: BatchOperationType.START,
  })
  @IsEnum(BatchOperationType)
  operation: BatchOperationType;

  @ApiProperty({
    description: "设备ID列表（为空则操作所有设备）",
    example: ["uuid-1", "uuid-2"],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  deviceIds?: string[];

  @ApiProperty({
    description: "设备分组名称（按分组批量操作）",
    required: false,
  })
  @IsString()
  @IsOptional()
  groupName?: string;

  @ApiProperty({
    description: "用户ID（操作该用户的所有设备）",
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: "执行的命令（仅当operation为EXECUTE_COMMAND时需要）",
    required: false,
  })
  @IsString()
  @IsOptional()
  command?: string;

  @ApiProperty({
    description: "APK路径（仅当operation为INSTALL_APP时需要）",
    required: false,
  })
  @IsString()
  @IsOptional()
  apkPath?: string;

  @ApiProperty({
    description: "应用包名（仅当operation为UNINSTALL_APP时需要）",
    required: false,
  })
  @IsString()
  @IsOptional()
  packageName?: string;

  @ApiProperty({
    description: "最大并发数",
    example: 10,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  maxConcurrency?: number;
}

export class BatchOperationResult {
  @ApiProperty({ description: "总数" })
  total: number;

  @ApiProperty({ description: "成功数" })
  success: number;

  @ApiProperty({ description: "失败数" })
  failed: number;

  @ApiProperty({ description: "详细结果" })
  results: Record<string, { success: boolean; message?: string; data?: any }>;

  @ApiProperty({ description: "执行时长(ms)" })
  duration: number;
}

export class DeviceGroupDto {
  @ApiProperty({ description: "分组名称", example: "gaming-group" })
  @IsString()
  name: string;

  @ApiProperty({ description: "分组描述", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "标签", required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
