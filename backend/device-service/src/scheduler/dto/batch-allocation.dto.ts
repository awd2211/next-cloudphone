import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * 单个分配请求
 */
export class SingleAllocationRequest {
  @ApiProperty({
    description: "用户ID",
    example: "user-123",
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: "分配时长（分钟）",
    example: 60,
    minimum: 1,
    maximum: 1440,
  })
  @IsNumber()
  @Min(1)
  @Max(1440)
  durationMinutes: number;

  @ApiPropertyOptional({
    description: "设备偏好（可选）",
    example: { cpu: 4, memory: 8192 },
  })
  @IsOptional()
  devicePreferences?: {
    cpu?: number;
    memory?: number;
    deviceType?: string;
  };
}

/**
 * 批量分配请求 DTO
 */
export class BatchAllocateDto {
  @ApiProperty({
    description: "分配请求列表",
    type: [SingleAllocationRequest],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SingleAllocationRequest)
  requests: SingleAllocationRequest[];

  @ApiPropertyOptional({
    description: "是否部分成功时继续（默认 true）",
    example: true,
  })
  @IsOptional()
  continueOnError?: boolean = true;
}

/**
 * 批量分配结果
 */
export class BatchAllocationResult {
  @ApiProperty({
    description: "成功数量",
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: "失败数量",
    example: 2,
  })
  failedCount: number;

  @ApiProperty({
    description: "总数",
    example: 10,
  })
  totalCount: number;

  @ApiProperty({
    description: "成功的分配列表",
    type: "array",
  })
  successes: Array<{
    userId: string;
    allocationId: string;
    deviceId: string;
    deviceName: string;
    expiresAt: string;
  }>;

  @ApiProperty({
    description: "失败的分配列表",
    type: "array",
  })
  failures: Array<{
    userId: string;
    reason: string;
    error: string;
  }>;

  @ApiProperty({
    description: "执行时长（毫秒）",
    example: 1250,
  })
  executionTimeMs: number;
}

/**
 * 批量释放请求 DTO
 */
export class BatchReleaseDto {
  @ApiProperty({
    description: "要释放的分配ID列表",
    type: [String],
    example: ["alloc-1", "alloc-2", "alloc-3"],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  allocationIds: string[];

  @ApiPropertyOptional({
    description: "释放原因（可选）",
    example: "批量释放操作",
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: "是否部分成功时继续（默认 true）",
    example: true,
  })
  @IsOptional()
  continueOnError?: boolean = true;
}

/**
 * 批量释放结果
 */
export class BatchReleaseResult {
  @ApiProperty({
    description: "成功数量",
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: "失败数量",
    example: 2,
  })
  failedCount: number;

  @ApiProperty({
    description: "总数",
    example: 10,
  })
  totalCount: number;

  @ApiProperty({
    description: "成功释放的分配ID列表",
    type: [String],
    example: ["alloc-1", "alloc-2"],
  })
  successIds: string[];

  @ApiProperty({
    description: "失败的分配列表",
    type: "array",
  })
  failures: Array<{
    allocationId: string;
    reason: string;
    error: string;
  }>;

  @ApiProperty({
    description: "执行时长（毫秒）",
    example: 850,
  })
  executionTimeMs: number;
}

/**
 * 批量续期请求 DTO
 */
export class BatchExtendDto {
  @ApiProperty({
    description: "要续期的分配ID列表",
    type: [String],
    example: ["alloc-1", "alloc-2"],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  allocationIds: string[];

  @ApiProperty({
    description: "延长时长（分钟）",
    example: 30,
    minimum: 1,
    maximum: 1440,
  })
  @IsNumber()
  @Min(1)
  @Max(1440)
  additionalMinutes: number;

  @ApiPropertyOptional({
    description: "是否部分成功时继续（默认 true）",
    example: true,
  })
  @IsOptional()
  continueOnError?: boolean = true;
}

/**
 * 批量续期结果
 */
export class BatchExtendResult {
  @ApiProperty({
    description: "成功数量",
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: "失败数量",
    example: 2,
  })
  failedCount: number;

  @ApiProperty({
    description: "总数",
    example: 10,
  })
  totalCount: number;

  @ApiProperty({
    description: "成功的续期列表",
    type: "array",
  })
  successes: Array<{
    allocationId: string;
    oldExpiresAt: string;
    newExpiresAt: string;
    additionalMinutes: number;
  }>;

  @ApiProperty({
    description: "失败的续期列表",
    type: "array",
  })
  failures: Array<{
    allocationId: string;
    reason: string;
    error: string;
  }>;

  @ApiProperty({
    description: "执行时长（毫秒）",
    example: 650,
  })
  executionTimeMs: number;
}

/**
 * 批量查询请求 DTO
 */
export class BatchQueryDto {
  @ApiProperty({
    description: "用户ID列表",
    type: [String],
    example: ["user-1", "user-2"],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  userIds: string[];

  @ApiPropertyOptional({
    description: "只查询活跃分配（默认 true）",
    example: true,
  })
  @IsOptional()
  activeOnly?: boolean = true;
}

/**
 * 批量查询结果
 */
export class BatchQueryResult {
  @ApiProperty({
    description: "用户分配映射",
    type: "object",
    example: {
      "user-1": [{ allocationId: "alloc-1", deviceId: "device-1", expiresAt: "2025-10-30T12:00:00Z" }],
      "user-2": [{ allocationId: "alloc-2", deviceId: "device-2", expiresAt: "2025-10-30T13:00:00Z" }],
    },
  })
  allocations: Record<string, Array<{
    allocationId: string;
    deviceId: string;
    deviceName: string;
    status: string;
    allocatedAt: string;
    expiresAt: string;
  }>>;

  @ApiProperty({
    description: "查询的用户数量",
    example: 10,
  })
  userCount: number;

  @ApiProperty({
    description: "总分配数量",
    example: 25,
  })
  totalAllocations: number;
}
