import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserStatus } from '../../entities/user.entity';

/**
 * 排序字段枚举
 */
export enum UserSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  LAST_LOGIN_AT = 'lastLoginAt',
  USERNAME = 'username',
  EMAIL = 'email',
}

/**
 * 排序方向枚举
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * 用户过滤和排序 DTO
 * 提供丰富的查询和排序功能
 */
export class FilterUsersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '搜索关键词 (用户名/邮箱/全名)',
    example: 'john',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  @MaxLength(100, { message: '搜索关键词最长 100 字符' })
  @Transform(({ value }) => value?.toString().trim())
  search?: string;

  @ApiPropertyOptional({
    description: '用户状态',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: '无效的用户状态' })
  status?: UserStatus;

  @ApiPropertyOptional({
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString({ message: '角色ID必须是字符串' })
  roleId?: string;

  @ApiPropertyOptional({
    description: '租户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString({ message: '租户ID必须是字符串' })
  tenantId?: string;

  @ApiPropertyOptional({
    description: '部门ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString({ message: '部门ID必须是字符串' })
  departmentId?: string;

  @ApiPropertyOptional({
    description: '是否只显示超级管理员',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isSuperAdmin?: boolean;

  @ApiPropertyOptional({
    description: '是否只显示锁定用户',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isLocked?: boolean;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: UserSortField,
    default: UserSortField.CREATED_AT,
    example: UserSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(UserSortField, { message: '无效的排序字段' })
  sortBy?: UserSortField = UserSortField.CREATED_AT;

  @ApiPropertyOptional({
    description: '排序方向',
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: '无效的排序方向' })
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: '创建时间起始 (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, {
    message: '创建时间起始格式无效 (需要 ISO 8601 格式)',
  })
  createdAtStart?: string;

  @ApiPropertyOptional({
    description: '创建时间结束 (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, {
    message: '创建时间结束格式无效 (需要 ISO 8601 格式)',
  })
  createdAtEnd?: string;

  @ApiPropertyOptional({
    description: '最后登录时间起始 (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, {
    message: '最后登录时间起始格式无效 (需要 ISO 8601 格式)',
  })
  lastLoginStart?: string;

  @ApiPropertyOptional({
    description: '最后登录时间结束 (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, {
    message: '最后登录时间结束格式无效 (需要 ISO 8601 格式)',
  })
  lastLoginEnd?: string;
}
