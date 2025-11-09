/**
 * API 响应格式验证工具
 *
 * 用于确保所有 API 返回一致的响应格式
 */

export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface PaginatedApiResponse<T = any> extends StandardApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  hasMore?: boolean;
}

/**
 * 验证响应是否包含 success 字段
 */
export function validateSuccessField(response: any): void {
  expect(response).toBeDefined();
  expect(response).toHaveProperty('success');
  expect(typeof response.success).toBe('boolean');
}

/**
 * 验证成功响应的基本结构
 */
export function validateSuccessResponse<T>(
  response: any,
  options?: {
    expectData?: boolean;
    expectMessage?: boolean;
  }
): asserts response is StandardApiResponse<T> {
  validateSuccessField(response);
  expect(response.success).toBe(true);

  if (options?.expectData !== false) {
    expect(response).toHaveProperty('data');
  }

  if (options?.expectMessage) {
    expect(response).toHaveProperty('message');
    expect(typeof response.message).toBe('string');
  }
}

/**
 * 验证分页响应的结构
 */
export function validatePaginatedResponse<T>(
  response: any,
  options?: {
    expectNonEmpty?: boolean;
    minTotal?: number;
  }
): asserts response is PaginatedApiResponse<T> {
  // 验证基本成功响应
  validateSuccessResponse(response, { expectData: true });

  // 验证分页字段
  expect(response).toHaveProperty('total');
  expect(typeof response.total).toBe('number');
  expect(response.total).toBeGreaterThanOrEqual(0);

  expect(response).toHaveProperty('page');
  expect(typeof response.page).toBe('number');
  expect(response.page).toBeGreaterThan(0);

  expect(response).toHaveProperty('limit');
  expect(typeof response.limit).toBe('number');
  expect(response.limit).toBeGreaterThan(0);

  // 验证 data 是数组
  expect(Array.isArray(response.data)).toBe(true);

  // 可选验证
  if (options?.expectNonEmpty) {
    expect(response.data.length).toBeGreaterThan(0);
  }

  if (options?.minTotal !== undefined) {
    expect(response.total).toBeGreaterThanOrEqual(options.minTotal);
  }
}

/**
 * 验证错误响应的结构
 */
export function validateErrorResponse(
  response: any,
  expectedStatus?: number
): void {
  validateSuccessField(response);
  expect(response.success).toBe(false);
  expect(response).toHaveProperty('error');
  expect(typeof response.error).toBe('string');

  if (expectedStatus) {
    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(expectedStatus);
  }
}

/**
 * 创建响应格式测试套件
 *
 * @example
 * ```typescript
 * describe('API Response Format', () => {
 *   testApiResponseFormat({
 *     name: 'GET /users',
 *     makeRequest: () => request(app).get('/users'),
 *     expectation: 'paginated',
 *   });
 * });
 * ```
 */
export function testApiResponseFormat(options: {
  name: string;
  makeRequest: () => Promise<any>;
  expectation: 'success' | 'paginated' | 'error';
  customValidation?: (response: any) => void;
}) {
  it(`${options.name} should return correct response format`, async () => {
    const response = await options.makeRequest();

    switch (options.expectation) {
      case 'success':
        validateSuccessResponse(response.body);
        break;
      case 'paginated':
        validatePaginatedResponse(response.body);
        break;
      case 'error':
        validateErrorResponse(response.body);
        break;
    }

    if (options.customValidation) {
      options.customValidation(response.body);
    }
  });
}

/**
 * 批量验证多个 API 端点的响应格式
 */
export function testMultipleEndpoints(
  endpoints: Array<{
    name: string;
    makeRequest: () => Promise<any>;
    expectation: 'success' | 'paginated' | 'error';
  }>
) {
  describe('Batch Response Format Validation', () => {
    endpoints.forEach((endpoint) => {
      testApiResponseFormat(endpoint);
    });
  });
}

/**
 * Jest 自定义匹配器 - 验证标准响应格式
 */
export const apiResponseMatchers = {
  toBeStandardResponse(received: any) {
    try {
      validateSuccessResponse(received);
      return {
        message: () => 'Response has standard format',
        pass: true,
      };
    } catch (error) {
      return {
        message: () => `Expected standard response format, but got: ${JSON.stringify(received, null, 2)}`,
        pass: false,
      };
    }
  },

  toBePaginatedResponse(received: any) {
    try {
      validatePaginatedResponse(received);
      return {
        message: () => 'Response has paginated format',
        pass: true,
      };
    } catch (error) {
      return {
        message: () => `Expected paginated response format, but got: ${JSON.stringify(received, null, 2)}`,
        pass: false,
      };
    }
  },
};

// TypeScript 类型扩展
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeStandardResponse(): R;
      toBePaginatedResponse(): R;
    }
  }
}
