import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsEnum,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * 游标分页排序方向
 */
export enum SortDirection {
  ASC = "asc",
  DESC = "desc",
}

/**
 * 游标分页请求 DTO
 */
export class CursorPaginationDto {
  @ApiPropertyOptional({
    description: "游标（上一页的最后一条记录ID）",
    example: "cursor_abc123",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: "每页数量",
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "排序方向",
    enum: SortDirection,
    default: SortDirection.DESC,
  })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection = SortDirection.DESC;
}

/**
 * 游标分页响应元数据
 */
export class CursorPaginationMeta {
  @ApiProperty({
    description: "当前页游标",
    example: "cursor_abc123",
  })
  cursor: string;

  @ApiProperty({
    description: "下一页游标（如果有）",
    example: "cursor_def456",
    nullable: true,
  })
  nextCursor: string | null;

  @ApiProperty({
    description: "上一页游标（如果有）",
    example: "cursor_ghi789",
    nullable: true,
  })
  prevCursor: string | null;

  @ApiProperty({
    description: "是否有下一页",
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: "是否有上一页",
    example: false,
  })
  hasPrevPage: boolean;

  @ApiProperty({
    description: "当前页数据量",
    example: 20,
  })
  count: number;

  @ApiProperty({
    description: "每页限制",
    example: 20,
  })
  limit: number;
}

/**
 * 游标分页响应 DTO
 */
export class CursorPaginatedResponse<T> {
  @ApiProperty({
    description: "数据列表",
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: "分页元数据",
    type: CursorPaginationMeta,
  })
  meta: CursorPaginationMeta;
}

/**
 * 游标编码/解码工具
 */
export class CursorEncoder {
  /**
   * 编码游标
   * @param id 记录ID
   * @param timestamp 时间戳（用于排序）
   */
  static encode(id: string, timestamp: Date): string {
    const payload = {
      id,
      ts: timestamp.getTime(),
    };
    return Buffer.from(JSON.stringify(payload)).toString("base64url");
  }

  /**
   * 解码游标
   * @param cursor 游标字符串
   */
  static decode(cursor: string): { id: string; ts: number } | null {
    try {
      const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
      const payload = JSON.parse(decoded);
      if (payload.id && payload.ts) {
        return { id: payload.id, ts: payload.ts };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 从实体生成游标
   * @param entity 包含id和createdAt字段的实体
   */
  static fromEntity(entity: { id: string; createdAt: Date }): string {
    return this.encode(entity.id, entity.createdAt);
  }
}

/**
 * 游标分页查询构建器
 */
export interface CursorPaginationOptions {
  cursor?: string;
  limit: number;
  sortDirection: SortDirection;
  timestampColumn?: string; // 默认 'created_at'
  idColumn?: string; // 默认 'id'
}

/**
 * 游标分页查询条件
 */
export interface CursorWhereCondition {
  id?: any;
  createdAt?: any;
  [key: string]: any;
}
