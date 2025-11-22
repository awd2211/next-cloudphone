import { IsString, IsOptional, IsEnum } from 'class-validator';
import { SettingType, SettingCategory } from '../entities/site-setting.entity';

export class UpdateSiteSettingDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsEnum(SettingType)
  type?: SettingType;

  @IsOptional()
  @IsString()
  description?: string;
}

export class BatchUpdateSettingsDto {
  settings: Record<string, string>;
}

export class SiteSettingResponseDto {
  key: string;
  value: any;
  type: SettingType;
  category: SettingCategory;
  description?: string;
  updatedAt: Date;
}
