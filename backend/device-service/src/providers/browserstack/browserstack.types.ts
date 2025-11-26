/**
 * BrowserStack App Live 类型定义
 *
 * API 文档: https://www.browserstack.com/app-live/rest-api
 * App Automate: https://www.browserstack.com/docs/app-automate/api-reference
 */

/**
 * BrowserStack 凭证配置
 */
export interface BrowserStackCredentials {
  username: string;
  accessKey: string;
}

/**
 * 设备信息
 */
export interface BrowserStackDevice {
  /** 设备名称 */
  device: string;
  /** OS */
  os: 'Android' | 'iOS';
  /** OS 版本 */
  os_version: string;
  /** 实时可用性 */
  realMobile?: boolean;
}

/**
 * 上传的应用
 */
export interface BrowserStackApp {
  /** App URL (bs://xxx) */
  app_url: string;
  /** App ID */
  app_id?: string;
  /** App 名称 */
  app_name?: string;
  /** App 版本 */
  app_version?: string;
  /** 上传时间 */
  uploaded_at?: string;
  /** 过期时间 */
  expiry?: string;
  /** Custom ID */
  custom_id?: string;
  /** 分享者 */
  shareable_id?: string;
}

/**
 * App Live 会话
 */
export interface BrowserStackSession {
  /** 会话 ID */
  id: string;
  /** 状态 */
  status: BrowserStackSessionStatus;
  /** 设备名称 */
  device: string;
  /** OS 版本 */
  os_version: string;
  /** App URL */
  app_url?: string;
  /** 公共 URL */
  public_url?: string;
  /** 开始时间 */
  start_time?: string;
  /** 持续时间 (秒) */
  duration?: number;
  /** 项目名称 */
  project_name?: string;
  /** 构建名称 */
  build_name?: string;
}

/**
 * 会话状态
 */
export type BrowserStackSessionStatus =
  | 'running'
  | 'done'
  | 'failed'
  | 'timeout'
  | 'stopped';

/**
 * 上传 App 请求
 */
export interface UploadAppRequest {
  /** 文件 URL */
  url?: string;
  /** Custom ID (用于覆盖更新) */
  custom_id?: string;
}

/**
 * 启动会话请求
 */
export interface StartSessionRequest {
  /** 设备名称 */
  device: string;
  /** OS 版本 */
  os_version: string;
  /** App URL (bs://xxx) */
  app: string;
  /** 项目名称 */
  project?: string;
  /** 构建名称 */
  build?: string;
  /** 会话名称 */
  name?: string;
  /** 回调 URL */
  callback_url?: string;
  /** 设备方向 */
  deviceOrientation?: 'portrait' | 'landscape';
  /** 网络日志 */
  networkLogs?: boolean;
  /** 设备日志 */
  deviceLogs?: boolean;
}

/**
 * API 响应
 */
export interface BrowserStackApiResponse<T = any> {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * 常用设备
 */
export const BROWSERSTACK_DEVICES = {
  SAMSUNG_GALAXY_S23: 'Samsung Galaxy S23',
  SAMSUNG_GALAXY_S22: 'Samsung Galaxy S22',
  GOOGLE_PIXEL_7: 'Google Pixel 7',
  GOOGLE_PIXEL_6: 'Google Pixel 6',
  ONEPLUS_11: 'OnePlus 11',
  XIAOMI_13: 'Xiaomi 13',
} as const;

/**
 * 常用 OS 版本
 */
export const BROWSERSTACK_OS_VERSIONS = {
  ANDROID_13: '13.0',
  ANDROID_12: '12.0',
  ANDROID_11: '11.0',
  ANDROID_10: '10.0',
} as const;
