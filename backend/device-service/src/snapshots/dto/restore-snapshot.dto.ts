import { IsString, IsOptional, IsBoolean } from "class-validator";

export class RestoreSnapshotDto {
  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsString()
  @IsOptional()
  groupName?: string;

  @IsBoolean()
  @IsOptional()
  replaceOriginal?: boolean; // 是否替换原设备（停止原设备，用快照替换）
}
