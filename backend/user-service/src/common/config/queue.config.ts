import { BullModuleOptions } from '@nestjs/bull';

/**
 * Bull Queue 配置
 *
 * Redis 连接配置，用于队列存储和任务调度
 */
export const queueConfig: BullModuleOptions = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_QUEUE_DB || '1', 10), // 使用 DB 1 避免与缓存冲突
  },
  // 默认任务配置
  defaultJobOptions: {
    attempts: 3, // 失败后最多重试 3 次
    backoff: {
      type: 'exponential', // 指数退避策略
      delay: 2000, // 初始延迟 2 秒
    },
    removeOnComplete: {
      age: 24 * 3600, // 完成后保留 24 小时
      count: 1000, // 最多保留 1000 个完成任务
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 失败任务保留 7 天
    },
  },
  // 限流配置（防止 Redis 过载）
  limiter: {
    max: 100, // 每个时间窗口最多处理 100 个任务
    duration: 1000, // 时间窗口 1 秒
  },
};

/**
 * 队列名称常量
 */
export enum QueueName {
  EMAIL = 'email',           // 邮件队列
  SMS = 'sms',               // 短信队列
  NOTIFICATION = 'notification', // 通知队列
  DEVICE_OPERATION = 'device-operation', // 设备操作队列
  DATA_EXPORT = 'data-export', // 数据导出队列
  REPORT_GENERATION = 'report-generation', // 报表生成队列
  IMAGE_PROCESSING = 'image-processing', // 图片处理队列
  LOG_PROCESSING = 'log-processing', // 日志处理队列
}

/**
 * 任务优先级
 */
export enum JobPriority {
  CRITICAL = 1,   // 关键任务（立即处理）
  HIGH = 3,       // 高优先级
  NORMAL = 5,     // 正常优先级
  LOW = 7,        // 低优先级
  BACKGROUND = 10, // 后台任务
}

/**
 * 任务延迟配置（毫秒）
 */
export const JobDelay = {
  IMMEDIATE: 0,             // 立即执行
  SHORT: 5 * 1000,          // 5秒后
  MEDIUM: 30 * 1000,        // 30秒后
  LONG: 5 * 60 * 1000,      // 5分钟后
  VERY_LONG: 30 * 60 * 1000, // 30分钟后
};
