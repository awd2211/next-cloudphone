/**
 * 设备提供商类型定义
 * 支持多种设备源的统一抽象: Redroid, 华为 CPH, 阿里云 ECP, 物理设备
 */

/**
 * 设备提供商类型枚举
 */
export enum DeviceProviderType {
  /** Redroid (Docker 容器化 Android) - 当前已有 */
  REDROID = "redroid",

  /** 华为云手机 CPH */
  HUAWEI_CPH = "huawei_cph",

  /** 阿里云国际云手机 ECP */
  ALIYUN_ECP = "aliyun_ecp",

  /** 物理设备 (网络 ADB + SCRCPY) */
  PHYSICAL = "physical",
}

/**
 * 设备状态
 */
export enum DeviceProviderStatus {
  /** 创建中 */
  CREATING = "creating",

  /** 运行中 */
  RUNNING = "running",

  /** 已停止 */
  STOPPED = "stopped",

  /** 错误 */
  ERROR = "error",

  /** 销毁中 */
  DESTROYING = "destroying",

  /** 已销毁 */
  DESTROYED = "destroyed",

  /** 离线 (物理设备) */
  OFFLINE = "offline",

  /** 可用 (设备池) */
  AVAILABLE = "available",

  /** 已分配 (设备池) */
  ALLOCATED = "allocated",
}

/**
 * 统一连接信息
 * 不同提供商使用不同的连接方式
 */
export interface ConnectionInfo {
  /** 提供商类型 */
  providerType: DeviceProviderType;

  /** ADB 连接信息 (适用于 Redroid, Physical, 部分云手机) */
  adb?: {
    /** ADB 主机地址 */
    host: string;
    /** ADB 端口 */
    port: number;
    /** ADB 序列号 */
    serial: string;
  };

  /** 华为云手机连接信息 */
  huaweiCph?: {
    /** 实例 ID */
    instanceId: string;
    /** 投屏地址 */
    accessIp: string;
    /** 投屏端口 */
    accessPort: number;
    /** 会话 ID */
    sessionId?: string;
    /** 访问票据 */
    ticket?: string;
    /** ADB 端点 (如果支持) */
    adbEndpoint?: string;
  };

  /** 阿里云手机连接信息 */
  aliyunEcp?: {
    /** 实例 ID */
    instanceId: string;
    /** WebRTC Token (30秒有效) */
    webrtcToken: string;
    /** WebRTC 连接 URL */
    webrtcUrl: string;
    /** Token 过期时间 */
    tokenExpiresAt: Date;
    /** ADB 公钥 (用于 ADB 连接) */
    adbPublicKey?: string;
  };

  /** SCRCPY 连接 (高性能投屏,适用于物理设备) */
  scrcpy?: {
    host: string;
    port: number;
    maxBitrate: number;
    codec: "h264" | "h265";
  };

  /** VNC 连接 (某些云手机可能支持) */
  vnc?: {
    host: string;
    port: number;
    password?: string;
  };

  /** 自定义连接参数 */
  custom?: Record<string, any>;
}

/**
 * 设备能力描述
 * 不同提供商支持不同的能力
 */
export interface DeviceCapabilities {
  /** 支持 ADB */
  supportsAdb: boolean;

  /** 支持屏幕采集 */
  supportsScreenCapture: boolean;

  /** 支持音频采集 */
  supportsAudioCapture?: boolean;

  /** 支持的采集格式 */
  supportedCaptureFormats: CaptureFormat[];

  /** 最大分辨率 */
  maxResolution: {
    width: number;
    height: number;
  };

  /** 支持触摸控制 */
  supportsTouchControl: boolean;

  /** 支持键盘输入 */
  supportsKeyboardInput?: boolean;

  /** 支持文件传输 */
  supportsFileTransfer: boolean;

  /** 支持应用安装 */
  supportsAppInstall: boolean;

  /** 支持截图 */
  supportsScreenshot?: boolean;

  /** 支持屏幕录制 */
  supportsRecording?: boolean;

  /** 支持地理位置模拟 */
  supportsLocationMocking?: boolean;

  /** 支持网络模拟 */
  supportsNetworkSimulation?: boolean;

  /** 支持旋转 */
  supportsRotation?: boolean;

  /** 支持传感器模拟 (GPS, 陀螺仪等) */
  supportsSensorSimulation?: boolean;

  /** 支持摄像头 */
  supportsCamera?: boolean;

  /** 支持麦克风 */
  supportsMicrophone?: boolean;

  /** 支持电池模拟 */
  supportsBatterySimulation?: boolean;

  /** 扩展能力 */
  customCapabilities?: Record<string, boolean>;
}

/**
 * 采集格式
 */
export enum CaptureFormat {
  /** PNG 截图 (via ADB screencap) */
  SCREENCAP = "screencap",

  /** H.264 视频流 (via ADB screenrecord) */
  SCREENRECORD = "screenrecord",

  /** SCRCPY 协议 (高性能) */
  SCRCPY = "scrcpy",

  /** WebRTC 流 */
  WEBRTC = "webrtc",

  /** RTMP 流 */
  RTMP = "rtmp",

  /** HLS 流 */
  HLS = "hls",

  /** VNC 协议 */
  VNC = "vnc",

  /** 原始视频流 */
  RAW_VIDEO = "raw_video",
}

/**
 * 设备创建配置
 */
export interface DeviceCreateConfig {
  /** 设备名称 */
  name: string;

  /** 用户 ID */
  userId: string;

  /** CPU 核心数 */
  cpuCores: number;

  /** 内存 (MB) */
  memoryMB: number;

