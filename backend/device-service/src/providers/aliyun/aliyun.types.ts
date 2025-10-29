/**
 * 阿里云国际云手机 ECP (Elastic Cloud Phone) 类型定义
 *
 * 参考文档：
 * - https://www.alibabacloud.com/help/en/elastic-cloud-phone
 * - API: https://api.aliyun.com/#/?product=ecp
 *
 * Phase 4: 阿里云云手机集成
 */

/**
 * 阿里云手机实例状态
 */
export enum AliyunPhoneStatus {
  /** 创建中 */
  CREATING = "Creating",

  /** 运行中 */
  RUNNING = "Running",

  /** 停止中 */
  STOPPING = "Stopping",

  /** 已停止 */
  STOPPED = "Stopped",

  /** 启动中 */
  STARTING = "Starting",

  /** 重启中 */
  RESTARTING = "Restarting",

  /** 删除中 */
  DELETING = "Deleting",

  /** 异常 */
  EXCEPTION = "Exception",

  /** 已释放 */
  RELEASED = "Released",
}

/**
 * 阿里云手机规格类型
 *
 * 规格命名规则: ecp.{series}.{cpu}c{memory}g
 * 例如: ecp.ce.2c4g (2核4G)
 */
export interface AliyunPhoneSpec {
  /** 规格 ID */
  specId: string;

  /** 规格名称 */
  specName: string;

  /** CPU 核心数 */
  cpuCores: number;

  /** 内存大小 (GB) */
  memoryGB: number;

  /** 分辨率 */
  resolution: string;

  /** 屏幕密度 */
  screenDpi: number;

  /** 是否支持 GPU */
  gpuEnabled: boolean;
}

/**
 * 阿里云手机实例信息
 */
export interface AliyunPhoneInstance {
  /** 实例 ID */
  instanceId: string;

  /** 实例名称 */
  instanceName: string;

  /** 规格 ID */
  instanceType: string;

  /** 实例状态 */
  status: AliyunPhoneStatus;

  /** 地域 ID */
  regionId: string;

  /** 可用区 ID */
  zoneId: string;

  /** 镜像 ID */
  imageId: string;

  /** 公网 IP (如果分配) */
  publicIp?: string;

  /** 内网 IP */
  privateIp?: string;

  /** 创建时间 (ISO 8601) */
  creationTime: string;

  /** 过期时间 (包年包月) */
  expiredTime?: string;

  /** 付费类型 (PrePaid/PostPaid) */
  chargeType: "PrePaid" | "PostPaid";

  /** 系统版本 (Android 版本) */
  systemVersion?: string;

  /** 设备型号 */
  phoneModel?: string;

  /** 运行状态描述 */
  statusDescription?: string;
}

/**
 * 创建阿里云手机请求
 */
export interface CreateAliyunPhoneRequest {
  /** 实例名称 */
  instanceName: string;

  /** 规格 ID (如 ecp.ce.2c4g) */
  instanceType: string;

  /** 镜像 ID */
  imageId: string;

  /** 地域 ID */
  regionId: string;

  /** 可用区 ID */
  zoneId: string;

  /** 付费类型 */
  chargeType: "PrePaid" | "PostPaid";

  /** 实例数量 (默认 1) */
  amount?: number;

  /** 购买时长 (月，包年包月时必填) */
  period?: number;

  /** 是否自动续费 */
  autoRenew?: boolean;

  /** 安全组 ID */
  securityGroupId?: string;

  /** 虚拟交换机 ID (VSwitch) */
  vSwitchId?: string;

  /** 描述 */
  description?: string;

  /** 自定义属性 (JSON) */
  property?: Record<string, any>;
}

/**
 * 阿里云手机连接信息
 */
export interface AliyunConnectionInfo {
  /** 实例 ID */
  instanceId: string;

  /** WebRTC 推流地址 */
  streamUrl: string;

  /** WebRTC Token (有效期 30 秒) */
  token: string;

