/**
 * 统一 API 响应格式规范
 *
 * ## 设计原则
 *
 * 1. **单一包装层**：TransformInterceptor 负责统一包装，控制器不应重复包装
 * 2. **类型安全**：使用泛型确保响应数据类型正确
 * 3. **一致性**：所有 API 端点遵循相同的响应格式
 *
 * ## 最终响应格式（由 TransformInterceptor 自动生成）
 *
 * ```json
 * {
 *   "success": true,
 *   "data": <控制器返回值>,
 *   "timestamp": "2025-11-21T10:30:00.000Z",
 *   "path": "/api/users",
 *   "requestId": "abc123"
 * }
 * ```
 *
 * ## 控制器返回值规范
 *
 * ### 1. 单个实体
 * ```typescript
 * @Get(':id')
 * async findOne(@Param('id') id: string): Promise<User> {
 *   return this.userService.findOne(id);
 * }
 * // 最终响应: { success: true, data: User, ... }
 * ```
 *
 * ### 2. 实体列表（分页）
 * ```typescript
 * @Get()
 * async findAll(@Query() query: PaginationDto): Promise<PaginatedResponse<User>> {
 *   return this.userService.findAll(query);
 * }
 * // 最终响应: { success: true, data: { items: User[], total: number, page: number, pageSize: number }, ... }
 * ```
 *
 * ### 3. 操作结果（带消息）
 * ```typescript
 * @Post()
 * async create(@Body() dto: CreateUserDto): Promise<ActionResult<User>> {
 *   const user = await this.userService.create(dto);
 *   return { data: user, message: '用户创建成功' };
 * }
 * // 最终响应: { success: true, data: { data: User, message: '...' }, ... }
 * ```
 *
 * ### 4. 纯操作（无返回数据）
 * ```typescript
 * @Delete(':id')
 * async remove(@Param('id') id: string): Promise<void> {
 *   await this.userService.remove(id);
 * }
 * // 最终响应: { success: true, data: null, ... }
 * ```
 *
 * ## 错误响应（由 HttpExceptionFilter 处理）
 *
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "code": "USER_NOT_FOUND",
 *     "message": "用户不存在",
 *     "details": { ... }
 *   },
 *   "timestamp": "2025-11-21T10:30:00.000Z",
 *   "path": "/api/users/123",
 *   "requestId": "abc123"
 * }
 * ```
 */

/**
 * 分页响应格式
 * 用于列表查询，包含分页元信息
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 总记录数 */
  total: number;
  /** 当前页码（从 1 开始） */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数（可选，前端可计算） */
  totalPages?: number;
}

/**
 * 旧版分页响应格式（兼容）
 * @deprecated 建议迁移到 PaginatedResponse
 */
export interface LegacyPaginatedResponse<T> {
  /** 数据列表（旧格式使用 data 而非 items） */
  data: T[];
  /** 总记录数 */
  total: number;
}

/**
 * 操作结果响应
 * 用于需要返回操作消息的场景
 */
export interface ActionResult<T = void> {
  /** 操作结果数据（可选） */
  data?: T;
  /** 操作消息 */
  message: string;
}

/**
 * 批量操作结果
 */
export interface BatchActionResult<T = void> {
  /** 成功的项目 */
  succeeded: T[];
  /** 失败的项目 */
  failed: Array<{
    item: T;
    error: string;
  }>;
  /** 操作消息 */
  message: string;
}

/**
 * 异步操作结果（Saga 模式）
 */
export interface AsyncOperationResult {
  /** Saga ID */
  sagaId: string;
  /** 操作消息 */
  message: string;
  /** 初始状态（可选） */
  initialState?: Record<string, unknown>;
}

/**
 * TransformInterceptor 包装后的最终响应格式
 * 注意：这是最终响应格式，控制器不应使用此类型
 */
export interface ApiResponse<T> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data: T;
  /** 时间戳 */
  timestamp: string;
  /** 请求路径 */
  path: string;
  /** 请求 ID（可选） */
  requestId?: string;
}

/**
 * 错误响应格式
 */
export interface ApiErrorResponse {
  /** 是否成功（始终为 false） */
  success: false;
  /** 错误信息 */
  error: {
    /** 错误代码 */
    code: string;
    /** 错误消息 */
    message: string;
    /** 错误详情（可选） */
    details?: Record<string, unknown>;
    /** 验证错误列表（可选） */
    validationErrors?: Array<{
      field: string;
      message: string;
    }>;
  };
  /** 时间戳 */
  timestamp: string;
  /** 请求路径 */
  path: string;
  /** 请求 ID（可选） */
  requestId?: string;
}

/**
 * 创建分页响应的辅助函数
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 从旧格式转换为新格式的辅助函数
 */
export function convertLegacyPagination<T>(
  legacy: LegacyPaginatedResponse<T>,
  page: number = 1,
  pageSize: number = 10,
): PaginatedResponse<T> {
  return {
    items: legacy.data,
    total: legacy.total,
    page,
    pageSize,
    totalPages: Math.ceil(legacy.total / pageSize),
  };
}

/**
 * 创建操作结果的辅助函数
 */
export function createActionResult<T>(
  data: T,
  message: string,
): ActionResult<T> {
  return { data, message };
}

/**
 * 创建批量操作结果的辅助函数
 */
export function createBatchActionResult<T>(
  succeeded: T[],
  failed: Array<{ item: T; error: string }>,
  message?: string,
): BatchActionResult<T> {
  const defaultMessage =
    failed.length === 0
      ? `操作成功，共处理 ${succeeded.length} 项`
      : `操作完成，成功 ${succeeded.length} 项，失败 ${failed.length} 项`;

  return {
    succeeded,
    failed,
    message: message || defaultMessage,
  };
}

/**
 * 创建异步操作结果的辅助函数
 */
export function createAsyncOperationResult(
  sagaId: string,
  message: string,
  initialState?: Record<string, unknown>,
): AsyncOperationResult {
  return { sagaId, message, initialState };
}
