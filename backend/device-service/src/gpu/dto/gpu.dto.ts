import { IsEnum, IsOptional, IsString, IsNumber, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * GPU 分配模式
 */
export enum GPUAllocationMode {
  EXCLUSIVE = 'exclusive', // 独占模式
  SHARED = 'shared', // 共享模式
}

/**
 * GPU 分配状态
 */
export enum GPUAllocationStatus {
  ACTIVE = 'active',
  RELEASED = 'released',
  FAILED = 'failed',
}

/**
 * GPU 设备状态
 */
export enum GPUDeviceStatus {
  AVAILABLE = 'available',
  ALLOCATED = 'allocated',
  MAINTENANCE = 'maintenance',
  ERROR = 'error',
}

/**
 * 查询 GPU 设备列表 DTO
 */
export class QueryGPUDevicesDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 10;

  @IsOptional()
  @IsEnum(GPUDeviceStatus)
  status?: GPUDeviceStatus;

  @IsOptional()
  @IsString()
  nodeId?: string;
}

/**
 * 分配 GPU DTO
 */
export class AllocateGPUDto {
  @IsUUID()
  deviceId: string;

  @IsOptional()
  @IsEnum(GPUAllocationMode)
  mode?: GPUAllocationMode = GPUAllocationMode.EXCLUSIVE;
}

/**
 * 释放 GPU DTO
 */
export class DeallocateGPUDto {
  @IsOptional()
  @IsUUID()
  deviceId?: string;
}

/**
 * 查询 GPU 分配记录 DTO
 */
export class QueryGPUAllocationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 10;

  @IsOptional()
  @IsUUID()
  gpuId?: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsEnum(GPUAllocationStatus)
  status?: GPUAllocationStatus;
}

/**
 * 查询 GPU 使用趋势 DTO
 */
export class QueryGPUUsageTrendDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

/**
 * 更新 GPU 驱动 DTO
 */
export class UpdateGPUDriverDto {
  @IsString()
  driverVersion: string;
}
