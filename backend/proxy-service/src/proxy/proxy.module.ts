import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// 基础控制器和服务
import { ProxyController } from './controllers/proxy.controller';
import { ProxyService } from './services/proxy.service';

// 核心功能控制器（5个有Controller的核心功能）
import { ProxyIntelligenceController } from './controllers/proxy-intelligence.controller';
import { ProxyStickySessionController } from './controllers/proxy-sticky-session.controller';
import { ProxyCostMonitoringController } from './controllers/proxy-cost-monitoring.controller';
import { ProxyGeoMatchingController } from './controllers/proxy-geo-matching.controller';
import { ProxyProviderRankingController } from './controllers/proxy-provider-ranking.controller';

// 增强功能控制器
import { ProxyDeviceGroupController } from './controllers/proxy-device-group.controller';
import { ProxyAlertController } from './controllers/proxy-alert.controller';
import { ProxyUsageReportController } from './controllers/proxy-usage-report.controller';
import { ProxyAuditLogController } from './controllers/proxy-audit-log.controller';

// 核心功能服务（7个核心功能）
import { ProxyIntelligenceService } from './services/proxy-intelligence.service';
import { ProxyQualityService } from './services/proxy-quality.service';
import { ProxyFailoverService } from './services/proxy-failover.service';
import { ProxyStickySessionService } from './services/proxy-sticky-session.service';
import { ProxyCostMonitoringService } from './services/proxy-cost-monitoring.service';
import { ProxyGeoMatchingService } from './services/proxy-geo-matching.service';
import { ProxyProviderRankingService } from './services/proxy-provider-ranking.service';

// 增强功能服务
import { ProxyDeviceGroupService } from './services/proxy-device-group.service';
import { ProxyAlertService } from './services/proxy-alert.service';
import { ProxyUsageReportService } from './services/proxy-usage-report.service';
import { ProxyAuditLogService } from './services/proxy-audit-log.service';
import { ProxyProviderConfigService } from './services/proxy-provider-config.service';

// Pool模块
import { PoolModule } from '../pool/pool.module';

// 导入基础实体（从上级entities目录）
import { ProxyUsage } from '../entities/proxy-usage.entity';
import { ProxyProvider } from '../entities/proxy-provider.entity';
import { ProxyHealth } from '../entities/proxy-health.entity';
import { ProxySession } from '../entities/proxy-session.entity';
import { CostRecord } from '../entities/cost-record.entity';

// 导入增强功能实体（从当前proxy模块的entities子目录）
import {
  // 智能推荐
  ProxyRecommendation,
  ProxyTargetMapping,
  // 质量评分
  ProxyQualityScore,
  ProxyQualityHistory,
  // 故障切换
  ProxyFailoverConfig,
  ProxyFailoverHistory,
  // 粘性会话
  ProxyStickySession,
  ProxySessionRenewal,
  // 地理匹配
  DeviceGeoSetting,
  IspProvider,
  // 成本监控
  ProxyCostRecord,
  ProxyCostBudget,
  ProxyCostAlert,
  ProxyCostDailySummary,
  // 设备组
  ProxyDeviceGroup,
  ProxyGroupDevice,
  ProxyGroupPool,
  ProxyGroupStats,
  // Provider排名
  ProxyProviderScore,
  ProxyProviderScoreHistory,
  // 告警管理
  ProxyAlertChannel,
  ProxyAlertRule,
  ProxyAlertHistory,
  // 使用报告
  ProxyUsageSummary,
  ProxyReportExport,
  // 审计日志
  ProxyAuditLog,
  ProxySensitiveAuditLog,
} from './entities';

/**
 * Proxy模块
 * 整合代理业务相关的所有组件
 *
 * 功能模块：
 * - 基础代理服务（获取、释放、健康检查）
 * - 设备组管理（F2 - 设备分组和批量操作）
 * - 告警管理（G1 - 多通道告警和规则引擎）
 * - 使用报告（J1 - 报告生成和定时任务）
 * - 审计日志（M1 - 审计记录和合规性分析）
 *
 * 已实现的7个核心功能：
 * - A1: 智能推荐（Intelligence）
 * - B1: 质量评分（Quality）
 * - C1: 故障切换（Failover）
 * - D1: 粘性会话（Sticky）
 * - E1: 成本监控（Cost）
 * - H1: 地理匹配（Geo）
 * - I1: Provider排名（Provider）
 */
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(), // 支持定时任务（报告生成、日志清理等）
    TypeOrmModule.forFeature([
      // 基础实体
      ProxyProvider,
      ProxyUsage,
      ProxyHealth,
      ProxySession,
      CostRecord,
      // 智能推荐（2个）
      ProxyRecommendation,
      ProxyTargetMapping,
      // 质量评分（2个）
      ProxyQualityScore,
      ProxyQualityHistory,
      // 故障切换（2个）
      ProxyFailoverConfig,
      ProxyFailoverHistory,
      // 粘性会话（2个）
      ProxyStickySession,
      ProxySessionRenewal,
      // 地理匹配（2个）
      DeviceGeoSetting,
      IspProvider,
      // 成本监控（4个）
      ProxyCostRecord,
      ProxyCostBudget,
      ProxyCostAlert,
      ProxyCostDailySummary,
      // 设备组（4个）
      ProxyDeviceGroup,
      ProxyGroupDevice,
      ProxyGroupPool,
      ProxyGroupStats,
      // Provider排名（2个）
      ProxyProviderScore,
      ProxyProviderScoreHistory,
      // 告警管理（3个）
      ProxyAlertChannel,
      ProxyAlertRule,
      ProxyAlertHistory,
      // 使用报告（2个）
      ProxyUsageSummary,
      ProxyReportExport,
      // 审计日志（2个）
      ProxyAuditLog,
      ProxySensitiveAuditLog,
    ]),
    PoolModule,
  ],
  controllers: [
    // 基础控制器
    ProxyController,
    // 核心功能控制器（5个）
    ProxyIntelligenceController,
    ProxyStickySessionController,
    ProxyCostMonitoringController,
    ProxyGeoMatchingController,
    ProxyProviderRankingController,
    // 增强功能控制器（4个）
    ProxyDeviceGroupController,
    ProxyAlertController,
    ProxyUsageReportController,
    ProxyAuditLogController,
  ],
  providers: [
    // 基础服务
    ProxyService,
    // 核心功能服务（7个）
    ProxyIntelligenceService,
    ProxyQualityService,
    ProxyFailoverService,
    ProxyStickySessionService,
    ProxyCostMonitoringService,
    ProxyGeoMatchingService,
    ProxyProviderRankingService,
    // 增强功能服务（5个）
    ProxyDeviceGroupService,
    ProxyAlertService,
    ProxyUsageReportService,
    ProxyAuditLogService,
    ProxyProviderConfigService, // ✅ 新增：提供商配置服务（带缓存优化）
  ],
  exports: [
    // 导出所有服务供其他模块使用
    ProxyService,
    ProxyIntelligenceService,
    ProxyQualityService,
    ProxyFailoverService,
    ProxyStickySessionService,
    ProxyCostMonitoringService,
    ProxyGeoMatchingService,
    ProxyProviderRankingService,
    ProxyDeviceGroupService,
    ProxyAlertService,
    ProxyUsageReportService,
    ProxyAuditLogService,
    ProxyProviderConfigService, // ✅ 新增：导出提供商配置服务
  ],
})
export class ProxyModule {}
