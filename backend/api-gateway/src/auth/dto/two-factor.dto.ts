import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty({ description: '6位TOTP验证码', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: '验证码必须是6位数字' })
  token: string;
}

export class Verify2FADto {
  @ApiProperty({ description: '用户名', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '密码', example: 'admin123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: '图形验证码', example: 'ab12' })
  @IsString()
  @IsNotEmpty()
  captcha: string;

  @ApiProperty({ description: '图形验证码 ID' })
  @IsString()
  @IsNotEmpty()
  captchaId: string;

  @ApiProperty({ description: '6位TOTP验证码', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: '2FA验证码必须是6位数字' })
  twoFactorToken: string;
}

export class TwoFactorSecretResponseDto {
  @ApiProperty({ description: '密钥（Base32编码）' })
  secret: string;

  @ApiProperty({ description: '二维码图片（Data URL）' })
  qrCode: string;

  @ApiProperty({ description: 'OTPAUTH URL' })
  otpauthUrl: string;
}
