import { ApiProperty } from '@nestjs/swagger';

/**
 * 分页元数据
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

/**
 * 分页响应封装
 */
export class PaginatedApiResponse<T = any> {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '响应数据数组' })
  data: T[];

  @ApiProperty({ description: '分页元数据' })
  meta: PaginationMeta;

  @ApiProperty({ description: '错误消息', required: false })
  message?: string;

  @ApiProperty({ description: '时间戳', example: 1642224000000 })
  timestamp: number;

  constructor(data: T[], meta: PaginationMeta, message?: string) {
    this.success = true;
    this.data = data;
    this.meta = meta;
    this.message = message;
    this.timestamp = Date.now();
  }
}

/**
 * 通用API响应封装
 */
export class ApiResponse<T = any> {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '响应数据' })
  data?: T;

  @ApiProperty({ description: '错误消息', required: false })
  message?: string;

  @ApiProperty({ description: '错误代码', required: false })
  errorCode?: string;

  @ApiProperty({ description: '时间戳', example: 1642224000000 })
  timestamp: number;

  constructor(success: boolean, data?: T, message?: string, errorCode?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.errorCode = errorCode;
    this.timestamp = Date.now();
  }

  /**
   * 成功响应
   */
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return new ApiResponse(true, data, message);
  }

  /**
   * 失败响应
   */
  static error<T = null>(message: string, errorCode?: string): ApiResponse<T> {
    return new ApiResponse(false, null as T, message, errorCode);
  }

  /**
   * 分页响应
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string,
  ): PaginatedApiResponse<T> {
    return new PaginatedApiResponse(data, { total, page, limit }, message);
  }
}
