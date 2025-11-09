import { IsPhoneNumber, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 批量发送短信 DTO
 */
export class SendBatchSmsDto {
  @ApiProperty({
    description: '接收短信的手机号码列表（国际格式）',
    example: ['+8613800138000', '+8613800138001'],
    isArray: true,
  })
  @IsPhoneNumber(undefined, { each: true, message: '所有电话号码必须是有效的国际格式' })
  phoneNumbers: string[];

  @ApiProperty({
    description: '短信内容',
    example: '您的系统通知...',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
