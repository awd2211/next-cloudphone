# 云手机代理集成 Phase 2 - 代理健康管理实施计划

**日期**: 2025-11-02
**状态**: 🚧 实施中
**基于**: Phase 1 (Commit: fe4a1f3)

---

## 📋 Phase 2 目标

为云手机代理系统添加运维管理功能，确保代理长期稳定运行。

### 核心功能

1. **代理健康检查** - 定期检测代理可用性，自动标记不健康代理
2. **使用统计追踪** - 记录代理分配历史、性能指标、使用时长
3. **孤儿代理清理** - 自动发现并释放未关联设备的代理资源

---

## 🏗️ 架构设计

### 数据层

**新增表**: `proxy_usage`

```sql
CREATE TABLE proxy_usage (
    id UUID PRIMARY KEY,
    device_id UUID NOT NULL,
    proxy_id VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP NOT NULL,
    released_at TIMESTAMP,
    duration_minutes INTEGER,
    success_rate DECIMAL(5,2),
    avg_latency_ms INTEGER,
    health_status VARCHAR(50),
    health_checks_passed INTEGER,
    health_checks_failed INTEGER,
    release_reason VARCHAR(100),
    ...
);
```

**视图**:
- `v_active_proxy_usage` - 活跃代理统计
- `v_proxy_performance_stats` - 代理性能汇总

### 服务层

```
src/proxy/
├── proxy-stats.service.ts         ✅ 已创建
├── proxy-health.service.ts        ⏳ 待创建
├── proxy-cleanup.service.ts       ⏳ 待创建
├── proxy-admin.controller.ts      ⏳ 待创建
└── proxy.module.ts                ⏳ 待创建
```

---

## 📝 已完成工作

### ✅ Step 1: 数据库扩展

**文件**: `migrations/20251102_create_proxy_usage_table.sql`

**内容**:
- ✅ 创建 `proxy_usage` 表
- ✅ 8 个索引（包括部分索引和复合索引）
- ✅ 2 个统计视图
- ✅ 触发器：自动计算使用时长
- ✅ 清理函数：删除 90 天前记录

**验证**: 已成功应用到 cloudphone_device 数据库

### ✅ Step 2: ProxyUsage 实体

**文件**: `src/entities/proxy-usage.entity.ts`

**功能**:
- 完整的字段映射
- 健康状态枚举
- 释放原因枚举
- 辅助方法：计算健康率、判断活跃状态、计算时长

### ✅ Step 3: ProxyStatsService

**文件**: `src/proxy/proxy-stats.service.ts`

**方法**:
- `recordProxyAssignment()` - 记录代理分配
- `recordProxyRelease()` - 记录代理释放
- `updateProxyHealth()` - 更新健康检查结果
- `getCurrentProxyUsage()` - 获取设备当前代理
- `getDeviceProxyHistory()` - 获取设备历史记录
- `getProxyStats()` - 获取代理详细统计
- `getActiveProxyStats()` - 获取所有活跃代理统计
- `getProxyUsageOverview()` - 获取总览数据
- `cleanupOldRecords()` - 清理旧记录

---

## 🔧 待实现任务

### ⏳ Step 4: ProxyHealthService

**文件**: `src/proxy/proxy-health.service.ts`

**功能**:

```typescript
@Injectable()
export class ProxyHealthService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private proxyClient: ProxyClientService,
    private proxyStats: ProxyStatsService,
  ) {}

  /**
   * 定时健康检查（每 5 分钟）
   */
  @Cron('*/5 * * * *')
  async checkAllProxies(): Promise<void> {
    // 1. 查询所有有代理的运行中设备
    const devices = await this.deviceRepository.find({
      where: {
        proxyId: Not(IsNull()),
        status: DeviceStatus.RUNNING,
      },
    });

    // 2. 并发检查所有代理
    await Promise.allSettled(
      devices.map(device => this.checkDeviceProxy(device))
    );
  }

  /**
   * 检查单个设备的代理健康状态
   */
  async checkDeviceProxy(device: Device): Promise<ProxyHealthStatus> {
    try {
      // 调用 proxy-service 的健康检查接口
      const health = await this.proxyClient.checkProxyHealth(device.proxyId);

      // 更新统计
      await this.proxyStats.updateProxyHealth(
        device.id,
        device.proxyId,
        health.status,
        health.status === 'healthy'
      );

      // 如果不健康，考虑触发告警或自动切换
      if (health.status === 'unhealthy') {
        this.logger.warn(`Proxy ${device.proxyId} is unhealthy for device ${device.id}`);
        // 可选：触发代理切换逻辑（Phase 3）
      }

      return health.status;
    } catch (error) {
      this.logger.error(`Health check failed for proxy ${device.proxyId}`, error.stack);
      await this.proxyStats.updateProxyHealth(
        device.id,
        device.proxyId,
        ProxyHealthStatus.UNHEALTHY,
        false
      );
      return ProxyHealthStatus.UNHEALTHY;
    }
  }

  /**
   * 手动触发健康检查
   */
  async triggerHealthCheck(deviceId: string): Promise<ProxyHealthStatus> {
    const device = await this.deviceRepository.findOne({ where: { id: deviceId } });
    if (!device || !device.proxyId) {
      throw new NotFoundException('Device or proxy not found');
    }
    return this.checkDeviceProxy(device);
  }
}
```

