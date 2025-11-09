import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize, IsNotEmpty } from 'class-validator';

export class AddPermissionsDto {
  @ApiProperty({
    description: '权限 ID 列表',
    example: ['perm-123', 'perm-456'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one permission ID is required' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissionIds: string[];
}
