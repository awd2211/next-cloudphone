import { Params } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';

/**
 * 敏感字段列表 - 这些字段的值会被脱敏
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'passwordHash',
  'creditCard',
  'ssn',
  'privateKey',
];

/**
 * 脱敏函数 - 递归处理对象中的敏感字段
 */
function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive && typeof value === 'string') {
      // 只显示前3个字符
      redacted[key] = value.length > 3 
        ? `${value.substring(0, 3)}***` 
        : '***';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * 创建统一的 Pino 日志配置
 */
export function createLoggerConfig(serviceName: string): Params {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

  return {
    pinoHttp: {
      level: logLevel,
      
      // 生产环境使用 JSON 格式，开发环境使用 pretty 格式
      transport: !isProduction ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
          messageFormat: '{service} [{context}] {msg}',
          errorLikeObjectKeys: ['err', 'error'],
          singleLine: false,
        },
      } : undefined,

      // 自定义序列化器
      serializers: {
        req(req: any) {
          return {
            id: req.id,
            method: req.method,
            url: req.url,
            path: req.raw?.url || req.url,
            // 脱敏查询参数
            query: redactSensitiveData(req.query),
            params: req.params,
            // 脱敏请求头
            headers: redactSensitiveData({
              host: req.headers.host,
              'user-agent': req.headers['user-agent'],
              'content-type': req.headers['content-type'],
              'content-length': req.headers['content-length'],
              'x-forwarded-for': req.headers['x-forwarded-for'],
              'x-real-ip': req.headers['x-real-ip'],
              // 不记录敏感的 authorization 完整值
              authorization: req.headers.authorization ? 'Bearer ***' : undefined,
            }),
            remoteAddress: req.raw?.socket?.remoteAddress || req.ip,
            remotePort: req.raw?.socket?.remotePort,
          };
        },
        res(res: any) {
          return {
            statusCode: res.statusCode,
            headers: {
              'content-type': res.getHeader('content-type'),
              'content-length': res.getHeader('content-length'),
            },
          };
        },
        err(err: any) {
          return {
            type: err.type || err.constructor?.name,
            message: err.message,
            stack: isProduction ? undefined : err.stack,
            code: err.code,
            statusCode: err.statusCode || err.status,
            // 包含额外的错误上下文
            context: err.context,
            validation: err.validation,
          };
        },
      },

      // 自定义属性 - 添加到每条日志
      customProps: (req: any) => ({
        service: serviceName,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
        // 请求ID - 用于分布式追踪
        requestId: req.id || req.headers?.['x-request-id'] || uuidv4(),
        // 用户信息（如果有）
        userId: req.user?.id,
        userRole: req.user?.role,
        // 租户信息（多租户场景）
        tenantId: req.headers?.['x-tenant-id'],
      }),

      // 自定义日志级别
      customLogLevel: (req: any, res: any, err: any) => {
        if (res.statusCode >= 500 || err) {
          return 'error';
        }
        if (res.statusCode >= 400) {
          return 'warn';
        }
        if (res.statusCode >= 300) {
          return 'info';
        }
        return 'info';
      },

      // 自定义成功消息
      customSuccessMessage: (req: any, res: any) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
      },

      // 自定义错误消息
      customErrorMessage: (req: any, res: any, err: any) => {
        return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
      },

      // 自动记录请求和响应
      autoLogging: {
        // 忽略健康检查等端点
        ignore: (req: any) => {
          const ignoredPaths = [
            '/health',
            '/metrics',
            '/favicon.ico',
          ];
          return ignoredPaths.some(path => req.url?.startsWith(path));
        },
      },

      // 自定义属性键
      customAttributeKeys: {
        req: 'request',
        res: 'response',
        err: 'error',
        responseTime: 'duration',
      },

      // 生产环境的额外配置
      ...(isProduction && {
        // 生产环境不记录请求体（可能包含敏感数据）
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'request.headers.authorization',
            'request.headers.cookie',
          ],
          censor: '***REDACTED***',
        },
        // 时间戳格式
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
      }),
    },
  };
}

/**
 * 创建应用日志记录器（用于业务日志）
 */
export function createAppLogger(serviceName: string) {
  const pino = require('pino');
  const isProduction = process.env.NODE_ENV === 'production';

  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    
    // 生产环境配置
    ...(isProduction ? {
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      formatters: {
        level: (label: string) => {
          return { level: label };
        },
      },
    } : {
      // 开发环境使用 pretty 输出
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
    }),

    // 基础属性
    base: {
      service: serviceName,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
    },
  });
}

/**
 * 日志采样配置 - 高流量时减少日志量
 */
export function shouldSampleLog(sampleRate: number = 0.1): boolean {
  // 生产环境且配置了采样率时启用
  if (process.env.NODE_ENV === 'production' && process.env.LOG_SAMPLING === 'true') {
    return Math.random() < sampleRate;
  }
  return true; // 开发环境记录所有日志
}