**配置**:
```bash
# .env
PROXY_HEALTH_CHECK_ENABLED=true
PROXY_HEALTH_CHECK_INTERVAL=5  # 分钟
```

### ⏳ Step 5: ProxyCleanupService

**文件**: `src/proxy/proxy-cleanup.service.ts`

**功能**:

```typescript
@Injectable()
export class ProxyCleanupService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(ProxyUsage)
    private proxyUsageRepository: Repository<ProxyUsage>,
    private proxyClient: ProxyClientService,
    private proxyStats: ProxyStatsService,
  ) {}

  /**
   * 定时清理孤儿代理（每 2 小时）
   */
  @Cron('0 */2 * * *')
  async cleanupOrphanProxies(): Promise<void> {
    const report = await this.detectAndCleanOrphans();
    this.logger.log(`Orphan cleanup complete: ${JSON.stringify(report)}`);
  }

  /**
   * 检测并清理孤儿代理
   */
  async detectAndCleanOrphans(): Promise<{
    detected: string[];
    cleaned: string[];
    errors: any[];
  }> {
    // 1. 从 devices 表获取所有已分配的代理 ID
    const deviceProxies = await this.deviceRepository
      .createQueryBuilder('device')
      .select('DISTINCT device.proxy_id', 'proxyId')
      .where('device.proxy_id IS NOT NULL')
      .getRawMany();

    const deviceProxyIds = new Set(deviceProxies.map(p => p.proxyId));

    // 2. 从 proxy_usage 表获取所有活跃代理 ID
    const activeUsages = await this.proxyUsageRepository.find({
      where: { releasedAt: null as any },
      select: ['proxyId', 'deviceId'],
    });

    const usageProxyIds = new Set(activeUsages.map(u => u.proxyId));

    // 3. 找出孤儿：在 proxy_usage 中有记录但 devices 中没有
    const orphanProxyIds = [...usageProxyIds].filter(id => !deviceProxyIds.has(id));

    if (orphanProxyIds.length === 0) {
      this.logger.log('No orphan proxies detected');
      return { detected: [], cleaned: [], errors: [] };
    }

    this.logger.warn(`Detected ${orphanProxyIds.length} orphan proxies: ${orphanProxyIds.join(', ')}`);

    // 4. 清理孤儿代理
    const cleaned: string[] = [];
    const errors: any[] = [];

    for (const proxyId of orphanProxyIds) {
      try {
        // 释放代理资源
        await this.proxyClient.releaseProxy(proxyId);

        // 更新所有相关的 proxy_usage 记录
        await this.proxyUsageRepository
          .createQueryBuilder()
          .update()
          .set({
            releasedAt: new Date(),
            releaseReason: ProxyReleaseReason.AUTO_CLEANUP,
          })
          .where('proxy_id = :proxyId', { proxyId })
          .andWhere('released_at IS NULL')
          .execute();

        cleaned.push(proxyId);
        this.logger.log(`Cleaned orphan proxy: ${proxyId}`);
      } catch (error) {
        this.logger.error(`Failed to clean orphan proxy ${proxyId}`, error.stack);
        errors.push({ proxyId, error: error.message });
      }
    }

    return {
      detected: orphanProxyIds,
      cleaned,
      errors,
    };
  }

  /**
   * 手动触发清理
   */
  async forceCleanup(): Promise<{
    detected: string[];
    cleaned: string[];
    errors: any[];
  }> {
    this.logger.log('Manual orphan cleanup triggered');
    return this.detectAndCleanOrphans();
  }
}
```

### ⏳ Step 6: API 控制器

**文件**: `src/proxy/proxy-admin.controller.ts`

**端点设计**:

