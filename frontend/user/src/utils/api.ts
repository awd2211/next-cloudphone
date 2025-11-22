/**
 * 类型安全的 API 请求包装器
 *
 * 自动解包后端 TransformInterceptor 的标准响应格式
 * 保持 service 层代码简洁，同时提供显式的解包语义
 *
 * @example
 * // 在 service 文件中使用
 * import { api } from '@/utils/api';
 *
 * export const getUsers = () => api.get<User[]>('/users');
 * export const createUser = (data: CreateUserDto) => api.post<User>('/users', data);
 */

import request from './request';
import type { ApiResponse } from '@/types';

/**
 * 从 API 响应中提取 data
 */
function unwrap<T>(response: ApiResponse<T> | T): T {
  if (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    (response as ApiResponse<T>).success === true &&
    'data' in response
  ) {
    return (response as ApiResponse<T>).data;
  }
  return response as T;
}

/**
 * 类型安全的 API 客户端
 *
 * 与直接使用 request 的区别：
 * - request.get<T>() 返回 ApiResponse<T>（需要手动 .data）
 * - api.get<T>() 直接返回 T（自动解包）
 */
export const api = {
  /**
   * GET 请求（自动解包响应）
   */
  async get<T>(url: string, config?: Parameters<typeof request.get>[1]): Promise<T> {
    const response = await request.get<ApiResponse<T>>(url, config);
    return unwrap(response);
  },

  /**
   * POST 请求（自动解包响应）
   */
  async post<T>(url: string, data?: unknown, config?: Parameters<typeof request.post>[2]): Promise<T> {
    const response = await request.post<ApiResponse<T>>(url, data, config);
    return unwrap(response);
  },

  /**
   * PUT 请求（自动解包响应）
   */
  async put<T>(url: string, data?: unknown, config?: Parameters<typeof request.put>[2]): Promise<T> {
    const response = await request.put<ApiResponse<T>>(url, data, config);
    return unwrap(response);
  },

  /**
   * PATCH 请求（自动解包响应）
   */
  async patch<T>(url: string, data?: unknown, config?: Parameters<typeof request.patch>[2]): Promise<T> {
    const response = await request.patch<ApiResponse<T>>(url, data, config);
    return unwrap(response);
  },

  /**
   * DELETE 请求（自动解包响应）
   */
  async delete<T>(url: string, config?: Parameters<typeof request.delete>[1]): Promise<T> {
    const response = await request.delete<ApiResponse<T>>(url, config);
    return unwrap(response);
  },

  /**
   * 原始 request 实例（需要完整响应时使用）
   * @example
   * const fullResponse = await api.raw.get<ApiResponse<User>>('/users/me');
   * console.log(fullResponse.timestamp, fullResponse.requestId);
   */
  raw: request,
};

export default api;
