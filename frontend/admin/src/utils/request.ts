import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';
import type { ApiResponse } from '../types';

// 生成唯一请求 ID
let requestId = 0;
const generateRequestId = () => `req_${Date.now()}_${++requestId}`;

// 日志记录器
class RequestLogger {
  /**
   * 记录请求日志
   */
  static logRequest(config: InternalAxiosRequestConfig & { requestId?: string }) {
    const log = {
      type: 'api_request',
      requestId: config.requestId,
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      headers: this.sanitizeHeaders(config.headers),
      params: config.params,
      data: this.sanitizeData(config.data),
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('📤 API Request:', log);
    }

    return log;
  }

  /**
   * 记录响应日志
   */
  static logResponse(response: AxiosResponse, duration: number, requestId: string) {
    const log = {
      type: 'api_response',
      requestId,
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('📥 API Response:', log);
    }

    return log;
  }

  /**
   * 记录错误日志
   */
  static logError(error: AxiosError, duration: number, requestId: string) {
    const log = {
      type: 'api_error',
      requestId,
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      errorMessage: error.message,
      responseData: error.response?.data,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    console.error('❌ API Error:', log);

    // 发送错误日志到后端
    this.sendErrorToBackend(log);

    return log;
  }

  /**
   * 移除敏感的请求头
   */
  private static sanitizeHeaders(headers: any): any {
    if (!headers) return {};
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  /**
   * 移除敏感的请求数据
   */
  private static sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'cvv'];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  /**
   * 发送错误日志到后端
   */
  private static sendErrorToBackend(errorLog: any) {
    // 仅在生产环境发送
    if (process.env.NODE_ENV !== 'production') return;

    try {
      // 使用原生 fetch 避免循环调用
      fetch(`${import.meta.env.VITE_API_BASE_URL}/logs/frontend-errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...errorLog,
          userAgent: navigator.userAgent,
          url: window.location.href,
          userId: localStorage.getItem('userId'),
        }),
      }).catch(() => {
        // 静默失败，避免二次错误
      });
    } catch {
      // 静默失败
    }
  }
}

// 创建一个类型化的 axios 实例
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:30000/api',
  timeout: 10000,
});

// 扩展 axios 实例类型
interface TypedAxiosInstance {
  get<T = any>(url: string, config?: any): Promise<T>;
  post<T = any>(url: string, data?: any, config?: any): Promise<T>;
  put<T = any>(url: string, data?: any, config?: any): Promise<T>;
  patch<T = any>(url: string, data?: any, config?: any): Promise<T>;
  delete<T = any>(url: string, config?: any): Promise<T>;
  interceptors: typeof axiosInstance.interceptors;
}

const request = axiosInstance as any as TypedAxiosInstance;

// ========== 自动重试配置 ==========
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryableStatuses: number[];
  retryableErrors: string[];
}

const defaultRetryConfig: RetryConfig = {
  retries: 3,
  retryDelay: 1000, // 初始延迟 1 秒
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ENETUNREACH'],
};

/**
 * 判断请求是否可以重试
 */
function isRetryableRequest(error: AxiosError): boolean {
  // 不重试幂等性无保证的请求（POST, PATCH, DELETE默认不重试）
  const method = error.config?.method?.toUpperCase();
  const idempotentMethods = ['GET', 'HEAD', 'OPTIONS', 'PUT'];

  if (!method || !idempotentMethods.includes(method)) {
    // POST/PATCH/DELETE 只在特定错误码时重试（网络错误、超时）
    if (error.code && defaultRetryConfig.retryableErrors.includes(error.code)) {
      return true;
    }
    return false;
  }

  // 检查状态码
  if (
    error.response?.status &&
    defaultRetryConfig.retryableStatuses.includes(error.response.status)
  ) {
    return true;
  }

  // 检查错误类型
  if (error.code && defaultRetryConfig.retryableErrors.includes(error.code)) {
    return true;
  }

  // 网络错误
  if (error.message === 'Network Error') {
    return true;
  }

  return false;
}

/**
 * 计算重试延迟（指数退避）
 */
function getRetryDelay(retryCount: number): number {
  // 指数退避: 1s, 2s, 4s
  return Math.min(defaultRetryConfig.retryDelay * Math.pow(2, retryCount - 1), 10000);
}

/**
 * 执行延迟
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    // 生成请求 ID
    const reqId = generateRequestId();
    if (!config.headers) {
      config.headers = {} as any;
    }
    config.headers['X-Request-ID'] = reqId;
    (config as any).requestId = reqId;
    (config as any).requestStartTime = Date.now();

    // 添加认证 Token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 记录请求日志
    RequestLogger.logRequest(config);

    return config;
  },
  (error) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response: AxiosResponse): ApiResponse<any> | any => {
    // 计算请求耗时
    const duration = Date.now() - ((response.config as any).requestStartTime || 0);
    const requestId = (response.config as any).requestId || 'unknown';

    // 记录响应日志
    RequestLogger.logResponse(response, duration, requestId);

    // 慢请求警告（超过 3 秒）
    if (duration > 3000 && process.env.NODE_ENV === 'development') {
      console.warn(
        `⚠️ 慢请求警告: ${response.config.method?.toUpperCase()} ${response.config.url} 耗时 ${duration}ms`
      );
    }

    // 直接返回 response.data，保持后端返回的结构
    return response.data;
  },
  async (error: AxiosError) => {
    // 计算请求耗时
    const duration = Date.now() - ((error.config as any)?.requestStartTime || 0);
    const requestId = (error.config as any)?.requestId || 'unknown';

    // ========== 自动重试逻辑 ==========
    const config = error.config as any;
    if (!config) {
      return Promise.reject(error);
    }

    // 初始化重试计数
    config.retryCount = config.retryCount || 0;

    // 检查是否应该重试
    const shouldRetry = isRetryableRequest(error) && config.retryCount < defaultRetryConfig.retries;

    if (shouldRetry) {
      config.retryCount += 1;
      const retryDelay = getRetryDelay(config.retryCount);

      console.log(
        `🔄 重试请求 (${config.retryCount}/${defaultRetryConfig.retries}): ${config.method?.toUpperCase()} ${config.url} - 延迟 ${retryDelay}ms`
      );

      // 在开发环境显示重试提示
      if (process.env.NODE_ENV === 'development') {
        message.loading(
          `正在重试... (${config.retryCount}/${defaultRetryConfig.retries})`,
          retryDelay / 1000
        );
      }

      // 等待延迟后重试
      await delay(retryDelay);

      // 重新发送请求
      return axiosInstance(config);
    }

    // ========== 不再重试，记录错误日志 ==========
    RequestLogger.logError(error, duration, requestId);

    // 处理不同的 HTTP 状态码
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          message.error((data as any)?.message || '请求参数错误');
          break;
        case 401:
          message.error('未授权，请重新登录');
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          // 延迟跳转，避免在拦截器中多次触发
          setTimeout(() => {
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }, 1000);
          break;
        case 403:
          message.error('没有权限访问此资源');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 422:
          message.error((data as any)?.message || '请求验证失败');
          break;
        case 429:
          message.error('请求过于频繁，请稍后再试');
          break;
        case 500:
          message.error('服务器内部错误');
          break;
        case 502:
          message.error('网关错误');
          break;
        case 503:
          message.error('服务暂时不可用');
          break;
        case 504:
          message.error('网关超时');
          break;
        default:
          message.error((data as any)?.message || `请求失败 (${status})`);
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      if (error.code === 'ECONNABORTED') {
        message.error('请求超时，请检查网络连接');
      } else if (error.message === 'Network Error') {
        message.error('网络错误，请检查网络连接');
      } else {
        message.error('无法连接到服务器，请稍后再试');
      }
    } else {
      // 请求配置出错
      message.error('请求配置错误');
      console.error('请求配置错误:', error.message);
    }

    return Promise.reject(error);
  }
);

export default request;