```typescript
@Controller('admin/proxies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class ProxyAdminController {
  constructor(
    private proxyHealth: ProxyHealthService,
    private proxyStats: ProxyStatsService,
    private proxyCleanup: ProxyCleanupService,
  ) {}

  /**
   * GET /admin/proxies/stats/overview
   * 获取代理使用总览
   */
  @Get('stats/overview')
  async getOverview() {
    return this.proxyStats.getProxyUsageOverview();
  }

  /**
   * GET /admin/proxies/stats/active
   * 获取所有活跃代理统计
   */
  @Get('stats/active')
  async getActiveStats() {
    return this.proxyStats.getActiveProxyStats();
  }

  /**
   * GET /admin/proxies/:proxyId/stats
   * 获取特定代理的详细统计
   */
  @Get(':proxyId/stats')
  async getProxyStats(@Param('proxyId') proxyId: string) {
    return this.proxyStats.getProxyStats(proxyId);
  }

  /**
   * POST /admin/proxies/health-check
   * 触发全局健康检查
   */
  @Post('health-check')
  async triggerHealthCheck() {
    await this.proxyHealth.checkAllProxies();
    return { message: 'Health check triggered' };
  }

  /**
   * POST /admin/proxies/cleanup
   * 触发孤儿代理清理
   */
  @Post('cleanup')
  async cleanupOrphans() {
    const report = await this.proxyCleanup.forceCleanup();
    return {
      message: 'Cleanup completed',
      ...report,
    };
  }

  /**
   * DELETE /admin/proxies/old-records
   * 清理历史记录
   */
  @Delete('old-records')
  async cleanupOldRecords() {
    const count = await this.proxyStats.cleanupOldRecords();
    return { message: `Cleaned ${count} old records` };
  }
}
```

**设备级别 API**:

```typescript
@Controller('devices/:deviceId/proxy')
@UseGuards(JwtAuthGuard)
export class DeviceProxyController {
  constructor(
    private proxyHealth: ProxyHealthService,
    private proxyStats: ProxyStatsService,
  ) {}

  /**
   * GET /devices/:deviceId/proxy/health
   * 获取设备代理健康状态
   */
  @Get('health')
  async getProxyHealth(@Param('deviceId') deviceId: string) {
    const status = await this.proxyHealth.triggerHealthCheck(deviceId);
    return { status };
  }

  /**
   * GET /devices/:deviceId/proxy/stats
   * 获取设备代理统计
   */
  @Get('stats')
  async getProxyStats(@Param('deviceId') deviceId: string) {
    const current = await this.proxyStats.getCurrentProxyUsage(deviceId);
    if (!current) {
      throw new NotFoundException('No active proxy found');
    }
    return {
      ...current,
      currentDurationMinutes: current.getCurrentDuration(),
      healthPassRate: current.getHealthCheckPassRate(),
    };
  }

  /**
   * GET /devices/:deviceId/proxy/history
   * 获取设备代理历史
   */
  @Get('history')
  async getProxyHistory(@Param('deviceId') deviceId: string) {
    return this.proxyStats.getDeviceProxyHistory(deviceId, 10);
  }
}
```

### ⏳ Step 7: 集成到 DevicesService

**修改**: `src/devices/devices.service.ts`

**在 Saga Step 3 (CREATE_DATABASE_RECORD) 后添加**:

```typescript
// Step 3 后：记录代理分配统计
if (state.proxyAllocated && state.proxy) {
  try {
    await this.proxyStats.recordProxyAssignment({
      deviceId: state.deviceId,
      deviceName: createDeviceDto.name,
      userId: createDeviceDto.userId,
      userName: createDeviceDto.userEmail,
      proxyId: state.proxy.proxyId,
      proxyHost: state.proxy.proxyHost,
      proxyPort: state.proxy.proxyPort,
      proxyType: state.proxy.proxyType,
      proxyCountry: state.proxy.proxyCountry,
    });
    this.logger.log(`[SAGA] Proxy usage recorded: ${state.proxy.proxyId}`);
  } catch (error) {
    // 统计记录失败不影响设备创建
    this.logger.warn(`[SAGA] Failed to record proxy usage: ${error.message}`);
  }
}
```

**在 remove() 方法中**:

```typescript
// 释放代理前：记录释放统计
if (device.providerType === DeviceProviderType.REDROID && device.proxyId && this.proxyClient) {
  try {
    // 记录释放（可选：收集性能统计）
    await this.proxyStats.recordProxyRelease(
      device.id,
      device.proxyId,
      ProxyReleaseReason.DEVICE_DELETED,
      // 可选：从设备元数据中提取性能统计
      // device.metadata?.proxyStats
    );

    // 释放代理
    await this.proxyClient.releaseProxy(device.proxyId);
    this.logger.log(`Released proxy ${device.proxyId} for device ${id}`);
  } catch (error) {
    this.logger.warn(
      `Failed to release proxy ${device.proxyId} for device ${id}`,
      error.message,
    );
  }
}
```