  /** Token 过期时间 */
  expireTime: string;

  /** ADB 公钥 (用于 ADB 连接) */
  adbPublicKey?: string;

  /** ADB 连接地址 (如果开启) */
  adbEndpoint?: string;

  /** STUN 服务器列表 */
  stunServers?: string[];

  /** TURN 服务器列表 */
  turnServers?: Array<{
    urls: string;
    username: string;
    credential: string;
  }>;

  /** 信令服务器地址 */
  signalingUrl?: string;
}

/**
 * 阿里云 ECP SDK 配置
 */
export interface AliyunEcpConfig {
  /** AccessKey ID */
  accessKeyId: string;

  /** AccessKey Secret */
  accessKeySecret: string;

  /** 地域 ID (如 cn-hangzhou, ap-southeast-1) */
  regionId: string;

  /** API 端点 (可选，默认使用地域端点) */
  endpoint?: string;

  /** 默认可用区 */
  defaultZoneId?: string;

  /** 默认镜像 ID */
  defaultImageId?: string;

  /** 默认安全组 ID */
  defaultSecurityGroupId?: string;

  /** 默认虚拟交换机 ID */
  defaultVSwitchId?: string;

  /** 超时时间 (毫秒) */
  timeout?: number;
}

/**
 * 阿里云操作结果
 */
export interface AliyunOperationResult<T = any> {
  /** 是否成功 */
  success: boolean;

  /** 返回数据 */
  data?: T;

  /** 请求 ID (用于问题追踪) */
  requestId?: string;

  /** 错误代码 */
  errorCode?: string;

  /** 错误消息 */
  errorMessage?: string;
}

/**
 * 阿里云手机列表查询参数
 */
export interface ListAliyunPhonesRequest {
  /** 地域 ID */
  regionId: string;

  /** 实例 ID 列表 */
  instanceIds?: string[];

  /** 实例状态 */
  status?: AliyunPhoneStatus;

  /** 实例名称 (模糊匹配) */
  instanceName?: string;

  /** 页码 (从 1 开始) */
  pageNumber?: number;

  /** 每页数量 (默认 10, 最大 100) */
  pageSize?: number;
}

/**
 * 阿里云手机重启选项
 */
export interface AliyunRebootOptions {
  /** 是否强制重启 */
  forceReboot?: boolean;
}

/**
 * 阿里云手机 ADB 配置
 */
export interface AliyunAdbConfig {
  /** 是否启用 ADB */
  enabled: boolean;

  /** 公钥内容 (SSH 格式) */
  publicKey?: string;
}

/**
 * 阿里云常用规格
 */
export const ALIYUN_PHONE_SPECS = {
  /** 2核4G (标准型) */
  STANDARD_2C4G: "ecp.ce.2c4g",

  /** 4核8G (高性能型) */
  PERFORMANCE_4C8G: "ecp.ce.4c8g",

  /** 8核16G (旗舰型) */
  FLAGSHIP_8C16G: "ecp.ce.8c16g",

  /** 2核4G (Android 10) */
  ANDROID10_2C4G: "ecp.ce.android10.2c4g",

  /** 4核8G (Android 11) */
  ANDROID11_4C8G: "ecp.ce.android11.4c8g",
} as const;

/**
 * 阿里云地域枚举
 */
export const ALIYUN_REGIONS = {
  /** 华东1 (杭州) */
  CN_HANGZHOU: "cn-hangzhou",

  /** 华北2 (北京) */
  CN_BEIJING: "cn-beijing",

  /** 华南1 (深圳) */
  CN_SHENZHEN: "cn-shenzhen",

  /** 新加坡 */
  AP_SOUTHEAST_1: "ap-southeast-1",

  /** 日本 (东京) */
  AP_NORTHEAST_1: "ap-northeast-1",

  /** 美国西部1 (硅谷) */
  US_WEST_1: "us-west-1",
} as const;
