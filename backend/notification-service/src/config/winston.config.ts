import * as winston from 'winston';

const { combine, timestamp, json, printf, errors } = winston.format;

// 开发环境格式（易读）
const devFormat = printf(({ timestamp, level, message, context, ...meta }) => {
  const metaStr = Object.keys(meta).length
    ? `\n${JSON.stringify(meta, null, 2)}`
    : '';

  return `${timestamp} [${level}] [${context || 'Application'}] ${message}${metaStr}`;
});

// 生产环境格式（纯 JSON）
const prodFormat = combine(
  timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  errors({ stack: true }),
  json()
);

// 根据环境选择格式
const getFormat = () => {
  if (process.env.NODE_ENV === 'production') {
    return prodFormat;
  }

  return combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    devFormat
  );
};

export const winstonConfig = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: getFormat(),
  transports: [
    // Console transport - 始终启用
    new winston.transports.Console(),

    // 生产环境：文件日志
    ...(process.env.NODE_ENV === 'production' && process.env.ENABLE_FILE_LOGGING === 'true' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: prodFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: prodFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ] : []),
  ],
  // 捕获未处理的 promise rejections
  exceptionHandlers: process.env.NODE_ENV === 'production' ? [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ] : undefined,
  rejectionHandlers: process.env.NODE_ENV === 'production' ? [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ] : undefined,
};
