/**
 * API 辅助函数
 * 处理各种 API 响应格式
 */

import type { ApiResponse, PaginatedResponse } from '../types';

/**
 * 从 API 响应中提取数据
 */
export function extractData<T>(response: ApiResponse<T>): T {
  return response.data;
}

/**
 * 从分页响应中提取数据
 */
export function extractPaginatedData<T>(response: PaginatedResponse<T>): T[] {
  return response.data;
}

/**
 * 检查响应是否成功
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): boolean {
  return response.success === true;
}

/**
 * 安全地访问响应数据
 */
export function safeExtractData<T>(response: ApiResponse<T> | T): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as ApiResponse<T>).data;
  }
  return response as T;
}
