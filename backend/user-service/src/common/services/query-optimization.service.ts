import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';

/**
 * 物化视图信息
 */
export interface MaterializedViewInfo {
  viewName: string;
  lastRefreshed: Date | null;
  isStale: boolean;
  rowCount: number;
  size: string;
}

/**
 * 刷新结果
 */
export interface RefreshResult {
  viewName: string;
  refreshTime: string;
  rowsAffected: number;
}

/**
 * 查询优化服务（Phase 3 优化）
 *
 * 功能：
 * - 自动刷新物化视图
 * - 监控物化视图状态
 * - 预计算表管理
 * - 查询性能监控
 */
@Injectable()
export class QueryOptimizationService {
  private readonly logger = new Logger(QueryOptimizationService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  /**
   * 每小时刷新所有物化视图
   */
  @Cron('0 * * * *', {
    name: 'refresh-materialized-views',
    timeZone: 'Asia/Shanghai',
  })
  async refreshAllMaterializedViews(): Promise<RefreshResult[]> {
    try {
      this.logger.log('开始刷新所有物化视图...');

      const results = await this.dataSource.query('SELECT * FROM refresh_all_materialized_views()');

      this.logger.log(
        `✓ 物化视图刷新完成 - 数量: ${results.length}`,
        results.map((r: any) => ({
          view: r.view_name,
          time: r.refresh_time,
          rows: r.rows_affected,
        }))
      );

      return results.map((r: any) => ({
        viewName: r.view_name,
        refreshTime: r.refresh_time,
        rowsAffected: parseInt(r.rows_affected, 10),
      }));
    } catch (error) {
      this.logger.error('刷新物化视图失败', error);
      throw error;
    }
  }

  /**
   * 刷新指定物化视图
   *
   * @param viewName 视图名称
   */
  async refreshMaterializedView(viewName: string): Promise<void> {
    try {
      this.logger.log(`刷新物化视图: ${viewName}`);

      await this.dataSource.query('SELECT refresh_materialized_view($1)', [viewName]);

      this.logger.log(`✓ 物化视图刷新完成: ${viewName}`);
    } catch (error) {
      this.logger.error(`刷新物化视图失败: ${viewName}`, error);
      throw error;
    }
  }

  /**
   * 获取所有物化视图的状态
   */
  async getMaterializedViewStatus(): Promise<MaterializedViewInfo[]> {
    try {
      const results = await this.dataSource.query('SELECT * FROM get_materialized_view_status()');

      return results.map((r: any) => ({
        viewName: r.view_name,
        lastRefreshed: r.last_refreshed ? new Date(r.last_refreshed) : null,
        isStale: r.is_stale,
        rowCount: parseInt(r.row_count, 10),
        size: r.size,
      }));
    } catch (error) {
      this.logger.error('获取物化视图状态失败', error);
      throw error;
    }
  }

  /**
   * 获取用户统计（从物化视图）
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    suspendedUsers: number;
    lockedUsers: number;
    superAdminCount: number;
    activeLast7Days: number;
    activeLast30Days: number;
    newUsersLast7Days: number;
    newUsersLast30Days: number;
    lastRefreshed: Date;
  }> {
    try {
      const result = await this.dataSource.query('SELECT * FROM mv_user_stats LIMIT 1');

      if (!result || result.length === 0) {
        throw new Error('用户统计物化视图为空');
      }

      const stats = result[0];

      return {
        totalUsers: parseInt(stats.total_users, 10),
        activeUsers: parseInt(stats.active_users, 10),
        inactiveUsers: parseInt(stats.inactive_users, 10),
        suspendedUsers: parseInt(stats.suspended_users, 10),
        lockedUsers: parseInt(stats.locked_users, 10),
        superAdminCount: parseInt(stats.super_admin_count, 10),
        activeLast7Days: parseInt(stats.active_last_7_days, 10),
        activeLast30Days: parseInt(stats.active_last_30_days, 10),
        newUsersLast7Days: parseInt(stats.new_users_last_7_days, 10),
        newUsersLast30Days: parseInt(stats.new_users_last_30_days, 10),
        lastRefreshed: new Date(stats.last_refreshed),
      };
    } catch (error) {
      this.logger.error('获取用户统计失败', error);
      throw error;
    }
  }

  /**
   * 获取按租户的用户统计（从物化视图）
   */
  async getUserStatsByTenant(tenantId?: string): Promise<any[]> {
    try {
      const query = tenantId
        ? 'SELECT * FROM mv_user_stats_by_tenant WHERE tenant_id = $1'
        : 'SELECT * FROM mv_user_stats_by_tenant ORDER BY total_users DESC';

      const params = tenantId ? [tenantId] : [];

      const results = await this.dataSource.query(query, params);

      return results.map((r: any) => ({
        tenantId: r.tenant_id,
        totalUsers: parseInt(r.total_users, 10),
        activeUsers: parseInt(r.active_users, 10),
        inactiveUsers: parseInt(r.inactive_users, 10),
        suspendedUsers: parseInt(r.suspended_users, 10),
        lockedUsers: parseInt(r.locked_users, 10),
        activeLast7Days: parseInt(r.active_last_7_days, 10),
        activeLast30Days: parseInt(r.active_last_30_days, 10),
        lastActivity: r.last_activity ? new Date(r.last_activity) : null,
        firstUserCreatedAt: new Date(r.first_user_created_at),
        lastUserCreatedAt: new Date(r.last_user_created_at),
        lastRefreshed: new Date(r.last_refreshed),
      }));
    } catch (error) {
      this.logger.error('获取租户用户统计失败', error);
      throw error;
    }
  }

  /**
   * 获取用户事件统计（从物化视图）
   */
  async getUserEventStats(startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      let query = 'SELECT * FROM mv_user_event_stats WHERE 1=1';
      const params: any[] = [];

      if (startDate) {
        params.push(startDate);
        query += ` AND event_date >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        query += ` AND event_date <= $${params.length}`;
      }

      query += ' ORDER BY event_date DESC, event_count DESC';

      const results = await this.dataSource.query(query, params);

      return results.map((r: any) => ({
        eventDate: new Date(r.event_date),
        eventType: r.event_type,
        eventCount: parseInt(r.event_count, 10),
        uniqueUsers: parseInt(r.unique_users, 10),
        lastRefreshed: new Date(r.last_refreshed),
      }));
    } catch (error) {
      this.logger.error('获取用户事件统计失败', error);
      throw error;
    }
  }

  /**
   * 获取用户活跃度（从物化视图）
   */
  async getUserActivity(userId: string): Promise<{
    userId: string;
    totalEvents: number;
    firstEventAt: Date;
    lastEventAt: Date;
    uniqueEventTypes: number;
    eventsLast7Days: number;
    eventsLast30Days: number;
    lastRefreshed: Date;
  } | null> {
    try {
      const result = await this.dataSource.query(
        'SELECT * FROM mv_user_activity WHERE user_id = $1',
        [userId]
      );

      if (!result || result.length === 0) {
        return null;
      }

      const activity = result[0];

      return {
        userId: activity.user_id,
        totalEvents: parseInt(activity.total_events, 10),
        firstEventAt: new Date(activity.first_event_at),
        lastEventAt: new Date(activity.last_event_at),
        uniqueEventTypes: parseInt(activity.unique_event_types, 10),
        eventsLast7Days: parseInt(activity.events_last_7_days, 10),
        eventsLast30Days: parseInt(activity.events_last_30_days, 10),
        lastRefreshed: new Date(activity.last_refreshed),
      };
    } catch (error) {
      this.logger.error('获取用户活跃度失败', error);
      throw error;
    }
  }

  /**
   * 获取每日用户统计（从预计算表）
   */
  async getDailyUserStats(days: number = 30): Promise<any[]> {
    try {
      const results = await this.dataSource.query(
        `SELECT * FROM daily_user_stats
         WHERE stat_date >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY stat_date DESC`
      );

      return results.map((r: any) => ({
        statDate: new Date(r.stat_date),
        totalUsers: parseInt(r.total_users, 10),
        newUsers: parseInt(r.new_users, 10),
        activeUsers: parseInt(r.active_users, 10),
        deletedUsers: parseInt(r.deleted_users, 10),
        activeUsers7d: parseInt(r.active_users_7d, 10),
        activeUsers30d: parseInt(r.active_users_30d, 10),
        loginCount: parseInt(r.login_count, 10),
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      }));
    } catch (error) {
      this.logger.error('获取每日用户统计失败', error);
      throw error;
    }
  }

  /**
   * 获取每小时事件统计（从预计算表）
   */
  async getHourlyEventStats(hours: number = 24): Promise<any[]> {
    try {
      const results = await this.dataSource.query(
        `SELECT * FROM hourly_event_stats
         WHERE stat_hour >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
         ORDER BY stat_hour DESC, event_count DESC`
      );

      return results.map((r: any) => ({
        statHour: new Date(r.stat_hour),
        eventType: r.event_type,
        eventCount: parseInt(r.event_count, 10),
        uniqueUsers: parseInt(r.unique_users, 10),
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      }));
    } catch (error) {
      this.logger.error('获取每小时事件统计失败', error);
      throw error;
    }
  }

  /**
   * 获取租户配额统计（从预计算表）
   */
  async getTenantQuotaStats(tenantId?: string): Promise<any[]> {
    try {
      const query = tenantId
        ? 'SELECT * FROM tenant_quota_stats WHERE tenant_id = $1'
        : 'SELECT * FROM tenant_quota_stats ORDER BY total_users DESC';

      const params = tenantId ? [tenantId] : [];

      const results = await this.dataSource.query(query, params);

      return results.map((r: any) => ({
        tenantId: r.tenant_id,
        totalUsers: parseInt(r.total_users, 10),
        totalDevices: parseInt(r.total_devices, 10),
        totalStorageBytes: parseInt(r.total_storage_bytes, 10),
        lastActivityAt: r.last_activity_at ? new Date(r.last_activity_at) : null,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      }));
    } catch (error) {
      this.logger.error('获取租户配额统计失败', error);
      throw error;
    }
  }

  /**
   * 获取查询优化总览
   */
  async getOptimizationSummary(): Promise<{
    materializedViews: {
      total: number;
      stale: number;
      upToDate: number;
      totalSize: string;
    };
    preComputedTables: {
      dailyStats: number;
      hourlyStats: number;
      tenantStats: number;
    };
  }> {
    try {
      // 获取物化视图状态
      const mvStatus = await this.getMaterializedViewStatus();

      const staleViews = mvStatus.filter((v) => v.isStale).length;
      const upToDateViews = mvStatus.length - staleViews;

      // 计算总大小（简化计算）
      const totalSizeBytes = mvStatus.reduce((sum, v) => {
        const match = v.size.match(/(\d+)/);
        return sum + (match ? parseInt(match[1], 10) : 0);
      }, 0);

      // 获取预计算表统计
      const dailyStatsCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM daily_user_stats'
      );
      const hourlyStatsCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM hourly_event_stats'
      );
      const tenantStatsCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM tenant_quota_stats'
      );

      return {
        materializedViews: {
          total: mvStatus.length,
          stale: staleViews,
          upToDate: upToDateViews,
          totalSize: `${Math.round(totalSizeBytes / 1024)} MB`,
        },
        preComputedTables: {
          dailyStats: parseInt(dailyStatsCount[0].count, 10),
          hourlyStats: parseInt(hourlyStatsCount[0].count, 10),
          tenantStats: parseInt(tenantStatsCount[0].count, 10),
        },
      };
    } catch (error) {
      this.logger.error('获取查询优化总览失败', error);
      throw error;
    }
  }

  /**
   * 服务启动时初始化
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('初始化查询优化服务...');

      // 检查物化视图状态
      const mvStatus = await this.getMaterializedViewStatus();

      const staleViews = mvStatus.filter((v) => v.isStale);

      if (staleViews.length > 0) {
        this.logger.warn(
          `检测到 ${staleViews.length} 个过期物化视图`,
          staleViews.map((v) => v.viewName)
        );

        // 刷新过期视图
        this.logger.log('刷新过期物化视图...');
        await this.refreshAllMaterializedViews();
      }

      // 输出总览
      const summary = await this.getOptimizationSummary();
      this.logger.log('查询优化总览:', {
        物化视图: `${summary.materializedViews.total} 个（${summary.materializedViews.upToDate} 个最新）`,
        预计算表: `${summary.preComputedTables.dailyStats} 条每日统计，${summary.preComputedTables.hourlyStats} 条每小时统计`,
        总大小: summary.materializedViews.totalSize,
      });

      this.logger.log('✓ 查询优化服务初始化完成');
    } catch (error) {
      this.logger.error('查询优化服务初始化失败', error);
      // 不抛出错误，允许服务启动
    }
  }
}
