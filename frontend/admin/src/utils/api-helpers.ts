/**
 * API 辅助函数
 *
 * 注意：推荐使用 utils/api.ts 中的 `api` 包装器，它会自动处理响应解包。
 * 这些辅助函数主要用于向后兼容和特殊场景。
 */

import type { ApiResponse, PaginatedResponse } from '../types';

/**
 * 从 API 响应中提取数据
 * @deprecated 推荐使用 api.get/post 等方法，它们自动解包响应
 */
export function extractData<T>(response: ApiResponse<T>): T {
  return response.data;
}

/**
 * 从分页响应中提取数据
 * @deprecated 推荐使用 api.get 获取分页数据
 */
export function extractPaginatedData<T>(response: PaginatedResponse<T>): T[] {
  return response.data;
}

/**
 * 检查响应是否成功
 * @deprecated 使用 api 包装器时，错误会抛出异常，不需要手动检查
 *
 * 新模式：
 * - 成功：直接返回数据（无 success 字段）
 * - 失败：抛出异常
 */
export function isSuccessResponse<T>(response: ApiResponse<T> | any): boolean {
  // 兼容旧格式（有 success 字段）和新格式（无 success 字段，直接返回数据）
  if (response && typeof response === 'object' && 'success' in response) {
    return response.success === true;
  }
  // 新格式：如果没有抛出异常，就是成功的
  return response !== undefined && response !== null;
}

/**
 * 安全地访问响应数据
 * 智能处理新旧两种响应格式
 */
export function safeExtractData<T>(response: ApiResponse<T> | T): T {
  if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
    return (response as ApiResponse<T>).data;
  }
  return response as T;
}
