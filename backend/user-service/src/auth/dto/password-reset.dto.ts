import { IsString, IsNotEmpty, IsEmail, IsOptional, MinLength, MaxLength, Matches, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum ResetType {
  EMAIL = 'email',
  PHONE = 'phone',
}

/**
 * 忘记密码请求 DTO
 */
export class ForgotPasswordDto {
  @ApiProperty({ description: '重置类型', enum: ResetType, default: ResetType.EMAIL })
  @IsEnum(ResetType, { message: '类型必须是 email 或 phone' })
  type: ResetType = ResetType.EMAIL;

  @ApiProperty({ description: '邮箱地址', example: 'user@example.com', required: false })
  @IsOptional()
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @Transform(({ value }) => value?.toString().trim().toLowerCase())
  email?: string;

  @ApiProperty({ description: '手机号', example: '13800138000', required: false })
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的中国大陆手机号' })
  phone?: string;
}

/**
 * 验证重置令牌 DTO
 */
export class VerifyResetTokenDto {
  @ApiProperty({ description: '重置令牌', example: 'abc123...' })
  @IsString({ message: '令牌必须是字符串' })
  @IsNotEmpty({ message: '令牌不能为空' })
  token: string;
}

/**
 * 重置密码 DTO
 */
export class ResetPasswordDto {
  @ApiProperty({ description: '重置令牌', example: 'abc123...' })
  @IsString({ message: '令牌必须是字符串' })
  @IsNotEmpty({ message: '令牌不能为空' })
  token: string;

  @ApiProperty({ description: '新密码', example: 'NewPassword123!' })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(8, { message: '密码至少 8 个字符' })
  @MaxLength(100, { message: '密码最多 100 个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: '密码必须包含大小写字母和数字',
  })
  password: string;
}

/**
 * 修改密码 DTO
 */
export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码', example: 'OldPassword123!' })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '当前密码不能为空' })
  oldPassword: string;

  @ApiProperty({ description: '新密码', example: 'NewPassword123!' })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(8, { message: '密码至少 8 个字符' })
  @MaxLength(100, { message: '密码最多 100 个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: '密码必须包含大小写字母和数字',
  })
  newPassword: string;
}
