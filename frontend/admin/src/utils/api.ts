/**
 * API 包装器 - 自动解包后端响应
 *
 * 后端 TransformInterceptor 将所有响应包装为:
 * { success: true, data: T, timestamp: string, path: string, requestId: string }
 *
 * 本模块提供智能解包功能:
 * - 检测到包装格式时自动解包，返回 T
 * - 非包装格式则透传原始数据
 * - 保留 api.raw 访问完整响应（如需 requestId 追踪）
 *
 * ## 后端响应类型
 *
 * 1. 直接返回数据:
 *    控制器: return user;
 *    响应: { success, data: User }
 *    前端: api.get<User>() → User
 *
 * 2. ActionResult (带消息):
 *    控制器: return { data: user, message: '成功' };
 *    响应: { success, data: { data: User, message: string } }
 *    前端: api.post<ActionResult<User>>() → { data: User, message: string }
 */
import request from './request';
import type { ApiResponse } from '../types';

/**
 * 操作结果响应（对应后端 ActionResult）
 * 用于需要返回操作消息的场景
 */
export interface ActionResult<T = void> {
  data?: T;
  message: string;
}

/**
 * 批量操作结果（对应后端 BatchActionResult）
 */
export interface BatchActionResult<T = void> {
  succeeded: T[];
  failed: Array<{ item: T; error: string }>;
  message: string;
}

/**
 * 分页响应（对应后端 PaginatedResponse）
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

/**
 * 智能解包响应数据
 * 检测后端包装格式并提取数据
 *
 * 处理三种响应格式：
 * 1. 普通响应: { success, data: T } → 返回 T
 * 2. 顶层分页响应: { success, data: T[], total, page, pageSize } → 返回 { data: T[], total, page, pageSize }
 * 3. 嵌套分页响应: { success, data: { items: T[], total, page, pageSize } } → 返回 { data: T[], total, page, pageSize }
 */
function unwrap<T>(response: ApiResponse<T> | T): T {
  // 检测是否为后端包装格式
  if (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    (response as ApiResponse<T>).success === true &&
    'data' in response
  ) {
    const apiResponse = response as ApiResponse<T> & { total?: number; page?: number; pageSize?: number; totalPages?: number };
    const data = apiResponse.data as any;

    // 检测嵌套分页响应格式: { data: { items: [], total, page, pageSize } }
    if (
      data &&
      typeof data === 'object' &&
      'items' in data &&
      Array.isArray(data.items) &&
      'total' in data &&
      typeof data.total === 'number'
    ) {
      // 嵌套分页响应：转换为前端期望的格式
      return {
        data: data.items,
        total: data.total,
        page: data.page,
        pageSize: data.pageSize,
        totalPages: data.totalPages,
      } as T;
    }

    // 检测顶层分页响应（包含 total 字段在顶层）
    if ('total' in apiResponse && typeof apiResponse.total === 'number') {
      // 顶层分页响应：保留分页元数据
      return {
        data: apiResponse.data,
        total: apiResponse.total,
        page: apiResponse.page,
        pageSize: apiResponse.pageSize,
        totalPages: apiResponse.totalPages,
      } as T;
    }

    // 普通响应：只返回 data
    return apiResponse.data as T;
  }
  // 非包装格式，透传原始数据
  return response as T;
}

/**
 * 包装后的 API 客户端
 * 自动解包 { success, data } 响应
 */
export const api = {
  /**
   * GET 请求 - 自动解包
   */
  async get<T>(url: string, config?: Parameters<typeof request.get>[1]): Promise<T> {
    const response = await request.get<ApiResponse<T>>(url, config);
    return unwrap(response);
  },

  /**
   * POST 请求 - 自动解包
   */
  async post<T>(url: string, data?: unknown, config?: Parameters<typeof request.post>[2]): Promise<T> {
    const response = await request.post<ApiResponse<T>>(url, data, config);
    return unwrap(response);
  },

  /**
   * PUT 请求 - 自动解包
   */
  async put<T>(url: string, data?: unknown, config?: Parameters<typeof request.put>[2]): Promise<T> {
    const response = await request.put<ApiResponse<T>>(url, data, config);
    return unwrap(response);
  },

  /**
   * PATCH 请求 - 自动解包
   */
  async patch<T>(url: string, data?: unknown, config?: Parameters<typeof request.patch>[2]): Promise<T> {
    const response = await request.patch<ApiResponse<T>>(url, data, config);
    return unwrap(response);
  },

  /**
   * DELETE 请求 - 自动解包
   */
  async delete<T>(url: string, config?: Parameters<typeof request.delete>[1]): Promise<T> {
    const response = await request.delete<ApiResponse<T>>(url, config);
    return unwrap(response);
  },

  /**
   * 原始请求（不解包）
   * 当需要访问完整响应（如 requestId）时使用
   *
   * @example
   * const response = await api.raw.get<ApiResponse<User>>('/users/me');
   * console.log('Request ID:', response.requestId);
   * const user = response.data;
   */
  raw: request,
};

/**
 * 手动解包工具函数
 * 用于需要显式解包的场景
 */
export { unwrap };
