import { ApiProperty } from '@nestjs/swagger';

export class CaptchaResponseDto {
  @ApiProperty({
    description: '验证码唯一标识符',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: '验证码 SVG 图片',
    example: '<svg>...</svg>',
  })
  svg: string;
}
