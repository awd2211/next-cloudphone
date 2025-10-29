import {
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { TemplateCategory } from "../../entities/device-template.entity";

class PreInstalledAppDto {
  @IsString()
  packageName: string;

  @IsString()
  apkPath: string;

  @IsBoolean()
  @IsOptional()
  autoStart?: boolean;
}

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @IsInt()
  @Min(1)
  @Max(16)
  cpuCores: number;

  @IsInt()
  @Min(512)
  @Max(32768)
  memoryMB: number;

  @IsInt()
  @Min(1024)
  @Max(102400)
  @IsOptional()
  storageMB?: number;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsInt()
  @Min(120)
  @Max(640)
  @IsOptional()
  dpi?: number;

  @IsString()
  @IsOptional()
  androidVersion?: string;

  @IsBoolean()
  @IsOptional()
  enableGpu?: boolean;

  @IsBoolean()
  @IsOptional()
  enableAudio?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreInstalledAppDto)
  @IsOptional()
  preInstalledApps?: PreInstalledAppDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  initCommands?: string[];

  @IsOptional()
  systemSettings?: Record<string, any>;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
