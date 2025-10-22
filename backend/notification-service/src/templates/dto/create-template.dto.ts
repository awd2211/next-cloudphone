import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, IsObject, Length, MaxLength } from 'class-validator';
import { NotificationType, NotificationChannel } from '../../entities/notification.entity';

export class CreateTemplateDto {
  @IsString()
  @Length(1, 100)
  code: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  body: string;

  @IsString()
  @IsOptional()
  emailTemplate?: string;

  @IsString()
  @IsOptional()
  smsTemplate?: string;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @IsObject()
  @IsOptional()
  defaultData?: Record<string, any>;

  @IsString()
  @IsOptional()
  @Length(2, 10)
  language?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}
