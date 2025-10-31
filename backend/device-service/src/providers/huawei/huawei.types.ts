/**
 * 华为云手机 CPH 类型定义
 *
 * Phase 3: 华为云手机集成
 *
 * 文档: https://support.huaweicloud.com/api-cph/cph_02_0001.html
 */

/**
 * 华为云手机规格
 */
export interface HuaweiPhoneSpec {
  /** 规格 ID */
  specId: string;

  /** 规格名称 */
  specName: string;

  /** CPU 核数 */
  cpuCores: number;

  /** 内存大小（MB） */
  memoryMB: number;

  /** 存储大小（GB） */
  storageGB: number;

  /** 分辨率 */
  resolution: string;

  /** DPI */
  dpi: number;
}

/**
 * 华为云手机实例状态
 */
export enum HuaweiPhoneStatus {
  /** 创建中 */
  CREATING = 'CREATING',

  /** 运行中 */
  RUNNING = 'RUNNING',

  /** 重启中 */
  REBOOTING = 'REBOOTING',

  /** 已停止 */
  STOPPED = 'STOPPED',

  /** 停止中 */
  STOPPING = 'STOPPING',

  /** 删除中 */
  DELETING = 'DELETING',

  /** 已删除 */
  DELETED = 'DELETED',

  /** 错误 */
  ERROR = 'ERROR',

  /** 冻结 */
  FROZEN = 'FROZEN',
}

/**
 * 华为云手机实例信息
 */
export interface HuaweiPhoneInstance {
  /** 实例 ID */
  instanceId: string;

  /** 实例名称 */
  instanceName: string;

  /** 规格 ID */
  specId: string;

  /** 状态 */
  status: HuaweiPhoneStatus;

  /** 服务器 ID */
  serverId: string;

  /** 创建时间 */
  createTime: string;

  /** 更新时间 */
  updateTime: string;

  /** 公网 IP */
  publicIp?: string;

  /** 内网 IP */
  privateIp?: string;

  /** 属性 */
  property?: {
    imei?: string;
    phoneNumber?: string;
    [key: string]: any;
  };
}

/**
 * 创建云手机请求
 */
export interface CreateHuaweiPhoneRequest {
  /** 云手机名称 */
  phoneName: string;

  /** 规格 ID */
  specId: string;

  /** 镜像 ID */
  imageId: string;

  /** 服务器 ID */
  serverId: string;

  /** 数量（默认 1） */
  count?: number;

  /** 属性配置 */
  property?: {
    imei?: string;
    phoneNumber?: string;
    [key: string]: any;
  };
}

/**
 * 华为云手机连接信息
 */
export interface HuaweiConnectionInfo {
  /** 实例 ID */
  instanceId: string;

  /** ADB 连接（如果启用） */
  adb?: {
    host: string;
    port: number;
    token: string;
  };

  /** WebRTC 连接信息 */
  webrtc?: {
    sessionId: string;
    ticket: string;
    signaling: string;
    stunServers: string[];
    turnServers: {
      urls: string;
      username: string;
      credential: string;
    }[];
  };
}

/**
 * 华为 CPH SDK 配置
 */
export interface HuaweiCphConfig {
  /** 项目 ID */
  projectId: string;

  /** Access Key ID */
  accessKeyId: string;

  /** Secret Access Key */
  secretAccessKey: string;

  /** 区域 */
  region: string;

  /** API 端点 */
  endpoint: string;

  /** 默认服务器 ID */
  defaultServerId?: string;

  /** 默认镜像 ID */
  defaultImageId?: string;
}

/**
 * 华为云手机操作结果
 */
export interface HuaweiOperationResult<T = any> {
  /** 是否成功 */
  success: boolean;

  /** 结果数据 */
  data?: T;

  /** 错误码 */
  errorCode?: string;

  /** 错误信息 */
  errorMessage?: string;

  /** 请求 ID */
  requestId?: string;
}
