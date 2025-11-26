/**
 * Genymotion Cloud (SaaS) 类型定义
 *
 * 文档: https://docs.genymotion.com/paas/
 */

/**
 * Genymotion 凭证配置
 */
export interface GenymotionCredentials {
  email: string;
  password: string;
  apiToken?: string;
}

/**
 * 实例信息
 */
export interface GenymotionInstance {
  /** UUID */
  uuid: string;
  /** 实例名称 */
  name: string;
  /** 状态 */
  state: GenymotionInstanceState;
  /** Android 版本 */
  android_version?: string;
  /** 设备配方 */
  recipe?: string;
  /** ADB 序列号 */
  adb_serial?: string;
  /** ADB 端口 */
  adb_port?: number;
  /** 创建时间 */
  created_at?: string;
  /** 启动时间 */
  started_at?: string;
  /** IP 地址 */
  ip_address?: string;
  /** 区域 */
  region?: string;
}

/**
 * 实例状态
 */
export type GenymotionInstanceState =
  | 'CREATING'
  | 'STARTING'
  | 'RUNNING'
  | 'STOPPING'
  | 'STOPPED'
  | 'DELETING'
  | 'DELETED'
  | 'ERROR';

/**
 * 设备配方 (Recipe)
 */
export interface GenymotionRecipe {
  /** UUID */
  uuid: string;
  /** 名称 */
  name: string;
  /** Android 版本 */
  android_version: string;
  /** API 等级 */
  api_level: number;
  /** 分辨率宽度 */
  width: number;
  /** 分辨率高度 */
  height: number;
  /** DPI */
  dpi: number;
  /** 描述 */
  description?: string;
}

/**
 * 创建实例参数
 */
export interface CreateInstanceRequest {
  /** 配方 UUID */
  recipe_uuid: string;
  /** 实例名称 */
  name?: string;
  /** 区域 */
  region?: string;
  /** 是否启用 ADB */
  adb_enabled?: boolean;
  /** ADB 公钥 (用于 SSH 隧道) */
  adb_key?: string;
}

/**
 * API 响应
 */
export interface GenymotionApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 常用 Android 版本配方
 */
export const GENYMOTION_RECIPES = {
  ANDROID_13: 'android-13-google-apis',
  ANDROID_12: 'android-12-google-apis',
  ANDROID_11: 'android-11-google-apis',
  ANDROID_10: 'android-10-google-apis',
  ANDROID_9: 'android-9-google-apis',
} as const;

/**
 * 支持的区域
 */
export const GENYMOTION_REGIONS = {
  US_WEST: 'us-west-2',
  EU_WEST: 'eu-west-1',
  AP_NORTHEAST: 'ap-northeast-1',
} as const;
