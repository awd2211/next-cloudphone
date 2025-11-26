/**
 * AWS Device Farm 类型定义
 *
 * API 文档: https://docs.aws.amazon.com/devicefarm/latest/APIReference/Welcome.html
 */

/**
 * AWS 凭证配置
 */
export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

/**
 * 设备信息
 */
export interface AwsDevice {
  /** ARN */
  arn: string;
  /** 设备名称 */
  name: string;
  /** 制造商 */
  manufacturer?: string;
  /** 型号 */
  model?: string;
  /** 操作系统 */
  os?: string;
  /** 平台 */
  platform: 'ANDROID' | 'IOS';
  /** 分辨率 */
  resolution?: {
    width: number;
    height: number;
  };
  /** CPU 架构 */
  cpu?: string;
  /** 内存 (字节) */
  memory?: number;
  /** 可用性 */
  availability?: 'AVAILABLE' | 'HIGHLY_AVAILABLE' | 'BUSY' | 'TEMPORARY_NOT_AVAILABLE';
  /** 每分钟费用 */
  heapSize?: number;
  /** 远程访问是否启用 */
  remoteAccessEnabled?: boolean;
  /** 远程调试是否启用 */
  remoteDebugEnabled?: boolean;
}

/**
 * 远程访问会话
 */
export interface AwsRemoteAccessSession {
  /** ARN */
  arn: string;
  /** 名称 */
  name?: string;
  /** 状态 */
  status: AwsSessionStatus;
  /** 设备 ARN */
  deviceArn?: string;
  /** 设备信息 */
  device?: AwsDevice;
  /** 端点 URL */
  endpoint?: string;
  /** Host 地址 */
  hostAddress?: string;
  /** 创建时间 */
  created?: Date;
  /** 开始时间 */
  started?: Date;
  /** 停止时间 */
  stopped?: Date;
  /** 结果 */
  result?: 'PENDING' | 'PASSED' | 'WARNED' | 'FAILED' | 'SKIPPED' | 'ERRORED' | 'STOPPED';
  /** 消息 */
  message?: string;
  /** 账单方法 */
  billingMethod?: 'METERED' | 'UNMETERED';
}

/**
 * 会话状态
 */
export type AwsSessionStatus =
  | 'PENDING'
  | 'PENDING_CONCURRENCY'
  | 'PENDING_DEVICE'
  | 'PROCESSING'
  | 'SCHEDULING'
  | 'PREPARING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'STOPPING';

/**
 * 项目信息
 */
export interface AwsProject {
  /** ARN */
  arn: string;
  /** 名称 */
  name: string;
  /** 创建时间 */
  created?: Date;
  /** 默认每分钟任务超时 */
  defaultJobTimeoutMinutes?: number;
}

/**
 * 上传信息
 */
export interface AwsUpload {
  /** ARN */
  arn: string;
  /** 名称 */
  name?: string;
  /** 类型 */
  type?: string;
  /** 状态 */
  status?: 'INITIALIZED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  /** URL (用于上传文件) */
  url?: string;
  /** 内容类型 */
  contentType?: string;
  /** 消息 */
  message?: string;
}

/**
 * 创建远程访问会话参数
 */
export interface CreateRemoteAccessSessionRequest {
  /** 项目 ARN */
  projectArn: string;
  /** 设备 ARN */
  deviceArn: string;
  /** 会话名称 */
  name?: string;
  /** 远程调试 */
  remoteDebugEnabled?: boolean;
  /** 远程录制 */
  remoteRecordEnabled?: boolean;
  /** 配置 */
  configuration?: {
    billingMethod?: 'METERED' | 'UNMETERED';
    vpceConfigurationArns?: string[];
  };
  /** 标签 */
  tags?: Record<string, string>;
}

/**
 * AWS API 响应
 */
export interface AwsApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
