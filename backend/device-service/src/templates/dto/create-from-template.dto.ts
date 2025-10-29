import { IsInt, Min, Max, IsString, IsOptional } from "class-validator";

export class CreateDeviceFromTemplateDto {
  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsString()
  @IsOptional()
  groupName?: string;

  // Override template settings
  @IsInt()
  @Min(1)
  @Max(16)
  @IsOptional()
  cpuCores?: number;

  @IsInt()
  @Min(512)
  @Max(32768)
  @IsOptional()
  memoryMB?: number;

  @IsOptional()
  enableGpu?: boolean;
}

export class BatchCreateFromTemplateDto {
  @IsInt()
  @Min(1)
  @Max(100)
  count: number;

  @IsString()
  namePrefix: string;

  @IsString()
  @IsOptional()
  groupName?: string;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  maxConcurrency?: number;

  // Override template settings
  @IsInt()
  @Min(1)
  @Max(16)
  @IsOptional()
  cpuCores?: number;

  @IsInt()
  @Min(512)
  @Max(32768)
  @IsOptional()
  memoryMB?: number;

  @IsOptional()
  enableGpu?: boolean;
}
