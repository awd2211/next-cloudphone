import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';

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
  static logResponse(
    response: AxiosResponse,
    duration: number,
    requestId: string
  ) {
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
  static logError(
    error: AxiosError,
    duration: number,
    requestId: string
  ) {
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

    sensitiveHeaders.forEach(header => {
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
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'cvv',
    ];

    sensitiveFields.forEach(field => {
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
    const requestId = (response.config as any).requestId || 'unknown';

    // 记录响应日志
    RequestLogger.logResponse(response, duration, requestId);

    // 慢请求警告（超过 5 秒，用户端阈值更高）
    if (duration > 5000 && process.env.NODE_ENV === 'development') {
      console.warn(
        `⚠️ 慢请求警告: ${response.config.method?.toUpperCase()} ${response.config.url} 耗时 ${duration}ms`
      );
    }

    return response.data;
  },
  (error: AxiosError) => {
    // 计算请求耗时
    const duration = Date.now() - ((error.config as any)?.requestStartTime || 0);
    const requestId = (error.config as any)?.requestId || 'unknown';

    // 记录错误日志
    RequestLogger.logError(error, duration, requestId);

    // 处理不同的 HTTP 状态码
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          message.error((data as any)?.message || '请求参数错误');
          break;
        case 401:
          message.error('登录已过期，请重新登录');
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
