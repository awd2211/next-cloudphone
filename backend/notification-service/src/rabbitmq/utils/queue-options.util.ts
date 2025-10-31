import { MessagePriority, getEventPriority } from '../constants/priority.constants';

/**
 * 队列选项接口
 */
export interface QueueOptionsConfig {
  /** 队列名称 */
  queueName: string;
  /** 事件类型（用于确定死信路由键） */
  eventType: string;
  /** 是否启用优先级（默认 true） */
  enablePriority?: boolean;
  /** 最大优先级（默认 10） */
  maxPriority?: number;
}

/**
 * 生成支持优先级和死信的队列配置
 * @param config 队列配置
 * @returns RabbitMQ 队列选项
 */
export function createQueueOptions(config: QueueOptionsConfig) {
  const { queueName, eventType, enablePriority = true, maxPriority = 10 } = config;

  const options: any = {
    durable: true,
    arguments: {
      // 死信交换机配置
      'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
      'x-dead-letter-routing-key': `${eventType}.failed`,
    },
  };

  // 添加优先级支持
  if (enablePriority) {
    options.arguments['x-max-priority'] = maxPriority;
  }

  return options;
}

/**
 * 为紧急事件创建队列配置（使用 urgent 通道）
 */
export function createUrgentQueueOptions(config: QueueOptionsConfig) {
  return {
    ...createQueueOptions({ ...config, maxPriority: 10 }),
    // 紧急队列的特殊配置
    channel: 'urgent',
  };
}

/**
 * 获取事件对应的通道名称
 */
export function getChannelName(eventType: string): string {
  const priority = getEventPriority(eventType);
  return priority === MessagePriority.URGENT ? 'urgent' : 'default';
}
