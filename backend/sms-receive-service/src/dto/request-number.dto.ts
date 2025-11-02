import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class RequestNumberDto {
  @IsString()
  service: string; // google, telegram, whatsapp, etc.

  @IsOptional()
  @IsString()
  country?: string; // US, RU, CN, etc.

  @IsUUID()
  deviceId: string;

  @IsOptional()
  @IsString()
  provider?: string; // sms-activate, 5sim, smspool

  @IsOptional()
  @IsBoolean()
  usePool?: boolean;
}

export class BatchRequestNumberDto {
  @IsString()
  service: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsString({ each: true })
  deviceIds: string[];
}
