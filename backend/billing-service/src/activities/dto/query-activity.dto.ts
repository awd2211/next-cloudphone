import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityType, ActivityStatus } from '../entities/activity.entity';

/**
 * 查询活动列表 DTO
 */
export class QueryActivityDto {
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;
}

/**
 * 查询参与记录 DTO
 */
export class QueryParticipationDto {
  @IsOptional()
  activityId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;
}
