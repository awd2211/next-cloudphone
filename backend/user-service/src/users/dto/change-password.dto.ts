import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/decorators/is-strong-password.decorator';

export class ChangePasswordDto {
  @ApiProperty({
    description: '旧密码',
    example: 'OldPass@123',
  })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({
    description: '新密码（必须至少8个字符，包含大小写字母、数字和特殊字符）',
    example: 'NewPass@123',
  })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  newPassword: string;
}
