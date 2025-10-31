/**
 * 设备提供商类型和相关接口定义
 *
 * 此模块定义了所有设备提供商的公共类型，供所有微服务使用
 */

/**
 * 设备提供商类型枚举
 *
 * 与 device-service 的 Provider 实现保持同步
 */
export enum DeviceProviderType {
  /** Redroid - Docker 容器化 Android */
  REDROID = 'redroid',

  /** Physical - 物理 Android 设备 */
  PHYSICAL = 'physical',

  /** Huawei CPH - 华为云手机 */
  HUAWEI_CPH = 'huawei_cph',

  /** Aliyun ECP - 阿里云手机 */
  ALIYUN_ECP = 'aliyun_ecp',
}

/**
 * 设备类型
 */
export enum DeviceType {
  /** 手机 */
  PHONE = 'phone',

  /** 平板 */
  TABLET = 'tablet',
}

/**
 * 设备配置快照
 *
 * 用于事件传递、计费计算等场景
 * 记录设备创建时的配置信息
 */
export interface DeviceConfigSnapshot {
  /** CPU 核心数 */
  cpuCores: number;

  /** 内存大小（MB） */
  memoryMB: number;

  /** 存储空间（GB，可选） */
  storageGB?: number;

  /** 是否启用 GPU */
  gpuEnabled?: boolean;

  /** 设备型号（物理设备特有） */
  model?: string;

  /** Android 版本 */
  androidVersion?: string;

  /** 屏幕分辨率 */
  resolution?: string;

  /** DPI 密度 */
  dpi?: number;

  /** 云手机特定配置 */
  cloudConfig?: {
    /** 云厂商规格 ID */
    specId?: string;

    /** 区域 */
    region?: string;

    /** 可用区 */
    zone?: string;

    /** 镜像 ID */
    imageId?: string;
  };
}

/**
 * Provider 显示名称映射
 *
 * 用于 UI 展示和通知消息
 */
export const ProviderDisplayNames: Record<DeviceProviderType, string> = {
  [DeviceProviderType.REDROID]: 'Redroid 容器',
  [DeviceProviderType.PHYSICAL]: '物理设备',
  [DeviceProviderType.HUAWEI_CPH]: '华为云手机',
  [DeviceProviderType.ALIYUN_ECP]: '阿里云手机',
};

/**
 * Provider 显示名称映射（中文）
 */
export const ProviderDisplayNamesCN: Record<DeviceProviderType, string> = {
  [DeviceProviderType.REDROID]: 'Redroid 容器设备',
  [DeviceProviderType.PHYSICAL]: '物理 Android 设备',
  [DeviceProviderType.HUAWEI_CPH]: '华为云手机',
  [DeviceProviderType.ALIYUN_ECP]: '阿里云手机 (ECP)',
};

/**
 * Provider 显示名称映射（英文）
 */
export const ProviderDisplayNamesEN: Record<DeviceProviderType, string> = {
  [DeviceProviderType.REDROID]: 'Redroid Container',
  [DeviceProviderType.PHYSICAL]: 'Physical Device',
  [DeviceProviderType.HUAWEI_CPH]: 'Huawei Cloud Phone',
  [DeviceProviderType.ALIYUN_ECP]: 'Aliyun Elastic Cloud Phone',
};

/**
 * Provider 分类
 */
export enum ProviderCategory {
  /** 本地部署（自有基础设施） */
  ON_PREMISE = 'on_premise',

  /** 云服务（第三方云厂商） */
  CLOUD = 'cloud',
}

/**
 * Provider 分类映射
 */
export const ProviderCategoryMap: Record<DeviceProviderType, ProviderCategory> = {
  [DeviceProviderType.REDROID]: ProviderCategory.ON_PREMISE,
  [DeviceProviderType.PHYSICAL]: ProviderCategory.ON_PREMISE,
  [DeviceProviderType.HUAWEI_CPH]: ProviderCategory.CLOUD,
  [DeviceProviderType.ALIYUN_ECP]: ProviderCategory.CLOUD,
};

/**
 * 获取 Provider 显示名称
 *
 * @param providerType Provider 类型
 * @param language 语言（默认中文）
 * @returns 显示名称
 */
export function getProviderDisplayName(
  providerType: DeviceProviderType,
  language: 'zh-CN' | 'en-US' = 'zh-CN'
): string {
  if (language === 'en-US') {
    return ProviderDisplayNamesEN[providerType] || providerType;
  }
  return ProviderDisplayNamesCN[providerType] || providerType;
}

/**
 * 获取 Provider 分类
 *
 * @param providerType Provider 类型
 * @returns 分类
 */
export function getProviderCategory(providerType: DeviceProviderType): ProviderCategory {
  return ProviderCategoryMap[providerType] || ProviderCategory.ON_PREMISE;
}

/**
 * 判断是否为云服务 Provider
 *
 * @param providerType Provider 类型
 * @returns 是否为云服务
 */
export function isCloudProvider(providerType: DeviceProviderType): boolean {
  return getProviderCategory(providerType) === ProviderCategory.CLOUD;
}

/**
 * 判断是否为本地 Provider
 *
 * @param providerType Provider 类型
 * @returns 是否为本地部署
 */
export function isOnPremiseProvider(providerType: DeviceProviderType): boolean {
  return getProviderCategory(providerType) === ProviderCategory.ON_PREMISE;
}
