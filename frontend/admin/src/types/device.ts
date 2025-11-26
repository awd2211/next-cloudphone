export enum DeviceProviderType {
  REDROID = 'REDROID',
  PHYSICAL = 'PHYSICAL',
  HUAWEI_CPH = 'HUAWEI_CPH',
  ALIYUN_ECP = 'ALIYUN_ECP',
  // Phase 5: 扩展云提供商
  TENCENT_GS = 'TENCENT_GS',
  BAIDU_BAC = 'BAIDU_BAC',
  AWS_DEVICE_FARM = 'AWS_DEVICE_FARM',
  GENYMOTION = 'GENYMOTION',
  BROWSERSTACK = 'BROWSERSTACK',
}

export enum DeviceStatus {
  CREATING = 'creating',
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error',
  DELETING = 'deleting',
}

export const ProviderDisplayNamesCN: Record<DeviceProviderType, string> = {
  [DeviceProviderType.REDROID]: 'Redroid 容器设备',
  [DeviceProviderType.PHYSICAL]: '物理 Android 设备',
  [DeviceProviderType.HUAWEI_CPH]: '华为云手机',
  [DeviceProviderType.ALIYUN_ECP]: '阿里云手机',
  [DeviceProviderType.TENCENT_GS]: '腾讯云云游戏',
  [DeviceProviderType.BAIDU_BAC]: '百度云手机',
  [DeviceProviderType.AWS_DEVICE_FARM]: 'AWS Device Farm',
  [DeviceProviderType.GENYMOTION]: 'Genymotion Cloud',
  [DeviceProviderType.BROWSERSTACK]: 'BrowserStack',
};

export const StatusDisplayNamesCN: Record<DeviceStatus, string> = {
  [DeviceStatus.CREATING]: '创建中',
  [DeviceStatus.RUNNING]: '运行中',
  [DeviceStatus.STOPPED]: '已停止',
  [DeviceStatus.ERROR]: '错误',
  [DeviceStatus.DELETING]: '删除中',
};

export interface Device {
  id: string;
  name: string;
  userId: string;
  providerType: DeviceProviderType;
  deviceType?: string;
  status: DeviceStatus;
  cpu?: number;
  memory?: number;
  gpuEnabled?: boolean;
  screenshotUrl?: string;
  adbPort?: number;
  containerId?: string;
  externalId?: string;
  providerInstanceId?: string; // 云手机实例ID (阿里云/华为)
  providerRegion?: string; // 云手机区域
  providerConfig?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceListResponse {
  items: Device[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateDeviceDto {
  name: string;
  providerType: DeviceProviderType;
  deviceType?: string;
  cpu?: number;
  memory?: number;
  gpuEnabled?: boolean;
  providerConfig?: Record<string, any>;
}

export interface UpdateDeviceDto {
  name?: string;
  status?: DeviceStatus;
}
