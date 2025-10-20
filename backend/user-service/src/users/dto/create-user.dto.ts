import { IsString, IsEmail, IsNotEmpty, MinLength, IsOptional, IsArray, IsEnum } from 'class-validator';
import { UserStatus } from '../../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsArray()
  @IsOptional()
  roleIds?: string[];

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
