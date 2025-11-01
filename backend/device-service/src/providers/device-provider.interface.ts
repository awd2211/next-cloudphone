/**
 * 设备提供商接口
 * 统一抽象不同设备源 (Redroid, 华为 CPH, 阿里云 ECP, 物理设备)
 */

import {
  DeviceProviderType,
  DeviceProviderStatus,
  ConnectionInfo,
  DeviceCapabilities,
  DeviceCreateConfig,
  ProviderDevice,
  TouchEvent,
  SwipeEvent,
  KeyEvent,
  TextInput,
  AppInstallOptions,
  FileTransferOptions,
  DeviceProperties,
  DeviceMetrics,
  DeviceSnapshot,
} from './provider.types';

/**
 * 设备提供商核心接口
 */
export interface IDeviceProvider {
  /**
   * 提供商类型
   */
  readonly providerType: DeviceProviderType;

  // ========================================
  // 生命周期管理
  // ========================================

  /**
   * 创建设备实例
   * @param config 设备创建配置
   * @returns 设备实例信息
   * @throws {ProviderError} 创建失败时抛出
   */
  create(config: DeviceCreateConfig): Promise<ProviderDevice>;

  /**
   * 启动设备
   * @param deviceId 设备 ID
   * @throws {ProviderError} 启动失败时抛出
   */
  start(deviceId: string): Promise<void>;

  /**
   * 停止设备
   * @param deviceId 设备 ID
   * @throws {ProviderError} 停止失败时抛出
   */
  stop(deviceId: string): Promise<void>;

  /**
   * 销毁设备
   * @param deviceId 设备 ID
   * @throws {ProviderError} 销毁失败时抛出
   */
  destroy(deviceId: string): Promise<void>;

  // ========================================
  // 状态查询
  // ========================================

  /**
   * 获取设备状态
   * @param deviceId 设备 ID
   * @returns 设备状态
   */
  getStatus(deviceId: string): Promise<DeviceProviderStatus>;

  /**
   * 获取连接信息 (供 Media Service 使用)
   * @param deviceId 设备 ID
   * @returns 连接信息
   */
  getConnectionInfo(deviceId: string): Promise<ConnectionInfo>;

  /**
   * 获取设备属性
   * @param deviceId 设备 ID
   * @returns 设备属性 (型号、Android 版本等)
   */
  getProperties?(deviceId: string): Promise<DeviceProperties>;

  /**
   * 获取设备监控指标
   * @param deviceId 设备 ID
   * @returns 监控指标 (CPU, 内存, FPS 等)
   */
  getMetrics?(deviceId: string): Promise<DeviceMetrics>;

  // ========================================
  // 能力描述
  // ========================================

  /**
   * 获取提供商能力
   * @returns 提供商支持的能力
   */
  getCapabilities(): DeviceCapabilities;

  // ========================================
  // 设备控制 (可选,根据能力实现)
  // ========================================

  /**
   * 发送触摸事件
   * @param deviceId 设备 ID
   * @param event 触摸事件
   */
  sendTouchEvent?(deviceId: string, event: TouchEvent): Promise<void>;

  /**
   * 发送滑动事件
   * @param deviceId 设备 ID
   * @param event 滑动事件
   */
  sendSwipeEvent?(deviceId: string, event: SwipeEvent): Promise<void>;

  /**
   * 发送按键事件
   * @param deviceId 设备 ID
   * @param event 按键事件
   */
  sendKeyEvent?(deviceId: string, event: KeyEvent): Promise<void>;

  /**
   * 输入文本
   * @param deviceId 设备 ID
   * @param input 文本输入
   */
  inputText?(deviceId: string, input: TextInput): Promise<void>;

  /**
   * 安装应用
   * @param deviceId 设备 ID
   * @param options 安装选项
   * @returns 安装任务 ID (如果是异步操作)
   */
  installApp?(deviceId: string, options: AppInstallOptions): Promise<string | void>;

