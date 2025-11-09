import { IsPhoneNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 发送短信 DTO
 */
export class SendSmsDto {
  @ApiProperty({
    description: '接收短信的手机号码（国际格式）',
    example: '+8613800138000',
  })
  @IsPhoneNumber(undefined, { message: '请提供有效的国际电话号码 (例如: +1234567890)' })
  phoneNumber: string;

  @ApiProperty({
    description: '短信内容',
    example: '您的验证码是: 123456',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: '发送者号码（可选）',
    example: '+8612345678',
  })
  @IsOptional()
  @IsString()
  from?: string;
}