  /** 存储 (MB) */
  storageMB?: number;

  /** 分辨率 (字符串格式如 "1920x1080" 或对象格式) */
  resolution: string | { width: number; height: number };

  /** DPI */
  dpi?: number;

  /** Android 版本 */
  androidVersion?: string;

  /** 设备类型 (手机/平板) */
  deviceType?: "phone" | "tablet";

  /** ADB 端口 (Redroid 使用) */
  adbPort?: number;

  /** 启用 GPU (Redroid 使用) */
  enableGpu?: boolean;

  /** 启用音频 (Redroid 使用) */
  enableAudio?: boolean;

  /** 提供商特定配置 */
  providerSpecificConfig?: Record<string, any>;
}

/**
 * 设备实例信息 (提供商返回)
 */
export interface ProviderDevice {
  /** 设备 ID (提供商内部 ID，如 Docker container ID) */
  id: string;

  /** 设备名称 */
  name: string;

  /** 设备状态 */
  status: DeviceProviderStatus;

  /** 连接信息 */
  connectionInfo: ConnectionInfo;

  /** 设备属性 (可选) */
  properties?: DeviceProperties;

  /** 创建时间 */
  createdAt: Date;

  /** 提供商特定配置 (存储到 DB) */
  providerConfig?: Record<string, any>;
}

/**
 * 设备控制操作
 */
export interface DeviceControlOperation {
  /** 操作类型 */
  type: "touch" | "swipe" | "keyevent" | "text" | "back" | "home" | "power";

  /** 操作参数 */
  params: Record<string, any>;
}

/**
 * 触摸事件
 */
export interface TouchEvent {
  /** 触摸类型 */
  action: "down" | "move" | "up";

  /** X 坐标 */
  x: number;

  /** Y 坐标 */
  y: number;

  /** 触摸 ID (多点触控) */
  pointerId?: number;

  /** 时间戳 */
  timestamp?: number;
}

/**
 * 滑动事件
 */
export interface SwipeEvent {
  /** 起始点 */
  startX: number;
  startY: number;

  /** 结束点 */
  endX: number;
  endY: number;

  /** 持续时间 (毫秒，可选，默认 300ms) */
  durationMs?: number;
}

/**
 * 按键事件
 */
export interface KeyEvent {
  /** 按键码 (Android keycode) */
  keyCode: number;

  /** 按键名称 */
  keyName?: string;

  /** 元键 (shift, ctrl, alt) */
  metaState?: number;
}

/**
 * 文本输入
 */
export interface TextInput {
  /** 输入文本 */
  text: string;
}

/**
 * 应用安装选项
 */
export interface AppInstallOptions {
  /** APK 文件路径或 URL */
  apkPath: string;

  /** 包名 */
  packageName?: string;

  /** 重新安装 (覆盖已有应用) */
  reinstall?: boolean;

  /** 允许降级 */
  allowDowngrade?: boolean;

  /** 授予所有权限 */
  grantAllPermissions?: boolean;
}

/**
 * 文件传输选项
 */
export interface FileTransferOptions {
  /** 本地路径 (push 时为源，pull 时为目标) */
  localPath: string;

  /** 远程路径 (设备上的路径) */
  remotePath: string;

  /** 覆盖已存在的文件 */
  overwrite?: boolean;
}

/**
 * 设备属性
 */
export interface DeviceProperties {
  /** 型号 */
  model?: string;

  /** 制造商 */
  manufacturer?: string;

  /** Android 版本 */
  androidVersion?: string;

  /** SDK 版本 */
  sdkVersion?: number;

  /** 序列号 */
  serialNumber?: string;

  /** IMEI */
  imei?: string;

  /** 设备指纹 */
  fingerprint?: string;

  /** CPU 架构 */
  cpuAbi?: string;

  /** 屏幕密度 */
  density?: number;

  /** CPU 核心数 */
  cpuCores?: number;

  /** 内存 (MB) */
  memoryMB?: number;

  /** 存储 (MB) */
  storageMB?: number;

  /** 分辨率 */
  resolution?: string;

  /** DPI */
  dpi?: number;

  /** 其他属性 */
  custom?: Record<string, string>;
}

/**
 * 设备监控指标
 */
export interface DeviceMetrics {
  /** CPU 使用率 (百分比) */
  cpuUsage?: number;

  /** 内存使用 (MB) */
  memoryUsed?: number;

  /** 内存使用率 (百分比，兼容字段) */
  memoryUsage?: number;

  /** 存储使用 (MB) */
  storageUsed?: number;

  /** 存储使用率 (百分比，兼容字段) */
  storageUsage?: number;

  /** 网络接收字节数 */
  networkRx?: number;

  /** 网络发送字节数 */
  networkTx?: number;

  /** 网络流量 (KB) */
  networkTraffic?: {
    received: number;
    sent: number;
  };

  /** 电池电量 (百分比,物理设备) */
  batteryLevel?: number;

  /** 温度 (摄氏度,物理设备) */
  temperature?: number;

  /** FPS (投屏性能) */
  fps?: number;

  /** 延迟 (毫秒) */
  latency?: number;

  /** 时间戳 */
  timestamp: Date;
}

/**
 * 提供商错误
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerType: DeviceProviderType,
    public readonly code: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/**
 * 提供商配置
 */
export interface ProviderConfig {
  /** 是否启用 */
  enabled: boolean;

  /** 优先级 (数字越小优先级越高) */
  priority: number;

  /** 最大设备数 */
  maxDevices?: number;

  /** 提供商特定配置 */
  config: Record<string, any>;
}
