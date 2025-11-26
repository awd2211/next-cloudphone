/**
 * 基础事件接口
 * 所有微服务事件都应继承此接口
 */
export interface BaseEvent {
  /** 事件唯一ID */
  eventId: string;

  /** 事件类型（如 user.registered, device.created） */
  eventType: string;

  /** 事件版本（用于事件演进） */
  version: string;

  /** 事件时间戳 */
  timestamp: string;

  /** 来源服务 */
  source: string;

  /** 业务流程追踪ID（用于跨服务追踪） */
  correlationId?: string;

  /** 事件负载数据 */
  payload: Record<string, any>;

  /** 分布式追踪上下文（由 EventBusService 自动注入） */
  _trace?: Record<string, string>;

  /** 允许额外的自定义字段 */
  [key: string]: unknown;
}

/**
 * 事件优先级
 */
export enum EventPriority {
  /** 紧急（如安全告警、系统故障） */
  URGENT = 'urgent',

  /** 高（如支付失败、设备故障） */
  HIGH = 'high',

  /** 中（如设备状态变更、应用安装结果） */
  MEDIUM = 'medium',

  /** 低（如营销通知、每日报告） */
  LOW = 'low',
}

/**
 * 带优先级的事件
 */
export interface PrioritizedEvent extends BaseEvent {
  priority: EventPriority;
}
