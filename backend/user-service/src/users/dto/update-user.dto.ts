import { IsString, IsEmail, IsOptional, IsArray, IsEnum } from 'class-validator';
import { UserStatus } from '../../entities/user.entity';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @IsArray()
  @IsOptional()
  roleIds?: string[];
}
