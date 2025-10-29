/**
 * SCRCPY 类型定义
 *
 * SCRCPY 是一款高性能的 Android 屏幕镜像工具
 * - 支持 H.264/H.265 视频编码
 * - 延迟 35-70ms
 * - 支持触控输入
 * - 跨平台支持
 */

/**
 * SCRCPY 视频编码器
 */
export enum ScrcpyVideoCodec {
  H264 = "h264",
  H265 = "h265",
  AV1 = "av1",
}

/**
 * SCRCPY 音频编码器
 */
export enum ScrcpyAudioCodec {
  OPUS = "opus",
  AAC = "aac",
  RAW = "raw",
}

/**
 * SCRCPY 配置
 */
export interface ScrcpyConfig {
  /** 设备序列号 (IP:PORT) */
  serial: string;

  /** 视频比特率（bps），默认 8Mbps */
  videoBitRate?: number;

  /** 视频编码器 */
  videoCodec?: ScrcpyVideoCodec;

  /** 最大视频尺寸（短边），默认 0（原始尺寸） */
  maxSize?: number;

  /** 最大帧率，默认 0（不限制） */
  maxFps?: number;

  /** 音频比特率（bps），默认 128kbps */
  audioBitRate?: number;

  /** 音频编码器 */
  audioCodec?: ScrcpyAudioCodec;

  /** 是否禁用音频，默认 false */
  noAudio?: boolean;

  /** 是否禁用视频，默认 false */
  noVideo?: boolean;

  /** 显示触摸点，默认 false */
  showTouches?: boolean;

  /** 保持唤醒，默认 false */
  stayAwake?: boolean;

  /** 关闭设备屏幕，默认 false */
  turnScreenOff?: boolean;

  /** SCRCPY 服务器端口，默认 27183 */
  port?: number;

  /** 隧道主机（ADB 转发） */
  tunnelHost?: string;

  /** 隧道端口 */
  tunnelPort?: number;
}

/**
 * SCRCPY 会话信息
 */
export interface ScrcpySession {
  /** 会话 ID */
  sessionId: string;

  /** 设备 ID */
  deviceId: string;

  /** 设备序列号 */
  serial: string;

  /** 视频流 URL (WebSocket) */
  videoUrl: string;

  /** 音频流 URL (WebSocket) */
  audioUrl?: string;

  /** 控制通道 URL (WebSocket) */
  controlUrl: string;

  /** 会话配置 */
  config: ScrcpyConfig;

  /** 创建时间 */
  createdAt: Date;

  /** 最后活跃时间 */
  lastActiveAt: Date;

  /** 进程 ID */
  processId?: number;
}

/**
 * SCRCPY 进程状态
 */
export enum ScrcpyProcessStatus {
  STARTING = "starting",
  RUNNING = "running",
  STOPPED = "stopped",
  ERROR = "error",
}

/**
 * SCRCPY 进程信息
 */
export interface ScrcpyProcessInfo {
  /** 设备 ID */
  deviceId: string;

  /** 进程 ID */
  pid: number;

  /** 进程状态 */
  status: ScrcpyProcessStatus;

  /** 启动时间 */
  startedAt: Date;

  /** 端口 */
  port: number;

  /** 错误信息 */
  error?: string;
}

/**
 * SCRCPY 事件类型
 */
export enum ScrcpyEventType {
  TOUCH_DOWN = "touch_down",
  TOUCH_UP = "touch_up",
  TOUCH_MOVE = "touch_move",
  KEY_DOWN = "key_down",
  KEY_UP = "key_up",
  SCROLL = "scroll",
  BACK = "back",
  HOME = "home",
  APP_SWITCH = "app_switch",
}

/**
 * SCRCPY 触控事件
 */
export interface ScrcpyTouchEvent {
  type: ScrcpyEventType;
  x: number;
  y: number;
  pressure?: number;
  pointerId?: number;
}

/**
 * SCRCPY 按键事件
 */
export interface ScrcpyKeyEvent {
  type: ScrcpyEventType;
  keyCode: number;
  metaState?: number;
}

/**
 * SCRCPY 滚动事件
 */
export interface ScrcpyScrollEvent {
  type: ScrcpyEventType.SCROLL;
  x: number;
  y: number;
  hScroll: number;
  vScroll: number;
}

/**
 * SCRCPY 统计信息
 */
export interface ScrcpyStats {
  /** 设备 ID */
  deviceId: string;

  /** 会话 ID */
  sessionId: string;

  /** 视频帧数 */
  videoFrames: number;

  /** 音频帧数 */
  audioFrames: number;

  /** 丢帧数 */
  droppedFrames: number;

  /** 平均延迟（毫秒） */
  averageLatency: number;

  /** 视频比特率（实际） */
  videoBitRate: number;

  /** 音频比特率（实际） */
  audioBitRate: number;

  /** 统计时间 */
  timestamp: Date;
}