  /**
   * 卸载应用
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  uninstallApp?(deviceId: string, packageName: string): Promise<void>;

  /**
   * 推送文件到设备
   * @param deviceId 设备 ID
   * @param options 文件传输选项
   */
  pushFile?(deviceId: string, options: FileTransferOptions): Promise<void>;

  /**
   * 从设备拉取文件
   * @param deviceId 设备 ID
   * @param options 文件传输选项
   */
  pullFile?(deviceId: string, options: FileTransferOptions): Promise<void>;

  // ========================================
  // 屏幕截图和录制 (可选)
  // ========================================

  /**
   * 截屏
   * @param deviceId 设备 ID
   * @returns 截图数据 (PNG/JPEG)
   */
  takeScreenshot?(deviceId: string): Promise<Buffer>;

  /**
   * 开始录屏
   * @param deviceId 设备 ID
   * @param duration 录制时长 (秒)
   * @returns 录屏任务 ID
   */
  startRecording?(deviceId: string, duration?: number): Promise<string>;

  /**
   * 停止录屏
   * @param deviceId 设备 ID
   * @param recordingId 录屏任务 ID
   * @returns 录屏文件数据
   */
  stopRecording?(deviceId: string, recordingId: string): Promise<Buffer>;

  // ========================================
  // 传感器模拟 (可选)
  // ========================================

  /**
   * 设置 GPS 位置
   * @param deviceId 设备 ID
   * @param latitude 纬度
   * @param longitude 经度
   */
  setLocation?(deviceId: string, latitude: number, longitude: number): Promise<void>;

  /**
   * 设置网络状态
   * @param deviceId 设备 ID
   * @param networkType 网络类型 (wifi, 4g, 5g, airplane)
   */
  setNetworkType?(deviceId: string, networkType: string): Promise<void>;

  /**
   * 设置电池状态
   * @param deviceId 设备 ID
   * @param level 电量百分比
   * @param charging 是否充电
   */
  setBatteryStatus?(deviceId: string, level: number, charging: boolean): Promise<void>;

  // ========================================
  // 应用操作 (阿里云 ECP 专属)
  // ========================================

  /**
   * 启动应用
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  startApp?(deviceId: string, packageName: string): Promise<void>;

  /**
   * 停止应用
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  stopApp?(deviceId: string, packageName: string): Promise<void>;

  /**
   * 清除应用数据
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  clearAppData?(deviceId: string, packageName: string): Promise<void>;

  // ========================================
  // 快照管理 (阿里云 ECP 专属)
  // ========================================

  /**
   * 创建设备快照
   * @param deviceId 设备 ID
   * @param name 快照名称
   * @param description 快照描述
   * @returns 快照 ID
   */
  createSnapshot?(deviceId: string, name: string, description?: string): Promise<string>;

  /**
   * 恢复设备快照
   * @param deviceId 设备 ID
   * @param snapshotId 快照 ID
   */
  restoreSnapshot?(deviceId: string, snapshotId: string): Promise<void>;

  /**
   * 获取设备快照列表
   * @param deviceId 设备 ID
   * @returns 快照列表
   */
  listSnapshots?(deviceId: string): Promise<DeviceSnapshot[]>;

  /**
   * 删除设备快照
   * @param deviceId 设备 ID
   * @param snapshotId 快照 ID
   */
  deleteSnapshot?(deviceId: string, snapshotId: string): Promise<void>;
}

/**
 * 设备提供商工厂接口
 */
export interface IDeviceProviderFactory {
  /**
   * 根据类型获取提供商实例
   * @param type 提供商类型
   * @returns 提供商实例
   * @throws {Error} 提供商不存在或未启用
   */
  getProvider(type: DeviceProviderType): IDeviceProvider;

  /**
   * 注册提供商
   * @param provider 提供商实例
   */
  registerProvider(provider: IDeviceProvider): void;

  /**
   * 获取所有可用的提供商
   * @returns 提供商列表
   */
  getAllProviders(): IDeviceProvider[];

  /**
   * 检查提供商是否可用
   * @param type 提供商类型
   * @returns 是否可用
   */
  isProviderAvailable(type: DeviceProviderType): boolean;
}
