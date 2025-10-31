import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Disable2FADto {
  @ApiProperty({
    description: '6位TOTP验证码',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: '验证码必须是6位数字' })
  token: string;
}
