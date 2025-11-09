import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsDate,
  IsObject,
  ArrayMinSize,
  Matches,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { Type } from 'class-transformer';

// 自定义验证器：确保日期在未来
function IsDateInFuture(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isDateInFuture',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (!value) return true; // 允许空值 (由 IsOptional 处理)
          const date = value instanceof Date ? value : new Date(value as string);
          return date.getTime() > Date.now();
        },
        defaultMessage() {
          return 'Expiration date must be in the future';
        },
      },
    });
  };
}

export class CreateApiKeyDto {
  @ApiProperty({ description: '用户 ID', example: 'user-123' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'API 密钥名称', example: 'Production API Key' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'API 密钥权限范围 (格式: resource:action)',
    example: ['device:read', 'device:write'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^[a-z]+:[a-z]+$/, {
    each: true,
    message: 'Each scope must be in format "resource:action" (lowercase letters only)',
  })
  scopes: string[];

  @ApiPropertyOptional({
    description: '过期时间 (ISO 8601 格式)',
    example: '2026-12-31T23:59:59.000Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @IsDateInFuture()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'API 密钥描述', example: 'Key for production use' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '元数据 (可选)',
    example: { environment: 'production' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
