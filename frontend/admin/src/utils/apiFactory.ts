import request from './request';

/**
 * API 响应类型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  message?: string;
}

/**
 * 分页参数类型
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  limit?: number;
}

/**
 * 标准 CRUD API 资源接口
 */
export interface ApiResource<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  /**
   * 获取列表（分页）
   */
  getList: (params?: PaginationParams & Record<string, any>) => Promise<PaginatedResponse<T>>;

  /**
   * 获取单个资源
   */
  getOne: (id: string | number) => Promise<ApiResponse<T>>;

  /**
   * 创建资源
   */
  create: (data: CreateDTO) => Promise<ApiResponse<T>>;

  /**
   * 更新资源
   */
  update: (id: string | number, data: UpdateDTO) => Promise<ApiResponse<T>>;

  /**
   * 删除资源
   */
  delete: (id: string | number) => Promise<ApiResponse<void>>;

  /**
   * 批量删除
   */
  batchDelete?: (ids: (string | number)[]) => Promise<ApiResponse<void>>;
}

/**
 * API 资源工厂配置
 */
export interface ApiResourceConfig {
  /**
   * 基础路径，如 '/devices'
   */
  basePath: string;

  /**
   * 自定义列表端点
   */
  listEndpoint?: string;

  /**
   * 自定义详情端点
   */
  detailEndpoint?: (id: string | number) => string;

  /**
   * 自定义创建端点
   */
  createEndpoint?: string;

  /**
   * 自定义更新端点
   */
  updateEndpoint?: (id: string | number) => string;

  /**
   * 自定义删除端点
   */
  deleteEndpoint?: (id: string | number) => string;

  /**
   * 批量删除端点
   */
  batchDeleteEndpoint?: string;
}

/**
 * 创建标准 CRUD API 资源
 *
 * @example
 * ```ts
 * interface Device {
 *   id: string;
 *   name: string;
 *   status: string;
 * }
 *
 * interface CreateDeviceDto {
 *   name: string;
 *   templateId: string;
 * }
 *
 * const deviceApi = createApiResource<Device, CreateDeviceDto>({ basePath: '/devices' });
 *
 * // 使用
 * const devices = await deviceApi.getList({ page: 1, pageSize: 10 });
 * const device = await deviceApi.getOne('device-123');
 * await deviceApi.create({ name: 'My Device', templateId: 'template-1' });
 * await deviceApi.update('device-123', { name: 'Updated Name' });
 * await deviceApi.delete('device-123');
 * ```
 */
export function createApiResource<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>>(
  config: ApiResourceConfig
): ApiResource<T, CreateDTO, UpdateDTO> {
  const {
    basePath,
    listEndpoint,
    detailEndpoint,
    createEndpoint,
    updateEndpoint,
    deleteEndpoint,
    batchDeleteEndpoint,
  } = config;

  return {
    getList: (params) => {
      return request.get<PaginatedResponse<T>>(
        listEndpoint || basePath,
        { params }
      );
    },

    getOne: (id) => {
      const endpoint = detailEndpoint?.(id) || `${basePath}/${id}`;
      return request.get<ApiResponse<T>>(endpoint);
    },

    create: (data) => {
      const endpoint = createEndpoint || basePath;
      return request.post<ApiResponse<T>>(endpoint, data);
    },

    update: (id, data) => {
      const endpoint = updateEndpoint?.(id) || `${basePath}/${id}`;
      return request.put<ApiResponse<T>>(endpoint, data);
    },

    delete: (id) => {
      const endpoint = deleteEndpoint?.(id) || `${basePath}/${id}`;
      return request.delete<ApiResponse<void>>(endpoint);
    },

    batchDelete: batchDeleteEndpoint
      ? (ids) => request.post<ApiResponse<void>>(batchDeleteEndpoint, { ids })
      : undefined,
  };
}

/**
 * 创建只读 API 资源（只有查询功能）
 */
export function createReadOnlyApiResource<T>(
  config: Pick<ApiResourceConfig, 'basePath' | 'listEndpoint' | 'detailEndpoint'>
): Pick<ApiResource<T>, 'getList' | 'getOne'> {
  const { basePath, listEndpoint, detailEndpoint } = config;

  return {
    getList: (params) => {
      return request.get<PaginatedResponse<T>>(
        listEndpoint || basePath,
        { params }
      );
    },

    getOne: (id) => {
      const endpoint = detailEndpoint?.(id) || `${basePath}/${id}`;
      return request.get<ApiResponse<T>>(endpoint);
    },
  };
}

/**
 * 扩展 API 资源，添加自定义方法
 *
 * @example
 * ```ts
 * const deviceApi = extendApiResource(
 *   createApiResource<Device>({ basePath: '/devices' }),
 *   {
 *     start: (id: string) => request.post(`/devices/${id}/start`),
 *     stop: (id: string) => request.post(`/devices/${id}/stop`),
 *     restart: (id: string) => request.post(`/devices/${id}/restart`),
 *   }
 * );
 *
 * // 使用
 * await deviceApi.start('device-123');
 * await deviceApi.stop('device-123');
 * ```
 */
export function extendApiResource<T, E extends Record<string, any>>(
  baseResource: ApiResource<T>,
  extensions: E
): ApiResource<T> & E {
  return {
    ...baseResource,
    ...extensions,
  };
}

// ========== 预定义的 API 资源示例 ==========

/**
 * 设备 API 类型（示例）
 */
export interface Device {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  userId: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceDto {
  name: string;
  templateId: string;
  userId?: string;
}

/**
 * 用户 API 类型（示例）
 */
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role?: string;
}

/**
 * 角色 API 类型（示例）
 */
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissions?: string[];
}

// ========== 导出常用 API 工厂（可按需创建） ==========

// 注意：这些是示例，实际使用时应该在各自的 service 文件中创建
// export const deviceApi = createApiResource<Device, CreateDeviceDto>({ basePath: '/devices' });
// export const userApi = createApiResource<User, CreateUserDto>({ basePath: '/users' });
// export const roleApi = createApiResource<Role, CreateRoleDto>({ basePath: '/roles' });
