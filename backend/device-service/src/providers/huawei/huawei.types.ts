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

/**
 * ADB 命令执行请求 (同步)
 *
 * API: POST /v1/{project_id}/cloud-phone/phones/commands
 */
export interface HuaweiAdbCommandRequest {
  /** 云手机 ID */
  phoneId: string;

  /** ADB Shell 命令 */
  command: string;

  /** 超时时间 (秒, 默认 60) */
  timeout?: number;
}

/**
 * ADB 命令执行响应
 */
export interface HuaweiAdbCommandResponse {
  /** 命令 ID (异步时返回) */
  commandId?: string;

  /** 命令输出 (同步时返回) */
  output?: string;

  /** 执行状态 */
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';

  /** 错误信息 */
  errorMessage?: string;
}

/**
 * APK 安装请求
 *
 * API: POST /v1/{project_id}/cloud-phone/phones/install
 */
export interface HuaweiInstallApkRequest {
  /** 云手机 ID 列表 */
  phoneIds: string[];

  /** OBS 桶名 */
  bucketName: string;

  /** OBS 对象路径 (支持单个 APK 或多个 APK) */
  objectPath: string;

  /** 安装命令 (可选，默认为 install) */
  command?: string;
}

/**
 * APK 卸载请求
 *
 * API: POST /v1/{project_id}/cloud-phone/phones/uninstall
 */
export interface HuaweiUninstallApkRequest {
  /** 云手机 ID 列表 */
  phoneIds: string[];

  /** 应用包名 */
  packageName: string;
}

/**
 * 文件推送请求
 *
 * API: POST /v1/{project_id}/cloud-phone/phones/push-file
 *
 * 注意：
 * - 只支持 tar 格式压缩包
 * - 文件大小限制 6GB
 * - 解压后放置在云手机的 /data/local/tmp 目录
 */
export interface HuaweiPushFileRequest {
  /** 云手机 ID 列表 */
  phoneIds: string[];

  /** OBS 桶名 */
  bucketName: string;

  /** OBS 对象路径 (tar 文件) */
  objectPath: string;

  /** 目标路径 (可选，默认 /data/local/tmp) */
  targetPath?: string;
}

/**
 * 数据导出请求
 *
 * API: POST /v1/{project_id}/cloud-phone/phones/export-data
 */
export interface HuaweiExportDataRequest {
  /** 云手机 ID */
  phoneId: string;

  /** 导出路径 (云手机上的路径) */
  sourcePath: string;

  /** OBS 桶名 */
  bucketName: string;

  /** OBS 对象路径前缀 */
  objectPath: string;
}

/**
 * 批量操作任务状态
 */
export interface HuaweiBatchJobStatus {
  /** 任务 ID */
  jobId: string;

  /** 任务状态 */
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';

  /** 成功数量 */
  successCount: number;

  /** 失败数量 */
  failedCount: number;

  /** 总数量 */
  totalCount: number;

  /** 详细结果 */
  results?: Array<{
    phoneId: string;
    success: boolean;
    errorMessage?: string;
  }>;
}

/**
 * 云手机列表查询请求
 *
 * API: GET /v1/{project_id}/cloud-phone/phones
 */
export interface HuaweiListPhonesRequest {
  /** 偏移量 (默认 0) */
  offset?: number;

  /** 每页数量 (默认 100, 最大 100) */
  limit?: number;

  /** 云手机名称 (模糊匹配) */
  phoneName?: string;

  /** 服务器 ID */
  serverId?: string;

  /** 云手机状态筛选 */
  status?: HuaweiPhoneStatus;
}

/**
 * 云手机列表查询响应
 */
export interface HuaweiListPhonesResponse {
  /** 总数量 */
  count: number;

  /** 云手机列表 */
  phones: HuaweiPhoneInstance[];
}
