/**
 * 百度智能云云手机 BAC (ARM Cloud Mobile) 类型定义
 *
 * API 文档: https://cloud.baidu.com/doc/ARMCM/s/2kei7tyr3
 */

/**
 * 百度云凭证配置
 */
export interface BaiduCredentials {
  accessKey: string;
  secretKey: string;
  region?: string;
}

/**
 * 云手机实例信息
 */
export interface BaiduCloudPhoneInstance {
  /** 实例 ID */
  instanceId: string;
  /** 实例名称 */
  instanceName?: string;
  /** 实例状态 */
  status: BaiduInstanceStatus;
  /** 规格 */
  spec?: string;
  /** 创建时间 */
  createTime?: string;
  /** 过期时间 */
  expireTime?: string;
  /** 可用区 */
  zone?: string;
  /** 镜像 ID */
  imageId?: string;
  /** 内网 IP */
  internalIp?: string;
  /** 公网 IP */
  publicIp?: string;
}

/**
 * 百度云实例状态
 */
export type BaiduInstanceStatus =
  | 'Creating'     // 创建中
  | 'Starting'     // 启动中
  | 'Running'      // 运行中
  | 'Stopping'     // 停止中
  | 'Stopped'      // 已停止
  | 'Restarting'   // 重启中
  | 'Releasing'    // 释放中
  | 'Released'     // 已释放
  | 'Error';       // 错误

/**
 * 创建实例参数
 */
export interface CreateInstanceRequest {
  /** 实例名称 */
  instanceName: string;
  /** 规格 */
  spec: string;
  /** 镜像 ID */
  imageId: string;
  /** 可用区 */
  zone?: string;
  /** 购买数量 */
  purchaseCount?: number;
  /** 计费方式 */
  billing?: {
    paymentTiming: 'Prepaid' | 'Postpaid';
    reservationLength?: number;
  };
}

/**
 * 获取连接 Token 请求
 */
export interface GetServerTokenRequest {
  /** 实例 ID */
  instanceId: string;
  /** 用户 ID */
  userId?: string;
}

/**
 * Server Token 响应
 */
export interface ServerTokenResponse {
  /** Server Token */
  serverToken: string;
  /** 连接 URL */
  connectUrl: string;
  /** 过期时间戳 */
  expireTime: number;
}

/**
 * 机房信息
 */
export interface DataCenterInfo {
  /** 机房总实例数 */
  totalCount: number;
  /** 可用实例数 */
  availableCount: number;
  /** 已绑定实例数 */
  boundCount: number;
}

/**
 * 百度云 API 响应
 */
export interface BaiduApiResponse<T = any> {
  success: boolean;
  result?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 百度云规格
 */
export const BAIDU_INSTANCE_SPECS = {
  /** 基础型 - 2核4G */
  BASIC_SMALL: 'bac.g1.small',
  /** 标准型 - 4核8G */
  BASIC_MEDIUM: 'bac.g1.medium',
  /** 高性能型 - 8核16G */
  BASIC_LARGE: 'bac.g1.large',
} as const;

/**
 * 百度云区域
 */
export const BAIDU_REGIONS = {
  BEIJING: 'bj',
  GUANGZHOU: 'gz',
  SUZHOU: 'su',
  SHANGHAI: 'sh',
} as const;