### ⏳ Step 8: Prometheus 监控

**新增指标**:

```typescript
// src/proxy/proxy-metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Gauge } from 'prom-client';

@Injectable()
export class ProxyMetricsService {
  // 代理分配总数
  private readonly proxyAssignmentsTotal = new Counter({
    name: 'proxy_assignments_total',
    help: 'Total number of proxy assignments',
    labelNames: ['country', 'type'],
  });

  // 代理释放总数
  private readonly proxyReleasesTotal = new Counter({
    name: 'proxy_releases_total',
    help: 'Total number of proxy releases',
    labelNames: ['reason'],
  });

  // 当前活跃代理数
  private readonly activeProxiesGauge = new Gauge({
    name: 'active_proxies',
    help: 'Current number of active proxies',
  });

  // 代理健康检查总数
  private readonly proxyHealthChecksTotal = new Counter({
    name: 'proxy_health_checks_total',
    help: 'Total number of proxy health checks',
    labelNames: ['status'],
  });

  // 孤儿代理清理数
  private readonly orphanProxiesCleanedTotal = new Counter({
    name: 'orphan_proxies_cleaned_total',
    help: 'Total number of orphan proxies cleaned',
  });

  recordAssignment(country?: string, type?: string) {
    this.proxyAssignmentsTotal.inc({ country: country || 'unknown', type: type || 'HTTP' });
  }

  recordRelease(reason: string) {
    this.proxyReleasesTotal.inc({ reason });
  }

  setActiveProxies(count: number) {
    this.activeProxiesGauge.set(count);
  }

  recordHealthCheck(status: string) {
    this.proxyHealthChecksTotal.inc({ status });
  }

  recordOrphanCleaned(count: number) {
    this.orphanProxiesCleanedTotal.inc(count);
  }
}
```

---

## 📊 测试计划

### 单元测试

```typescript
// src/proxy/__tests__/proxy-stats.service.spec.ts
describe('ProxyStatsService', () => {
  it('should record proxy assignment', async () => {
    const usage = await service.recordProxyAssignment({
      deviceId: 'device-1',
      proxyId: 'proxy-1',
      proxyHost: '1.2.3.4',
      proxyPort: 8080,
    });
    expect(usage.deviceId).toBe('device-1');
    expect(usage.isActive()).toBe(true);
  });

  it('should record proxy release', async () => {
    // ... 测试释放逻辑
  });

  it('should calculate proxy stats', async () => {
    // ... 测试统计计算
  });
});
```

### 集成测试

```bash
# scripts/test-proxy-phase2.sh

# 1. 创建设备（触发代理分配和统计记录）
curl -X POST http://localhost:30000/devices ...

# 2. 检查 proxy_usage 表
psql -c "SELECT * FROM proxy_usage WHERE device_id = '...'"

# 3. 触发健康检查
curl -X POST http://localhost:30000/admin/proxies/health-check

# 4. 查看统计
curl http://localhost:30000/admin/proxies/stats/overview

# 5. 触发孤儿清理
curl -X POST http://localhost:30000/admin/proxies/cleanup

# 6. 删除设备（触发统计记录和代理释放）
curl -X DELETE http://localhost:30000/devices/...

# 7. 验证 proxy_usage 记录已更新
psql -c "SELECT * FROM proxy_usage WHERE released_at IS NOT NULL"
```

---

## 🎯 成功标准

- [x] proxy_usage 表创建成功
- [x] ProxyUsage 实体正常工作
- [x] ProxyStatsService 所有方法通过测试
- [ ] ProxyHealthService 健康检查正常运行
- [ ] ProxyCleanupService 能检测并清理孤儿代理
- [ ] API 端点返回正确数据
- [ ] Prometheus 指标正常暴露
- [ ] 集成测试全部通过

---

## 📈 下一步 (Phase 3)

**Phase 3: 高级功能**
- 代理热迁移（设备运行时切换代理）
- 智能代理选择（基于质量评分、地理位置）
- 成本追踪（代理使用费用统计）
- 告警集成（不健康代理自动告警）

---

**当前进度**: 30% (3/9 任务完成)

**预计完成时间**: 剩余 6 小时工作量
