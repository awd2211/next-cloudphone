import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/decorators/is-strong-password.decorator';

export class ChangePasswordDto {
  @ApiProperty({
    description: '旧密码',
    example: 'OldPass@123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: '旧密码必须是字符串' })
  @IsNotEmpty({ message: '旧密码不能为空' })
  @MinLength(8, { message: '旧密码至少8个字符' })
  @MaxLength(128, { message: '旧密码最多128个字符' })
  oldPassword: string;

  @ApiProperty({
    description: '新密码（必须至少8个字符，包含大小写字母、数字和特殊字符）',
    example: 'NewPass@123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: '新密码必须是字符串' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(8, { message: '新密码至少8个字符' })
  @MaxLength(128, { message: '新密码最多128个字符' })
  @IsStrongPassword()
  newPassword: string;
}
