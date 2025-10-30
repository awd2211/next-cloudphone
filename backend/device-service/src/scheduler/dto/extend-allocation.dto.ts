import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * 单设备续期请求 DTO
 */
export class ExtendAllocationDto {
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
    description: "续期原因（可选）",
    example: "需要更多时间完成任务",
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * 续期结果 DTO
 */
export class ExtendAllocationResult {
  @ApiProperty({
    description: "分配ID",
    example: "alloc-abc123",
  })
  allocationId: string;

  @ApiProperty({
    description: "用户ID",
    example: "user-001",
  })
  userId: string;

  @ApiProperty({
    description: "设备ID",
    example: "device-xyz789",
  })
  deviceId: string;

  @ApiProperty({
    description: "设备名称",
    example: "Device-001",
  })
  deviceName: string;

  @ApiProperty({
    description: "原过期时间",
    example: "2025-10-30T14:00:00Z",
  })
  oldExpiresAt: string;

  @ApiProperty({
    description: "新过期时间",
    example: "2025-10-30T14:30:00Z",
  })
  newExpiresAt: string;

  @ApiProperty({
    description: "延长时长（分钟）",
    example: 30,
  })
  additionalMinutes: number;

  @ApiProperty({
    description: "当前续期次数",
    example: 2,
  })
  extendCount: number;

  @ApiProperty({
    description: "剩余续期次数",
    example: 3,
  })
  remainingExtends: number;

  @ApiProperty({
    description: "总使用时长（分钟）",
    example: 150,
  })
  totalDurationMinutes: number;
}

/**
 * 续期策略配置
 */
export interface ExtendPolicyConfig {
  // 最大续期次数（-1 表示无限制）
  maxExtendCount: number;

  // 单次最大续期时长（分钟）
  maxExtendMinutes: number;

  // 最大总时长（分钟，-1 表示无限制）
  maxTotalMinutes: number;

  // 续期冷却时间（秒，两次续期之间的最小间隔）
  cooldownSeconds: number;

  // 是否允许在即将过期时续期（距离过期多少分钟内可以续期）
  allowExtendBeforeExpireMinutes: number;

  // 是否需要配额检查
  requireQuotaCheck: boolean;

  // 是否需要计费
  requireBilling: boolean;
}

/**
 * 默认续期策略
 */
export const DEFAULT_EXTEND_POLICY: ExtendPolicyConfig = {
  maxExtendCount: 5, // 最多续期5次
  maxExtendMinutes: 120, // 单次最多续期2小时
  maxTotalMinutes: 480, // 总时长最多8小时
  cooldownSeconds: 60, // 两次续期至少间隔1分钟
  allowExtendBeforeExpireMinutes: 60, // 过期前60分钟内可以续期
  requireQuotaCheck: false, // 续期不需要重新检查配额
  requireBilling: true, // 续期需要计费
};

/**
 * VIP 续期策略
 */
export const VIP_EXTEND_POLICY: ExtendPolicyConfig = {
  maxExtendCount: -1, // 无限续期
  maxExtendMinutes: 240, // 单次最多续期4小时
  maxTotalMinutes: -1, // 无限总时长
  cooldownSeconds: 0, // 无冷却时间
  allowExtendBeforeExpireMinutes: 120, // 过期前2小时内可以续期
  requireQuotaCheck: false,
  requireBilling: true,
};

/**
 * 续期历史记录
 */
export interface ExtendHistoryEntry {
  timestamp: string;
  additionalMinutes: number;
  oldExpiresAt: string;
  newExpiresAt: string;
  reason?: string;
}

/**
 * 获取分配的续期信息
 */
export class AllocationExtendInfo {
  @ApiProperty({
    description: "分配ID",
    example: "alloc-abc123",
  })
  allocationId: string;

  @ApiProperty({
    description: "当前续期次数",
    example: 2,
  })
  extendCount: number;

  @ApiProperty({
    description: "剩余续期次数（-1表示无限制）",
    example: 3,
  })
  remainingExtends: number;

  @ApiProperty({
    description: "总使用时长（分钟）",
    example: 150,
  })
  totalDurationMinutes: number;

  @ApiProperty({
    description: "最大允许总时长（分钟，-1表示无限制）",
    example: 480,
  })
  maxTotalMinutes: number;

  @ApiProperty({
    description: "是否可以续期",
    example: true,
  })
  canExtend: boolean;

  @ApiProperty({
    description: "不能续期的原因（如果不能续期）",
    example: "已达到最大续期次数",
  })
  cannotExtendReason?: string;

  @ApiProperty({
    description: "续期历史",
    type: "array",
  })
  extendHistory: ExtendHistoryEntry[];

  @ApiProperty({
    description: "下次可续期时间（冷却时间）",
    example: "2025-10-30T13:35:00Z",
  })
  nextExtendAvailableAt?: string;
}
