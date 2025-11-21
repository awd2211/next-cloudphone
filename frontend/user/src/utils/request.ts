import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { message, Modal } from 'antd';

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

// ========== Token 刷新管理 ==========
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * 刷新 Token
 * 使用单例模式确保同时只有一个刷新请求
 */
async function refreshAccessToken(): Promise<string> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = new Promise(async (resolve, reject) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token available');
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:30000/api'}/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const newToken = response.data.token;
      if (newToken) {
        localStorage.setItem('token', newToken);
        console.log('✅ Token 刷新成功');
        resolve(newToken);
      } else {
        throw new Error('No token in response');
      }
    } catch (error) {
      console.error('❌ Token 刷新失败:', error);
      reject(error);
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  });

  return refreshPromise;
}

/**
 * 显示会话过期对话框
 */
let sessionExpiredModalShown = false;
function showSessionExpiredModal() {
  if (sessionExpiredModalShown) return;
  sessionExpiredModalShown = true;

  let countdown = 5;
  const modal = Modal.warning({
    title: '会话已过期',
    content: `您的登录会话已过期，${countdown} 秒后将跳转到登录页面...`,
    okText: '立即登录',
    onOk: () => {
      sessionExpiredModalShown = false;
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      window.location.href = '/login';
    },
  });

  const timer = setInterval(() => {
    countdown--;
    modal.update({
      content: `您的登录会话已过期，${countdown} 秒后将跳转到登录页面...`,
    });

    if (countdown <= 0) {
      clearInterval(timer);
      modal.destroy();
      sessionExpiredModalShown = false;
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      window.location.href = '/login';
    }
  }, 1000);
}

// ========== 自动重试配置 ==========
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryableStatuses: number[];
  retryableErrors: string[];
}

const defaultRetryConfig: RetryConfig = {
  retries: 3,
  retryDelay: 1000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ENETUNREACH'],
};

/**
 * 判断请求是否可以重试
 */
function isRetryableRequest(error: AxiosError): boolean {
  const method = error.config?.method?.toUpperCase();
  const idempotentMethods = ['GET', 'HEAD', 'OPTIONS', 'PUT'];

  if (!method || !idempotentMethods.includes(method)) {
    if (error.code && defaultRetryConfig.retryableErrors.includes(error.code)) {
      return true;
    }
    return false;
  }

  if (
    error.response?.status &&
    defaultRetryConfig.retryableStatuses.includes(error.response.status)
  ) {
    return true;
  }

  if (error.code && defaultRetryConfig.retryableErrors.includes(error.code)) {
    return true;
  }

  if (error.message === 'Network Error') {
    return true;
  }

  return false;
}

/**
 * 计算重试延迟（指数退避）
 */
function getRetryDelay(retryCount: number): number {
  return Math.min(defaultRetryConfig.retryDelay * Math.pow(2, retryCount - 1), 10000);
}

/**
 * 执行延迟
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:30000/api',
  timeout: 30000, // 用户端保持 30 秒超时
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 生成请求 ID
    const reqId = generateRequestId();
    config.headers = config.headers || {};
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
request.interceptors.response.use(
  (response) => {
    // 计算请求耗时
    const duration = Date.now() - ((response.config as any).requestStartTime || 0);
    const reqId = (response.config as any).requestId || 'unknown';

    // 记录响应日志
    RequestLogger.logResponse(response, duration, reqId);

    // 慢请求警告（超过 5 秒，用户端阈值更高）
    if (duration > 5000 && process.env.NODE_ENV === 'development') {
      console.warn(
        `⚠️ 慢请求警告: ${response.config.method?.toUpperCase()} ${response.config.url} 耗时 ${duration}ms`
      );
    }

    return response.data;
  },
  async (error: AxiosError) => {
    // 计算请求耗时
    const duration = Date.now() - ((error.config as any)?.requestStartTime || 0);
    const reqId = (error.config as any)?.requestId || 'unknown';

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
      const retryDelayMs = getRetryDelay(config.retryCount);

      console.log(
        `🔄 重试请求 (${config.retryCount}/${defaultRetryConfig.retries}): ${config.method?.toUpperCase()} ${config.url} - 延迟 ${retryDelayMs}ms`
      );

      if (process.env.NODE_ENV === 'development') {
        message.loading(
          `正在重试... (${config.retryCount}/${defaultRetryConfig.retries})`,
          retryDelayMs / 1000
        );
      }

      await delay(retryDelayMs);
      return request(config);
    }

    // ========== 不再重试，记录错误日志 ==========
    RequestLogger.logError(error, duration, reqId);

    // 处理不同的 HTTP 状态码
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          message.error((data as any)?.message || '请求参数错误');
          break;
        case 401:
          // 公开路由列表（不需要登录）
          const publicRoutes = [
            '/',
            '/product',
            '/pricing',
            '/solutions',
            '/case-studies',
            '/about',
            '/contact',
            '/careers',
            '/help',
            '/legal',
          ];

          // 检查当前路径是否为公开路由
          const currentPath = window.location.pathname;
          const isPublicRoute = publicRoutes.some(route =>
            currentPath === route || currentPath.startsWith(route + '/')
          );

          // 如果是公开路由，不处理 401
          if (!isPublicRoute) {
            // ========== Token 自动刷新逻辑 ==========
            try {
              console.log('🔄 检测到 401 错误，尝试刷新 token...');
              const newToken = await refreshAccessToken();

              // 更新原始请求的 token
              if (error.config && error.config.headers) {
                error.config.headers.Authorization = `Bearer ${newToken}`;
              }

              // 重试原始请求
              console.log('🔄 Token 刷新成功，重试原始请求...');
              return request(error.config!);
            } catch (_refreshError) {
              // Token 刷新失败，显示会话过期对话框
              console.error('❌ Token 刷新失败，会话已过期');
              showSessionExpiredModal();
            }
          }
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

// 由于响应拦截器返回 response.data，需要重新定义类型
// 创建类型覆盖接口
interface CustomRequestInstance {
  <T = any>(config: any): Promise<T>;
  <T = any>(url: string, config?: any): Promise<T>;
  get<T = any>(url: string, config?: any): Promise<T>;
  delete<T = any>(url: string, config?: any): Promise<T>;
  head<T = any>(url: string, config?: any): Promise<T>;
  options<T = any>(url: string, config?: any): Promise<T>;
  post<T = any>(url: string, data?: any, config?: any): Promise<T>;
  put<T = any>(url: string, data?: any, config?: any): Promise<T>;
  patch<T = any>(url: string, data?: any, config?: any): Promise<T>;
}

// 导出带有正确类型的 request
export default request as CustomRequestInstance;
