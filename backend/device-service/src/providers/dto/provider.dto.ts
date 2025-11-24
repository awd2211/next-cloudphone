import { IsEnum, IsOptional, IsNumber, IsBoolean, Min, IsString, IsObject, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceProviderType } from '../provider.types';

/**
 * 查询云设备同步状态 DTO
 */
export class QueryCloudSyncDto {
  @IsOptional()
  @IsEnum(DeviceProviderType)
  provider?: DeviceProviderType;

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
}

/**
 * 列出提供商配置 DTO
 */
export class ListProviderConfigsDto {
  @IsOptional()
  @IsEnum(DeviceProviderType)
  providerType?: DeviceProviderType;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enabled?: boolean;

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
}

/**
 * 创建提供商配置 DTO
 */
export class CreateProviderConfigDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsEnum(DeviceProviderType)
  providerType: DeviceProviderType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tenantId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDevices?: number = 100;

  @IsObject()
  config: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}

/**
 * 通过 ID 更新提供商配置 DTO
 */
export class UpdateProviderConfigByIdDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tenantId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDevices?: number;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

/**
 * 触发云同步 DTO
 */
export class TriggerCloudSyncDto {
  @IsOptional()
  @IsEnum(DeviceProviderType)
  provider?: DeviceProviderType;
}

/**
 * 更新提供商配置 DTO
 */
export class UpdateProviderConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDevices?: number;

  // 提供商特定配置（根据不同提供商类型有不同的字段）
  @IsOptional()
  config?: Record<string, any>;
}

/**
 * 云账单对账查询 DTO
 */
export class CloudBillingReconciliationDto {
  @IsEnum(DeviceProviderType)
  provider: DeviceProviderType;

  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;
}
