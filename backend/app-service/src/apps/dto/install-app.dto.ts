import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class InstallAppDto {
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  deviceIds: string[];
}

export class UninstallAppDto {
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  deviceIds: string[];
}
