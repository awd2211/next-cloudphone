/**
 * 腾讯云云游戏 GS (Game Streaming) 类型定义
 *
 * API 文档: https://cloud.tencent.com/document/product/1162/40727
 */

/**
 * 腾讯云凭证配置
 */
export interface TencentCredentials {
  secretId: string;
  secretKey: string;
  region?: string;
}

/**
 * 安卓实例信息
 */
export interface TencentAndroidInstance {
  /** 实例 ID */
  AndroidInstanceId: string;
  /** 实例名称 */
  AndroidInstanceName?: string;
  /** 实例状态 */
  State: TencentInstanceState;
  /** 实例区域 */
  Zone?: string;
  /** 创建时间 */
  CreateTime?: string;
  /** 镜像 ID */
  ImageId?: string;
  /** 规格 */
  InstanceType?: string;
  /** 分辨率 */
  Resolution?: string;
  /** DPI */
  Fps?: number;
  /** 宿主机 ID */
  HostSerialNumber?: string;
  /** 用户 ID */
  UserId?: string;
}

/**
 * 腾讯云实例状态
 */
export type TencentInstanceState =
  | 'PENDING'          // 创建中
  | 'LAUNCH_FAILED'    // 创建失败
  | 'RUNNING'          // 运行中
  | 'STOPPED'          // 已关机
  | 'STARTING'         // 开机中
  | 'STOPPING'         // 关机中
  | 'REBOOTING'        // 重启中
  | 'REINSTALLING'     // 重装中
  | 'SHUTDOWN'         // 待释放
  | 'EXPIRED'          // 已过期
  | 'TERMINATING';     // 释放中

/**
 * 创建实例参数
 */
export interface CreateAndroidInstanceRequest {
  /** 实例名称 */
  AndroidInstanceName: string;
  /** 镜像 ID */
  ImageId: string;
  /** 实例规格 */
  InstanceType?: string;
  /** 可用区 */
  Zone?: string;
  /** 实例数量 */
  InstanceCount?: number;
  /** 分辨率 (如 "1920x1080") */
  Resolution?: string;
  /** FPS */
  Fps?: number;
}

/**
 * 创建会话参数
 */
export interface CreateSessionRequest {
  /** 用户 ID */
  UserId: string;
  /** 实例 ID */
  AndroidInstanceId: string;
  /** 客户端会话信息 */
  ClientSession?: string;
  /** Host 类型 */
  HostType?: string;
}

/**
 * 创建会话响应
 */
export interface CreateSessionResponse {
  /** 会话 ID */
  SessionId: string;
  /** Server Session */
  ServerSession?: string;
  /** 请求 ID */
  RequestId: string;
}

/**
 * 连接安卓实例参数
 */
export interface ConnectAndroidInstanceRequest {
  /** 实例 ID */
  AndroidInstanceId: string;
  /** 用户信息 */
  UserId?: string;
}

/**
 * 连接安卓实例响应
 */
export interface ConnectAndroidInstanceResponse {
  /** 连接信息 */
  ConnectInfo?: {
    /** WebSocket URL */
    WebSocketUrl?: string;
    /** Token */
    Token?: string;
  };
  /** 请求 ID */
  RequestId: string;
}

/**
 * 安装应用参数
 */
export interface InstallAndroidInstancesAppRequest {
  /** 实例 ID 列表 */
  AndroidInstanceIds: string[];
  /** 应用 ID */
  ApplicationId: string;
}

/**
 * WebShell 连接信息
 */
export interface CreateAndroidInstanceWebShellResponse {
  /** 连接 URL */
  ConnectUrl: string;
  /** 请求 ID */
  RequestId: string;
}

/**
 * 安卓实例镜像
 */
export interface AndroidInstanceImage {
  /** 镜像 ID */
  ImageId: string;
  /** 镜像名称 */
  ImageName: string;
  /** Android 版本 */
  AndroidVersion?: string;
  /** 镜像描述 */
  Description?: string;
  /** 镜像状态 */
  State?: string;
}

/**
 * 腾讯云 API 通用响应
 */
export interface TencentApiResponse<T = any> {
  Response: T & {
    RequestId: string;
    Error?: {
      Code: string;
      Message: string;
    };
  };
}

/**
 * 腾讯云规格
 */
export const TENCENT_INSTANCE_SPECS = {
  /** 基础型 - 2核4G */
  BASIC_S1: 'GI2.BASIC.S1',
  /** 标准型 - 4核8G */
  BASIC_M1: 'GI2.BASIC.M1',
  /** 高性能型 - 8核16G */
  BASIC_L1: 'GI2.BASIC.L1',
} as const;

/**
 * 腾讯云区域
 */
export const TENCENT_REGIONS = {
  GUANGZHOU: 'ap-guangzhou',
  SHANGHAI: 'ap-shanghai',
  BEIJING: 'ap-beijing',
  CHENGDU: 'ap-chengdu',
  CHONGQING: 'ap-chongqing',
  NANJING: 'ap-nanjing',
} as const;
