/**
 * App Service 缓存键管理
 *
 * 统一管理所有缓存键的命名规范，确保:
 * 1. 命名一致性: app-service:entity:identifier
 * 2. 易于调试: 清晰的键名结构
 * 3. 高效失效: 模式匹配删除相关缓存
 */

export class CacheKeys {
  private static readonly PREFIX = 'app-service';

  /**
   * ==================== 应用相关缓存键 ====================
   */

  /**
   * 应用详情缓存
   * 格式: app-service:app:{appId}
   *
   * 使用场景: findOne() 方法
   * 失效时机: 应用更新、删除、状态变更
   */
  static app(appId: string): string {
    return `${this.PREFIX}:app:${appId}`;
  }

  /**
   * 应用详情缓存模式 (用于批量删除)
   */
  static appPattern(appId: string): string {
    return `${this.PREFIX}:app:${appId}*`;
  }

  /**
   * 应用列表缓存 (基于过滤条件)
   * 格式: app-service:apps:list:{tenantId}:{category}:{cursor}:{limit}
   *
   * 使用场景: findAllCursor() 方法
   * 失效时机: 新应用创建、应用删除
   */
  static appList(tenantId?: string, category?: string, cursor?: string, limit: number = 20): string {
    const tenant = tenantId || 'all';
    const cat = category || 'all';
    const c = cursor || 'null';
    return `${this.PREFIX}:apps:list:${tenant}:${cat}:${c}:${limit}`;
  }

  /**
   * 应用列表缓存模式 (用于失效所有列表)
   */
  static appListPattern(): string {
    return `${this.PREFIX}:apps:list:*`;
  }

  /**
   * 应用版本历史缓存
   * 格式: app-service:versions:{packageName}
   *
   * 使用场景: getAppVersions() 方法
   * 失效时机: 新版本上传、版本删除
   */
  static appVersions(packageName: string): string {
    return `${this.PREFIX}:versions:${packageName}`;
  }

  /**
   * 最新版本缓存
   * 格式: app-service:latest:{packageName}
   *
   * 使用场景: getLatestVersion() 方法
   * 失效时机: 新版本上传、isLatest 标记更新
   */
  static latestVersion(packageName: string): string {
    return `${this.PREFIX}:latest:${packageName}`;
  }

  /**
   * ==================== 设备应用关系缓存 ====================
   */

  /**
   * 设备已安装应用列表
   * 格式: app-service:device-apps:{deviceId}
   *
   * 使用场景: getDeviceApps() 方法
   * 失效时机: 应用安装、卸载
   */
  static deviceApps(deviceId: string): string {
    return `${this.PREFIX}:device-apps:${deviceId}`;
  }

  /**
   * 应用安装设备列表
   * 格式: app-service:app-devices:{appId}
   *
   * 使用场景: getAppDevices() 方法
   * 失效时机: 应用安装、卸载
   */
  static appDevices(appId: string): string {
    return `${this.PREFIX}:app-devices:${appId}`;
  }

  /**
   * ==================== 审核相关缓存 ====================
   */

  /**
   * 审核记录缓存
   * 格式: app-service:audit:{appId}
   *
   * 使用场景: 审核历史查询
   * 失效时机: 新审核记录创建
   */
  static auditRecords(appId: string): string {
    return `${this.PREFIX}:audit:${appId}`;
  }

  /**
   * ==================== 统计信息缓存 ====================
   */

  /**
   * 应用统计信息
   * 格式: app-service:stats:app:{appId}
   *
   * 使用场景: 应用详情页统计数据
   * 失效时机: 安装计数变化
   */
  static appStats(appId: string): string {
    return `${this.PREFIX}:stats:app:${appId}`;
  }

  /**
   * 全局统计信息
   * 格式: app-service:stats:global
   *
   * 使用场景: 仪表盘统计
   * 失效时机: 每小时刷新
   */
  static globalStats(): string {
    return `${this.PREFIX}:stats:global`;
  }
}

/**
 * 缓存过期时间 (TTL) 配置
 *
 * 策略:
 * - 频繁变化的数据: 30-60 秒
 * - 中等变化的数据: 5-10 分钟
 * - 稳定数据: 30 分钟 - 1 小时
 */
export const CacheTTL = {
  /**
   * 应用详情: 5 分钟
   * 原因: 应用信息相对稳定，但需要及时反映状态变化
   */
  APP_DETAIL: 300,

  /**
   * 应用列表: 2 分钟
   * 原因: 列表可能频繁变化 (新应用上传、删除)
   */
  APP_LIST: 120,

  /**
   * 版本历史: 10 分钟
   * 原因: 版本历史变化不频繁
   */
  APP_VERSIONS: 600,

  /**
   * 最新版本: 5 分钟
   * 原因: 需要及时反映最新版本信息
   */
  LATEST_VERSION: 300,

  /**
   * 设备应用列表: 1 分钟
   * 原因: 安装/卸载操作会频繁变化
   */
  DEVICE_APPS: 60,

  /**
   * 应用设备列表: 2 分钟
   * 原因: 安装/卸载操作会频繁变化
   */
  APP_DEVICES: 120,

  /**
   * 审核记录: 10 分钟
   * 原因: 审核历史稳定，不常变化
   */
  AUDIT_RECORDS: 600,

  /**
   * 应用统计: 5 分钟
   * 原因: 统计数据相对稳定
   */
  APP_STATS: 300,

  /**
   * 全局统计: 1 小时
   * 原因: 全局统计数据变化缓慢
   */
  GLOBAL_STATS: 3600,
};

/**
 * 缓存失效工具函数
 *
 * 提供批量失效相关缓存的便捷方法
 */
export class CacheInvalidation {
  /**
   * 应用更新时失效相关缓存
   */
  static onAppUpdate(appId: string, packageName: string): string[] {
    return [
      CacheKeys.app(appId),
      CacheKeys.appPattern(appId),
      CacheKeys.appVersions(packageName),
      CacheKeys.latestVersion(packageName),
      CacheKeys.appListPattern(),
      CacheKeys.appStats(appId),
    ];
  }

  /**
   * 应用删除时失效相关缓存
   */
  static onAppDelete(appId: string, packageName: string): string[] {
    return [
      CacheKeys.app(appId),
      CacheKeys.appVersions(packageName),
      CacheKeys.latestVersion(packageName),
      CacheKeys.appListPattern(),
      CacheKeys.appDevices(appId),
      CacheKeys.auditRecords(appId),
      CacheKeys.appStats(appId),
    ];
  }

  /**
   * 应用安装/卸载时失效相关缓存
   */
  static onAppInstallChange(appId: string, deviceId: string): string[] {
    return [
      CacheKeys.deviceApps(deviceId),
      CacheKeys.appDevices(appId),
      CacheKeys.appStats(appId),
    ];
  }

  /**
   * 审核状态变更时失效相关缓存
   */
  static onAuditStatusChange(appId: string): string[] {
    return [
      CacheKeys.app(appId),
      CacheKeys.auditRecords(appId),
      CacheKeys.appListPattern(),
    ];
  }
}
