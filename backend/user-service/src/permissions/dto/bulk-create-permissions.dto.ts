import { Type } from 'class-transformer';
import { IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { CreatePermissionDto } from './create-permission.dto';

export class BulkCreatePermissionsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one permission must be provided' })
  @ValidateNested({ each: true })
  @Type(() => CreatePermissionDto)
  permissions: CreatePermissionDto[];
}
