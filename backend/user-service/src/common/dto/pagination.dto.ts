import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

/**
 * 通用分页 DTO
 * 提供统一的分页参数验证
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: '页码',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为 1' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    default: 10,
    minimum: 1,
    maximum: 100,
    example: 10,
  })
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为 1' })
  @Max(100, { message: '每页数量最大为 100' })
  @IsOptional()
  limit?: number = 10;

  /**
   * 计算跳过的记录数
   */
  get skip(): number {
    return ((this.page || 1) - 1) * (this.limit || 10);
  }
}

/**
 * 分页响应 DTO
 */
export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * 创建分页响应的辅助函数
 */
export function createPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}
