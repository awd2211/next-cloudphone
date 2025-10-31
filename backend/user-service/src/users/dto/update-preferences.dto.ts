import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiProperty({
    description: '界面语言',
    example: 'zh-CN',
    enum: ['zh-CN', 'en-US'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['zh-CN', 'en-US'])
  language?: string;

  @ApiProperty({
    description: '主题风格',
    example: 'auto',
    enum: ['auto', 'light', 'dark'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['auto', 'light', 'dark'])
  theme?: string;
}
