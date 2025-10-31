/**
 * 缓存键生成器
 * 统一管理所有缓存键的命名规则
 */
export class CacheKeys {
  private static readonly PREFIX = 'device-service';

  /**
   * 设备详情缓存键
   * @param deviceId 设备 ID
   */
  static device(deviceId: string): string {
    return `${this.PREFIX}:device:${deviceId}`;
  }

  /**
   * 用户设备列表缓存键
   * @param userId 用户 ID
   * @param status 设备状态（可选）
   * @param page 页码
   * @param limit 每页数量
   */
  static deviceList(userId: string, status?: string, page: number = 1, limit: number = 10): string {
    const statusPart = status || 'all';
    return `${this.PREFIX}:device:list:${userId}:${statusPart}:${page}:${limit}`;
  }

  /**
   * 租户设备列表缓存键
   * @param tenantId 租户 ID
   * @param status 设备状态（可选）
   * @param page 页码
   * @param limit 每页数量
   */
  static tenantDeviceList(
    tenantId: string,
    status?: string,
    page: number = 1,
    limit: number = 10
  ): string {
    const statusPart = status || 'all';
    return `${this.PREFIX}:device:list:tenant:${tenantId}:${statusPart}:${page}:${limit}`;
  }

  /**
   * 容器 ID 映射缓存键
   * @param containerId Docker 容器 ID
   */
  static deviceByContainer(containerId: string): string {
    return `${this.PREFIX}:device:container:${containerId}`;
  }

  /**
   * 用户设备统计缓存键
   * @param userId 用户 ID
   */
  static deviceStats(userId: string): string {
    return `${this.PREFIX}:device:stats:${userId}`;
  }

  /**
   * 模板详情缓存键
   * @param templateId 模板 ID
   */
  static template(templateId: string): string {
    return `${this.PREFIX}:template:${templateId}`;
  }

  /**
   * 快照详情缓存键
   * @param snapshotId 快照 ID
   */
  static snapshot(snapshotId: string): string {
    return `${this.PREFIX}:snapshot:${snapshotId}`;
  }

  /**
   * 获取用户相关的所有列表缓存键模式
   * @param userId 用户 ID
   */
  static userListPattern(userId: string): string {
    return `${this.PREFIX}:device:list:${userId}:*`;
  }

  /**
   * 获取租户相关的所有列表缓存键模式
   * @param tenantId 租户 ID
   */
  static tenantListPattern(tenantId: string): string {
    return `${this.PREFIX}:device:list:tenant:${tenantId}:*`;
  }

  /**
   * 获取所有设备列表缓存键模式
   */
  static allListsPattern(): string {
    return `${this.PREFIX}:device:list:*`;
  }
}

/**
 * 缓存 TTL 配置（秒）
 */
export const CacheTTL = {
  DEVICE: 300, // 设备详情: 5 分钟
  DEVICE_LIST: 60, // 设备列表: 1 分钟
  CONTAINER_MAP: 120, // 容器映射: 2 分钟
  DEVICE_STATS: 180, // 设备统计: 3 分钟
  TEMPLATE: 600, // 模板: 10 分钟
  SNAPSHOT: 300, // 快照: 5 分钟
} as const;
