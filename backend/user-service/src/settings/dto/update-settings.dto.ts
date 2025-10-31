import { IsObject, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsObject()
  basic?: Record<string, any>;

  @IsOptional()
  @IsObject()
  email?: Record<string, any>;

  @IsOptional()
  @IsObject()
  sms?: Record<string, any>;

  @IsOptional()
  @IsObject()
  payment?: Record<string, any>;

  @IsOptional()
  @IsObject()
  storage?: Record<string, any>;

  @IsOptional()
  @IsObject()
  security?: Record<string, any>;

  @IsOptional()
  @IsObject()
  notification?: Record<string, any>;
}
