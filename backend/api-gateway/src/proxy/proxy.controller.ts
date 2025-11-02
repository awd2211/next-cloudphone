import {
  Controller,
  All,
  Req,
  Res,
  Param,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { lastValueFrom } from 'rxjs';

// 扩展 Request 类型以包含 JWT 用户信息和 Request ID
interface RequestWithUser extends Request {
  user?: {
    id: string;
    username: string;
    tenantId?: string;
    roles?: string[];
  };
  requestId?: string;
}

@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private readonly proxyService: ProxyService) {}

  /**
   * 熔断器状态监控端点（公开访问）
   */
  @Public()
  @Get('circuit-breaker/stats')
  async getCircuitBreakerStats() {
    const stats = this.proxyService.getCircuitBreakerStats();
    return {
      timestamp: new Date().toISOString(),
      circuitBreakers: stats,
    };
  }

  /**
   * 清除服务 URL 缓存（公开访问）
   */
  @Public()
  @All('service-cache/clear')
  async clearServiceCache(@Req() req: Request) {
    const serviceName = req.query.service as string;
    this.proxyService.clearServiceUrlCache(serviceName);
    return {
      success: true,
      message: serviceName
        ? `Cleared cache for service: ${serviceName}`
        : 'Cleared all service URL caches',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 健康检查端点（公开访问）- 聚合所有微服务健康状态
   */
  @Public()
  @All('health')
  async healthCheck() {
    const services = await this.proxyService.checkServicesHealth();
    const allHealthy = Object.values(services).every((s: any) => s.status === 'healthy');

    const os = await import('os');
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      status: allHealthy ? 'ok' : 'degraded',
      service: 'api-gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        memory: {
          total: Math.floor(totalMemory / 1024 / 1024), // MB
          free: Math.floor(freeMemory / 1024 / 1024), // MB
          used: Math.floor(usedMemory / 1024 / 1024), // MB
          usagePercent: Math.floor((usedMemory / totalMemory) * 100),
        },
        cpu: {
          cores: os.cpus().length,
          model: os.cpus()[0]?.model || 'unknown',
        },
      },
      services,
    };
  }

  /**
   * 认证服务路由（公开访问 - 登录、注册等）
   */
  @Public()
  @All('auth/*path')
  async proxyAuth(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 认证服务路由（精确匹配）
   */
  @Public()
  @All('auth')
  async proxyAuthExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 用户服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('users')
  async proxyUsersExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 用户服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('users/*path')
  async proxyUsers(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 角色服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('roles')
  async proxyRolesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 角色服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('roles/*path')
  async proxyRoles(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 权限服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('permissions')
  async proxyPermissionsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 权限服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('permissions/*path')
  async proxyPermissions(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 数据权限元数据路由（公开访问，无需认证）
   */
  @Public()
  @All('data-scopes/meta/*path')
  async proxyDataScopesMetaPublic(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 数据权限服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('data-scopes')
  async proxyDataScopesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 数据权限服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('data-scopes/*path')
  async proxyDataScopes(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 字段权限服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('field-permissions')
  async proxyFieldPermissionsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 字段权限服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('field-permissions/*path')
  async proxyFieldPermissions(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 菜单权限服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('menu-permissions')
  async proxyMenuPermissionsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 菜单权限服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('menu-permissions/*path')
  async proxyMenuPermissions(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 配额服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('quotas')
  async proxyQuotasExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 配额服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('quotas/*path')
  async proxyQuotas(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 工单服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('tickets')
  async proxyTicketsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 工单服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('tickets/*path')
  async proxyTickets(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 审计日志服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('audit-logs')
  async proxyAuditLogsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 审计日志服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('audit-logs/*path')
  async proxyAuditLogs(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * API密钥服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('api-keys')
  async proxyApiKeysExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * API密钥服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('api-keys/*path')
  async proxyApiKeys(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 缓存管理服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('cache')
  async proxyCacheExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 缓存管理服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('cache/*path')
  async proxyCache(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 队列管理服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('queues')
  async proxyQueuesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 队列管理服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('queues/*path')
  async proxyQueues(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 事件溯源服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('events')
  async proxyEventsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 事件溯源服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('events/*path')
  async proxyEvents(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 通知服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('notifications')
  async proxyNotificationsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  /**
   * 通知服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('notifications/*path')
  async proxyNotifications(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  /**
   * 设备服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('devices')
  async proxyDevicesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 设备服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('devices/*path')
  async proxyDevices(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 应用服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('apps')
  async proxyAppsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('apps', req, res);
  }

  /**
   * 应用服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('apps/*path')
  async proxyApps(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('apps', req, res);
  }

  /**
   * 调度服务路由
   */
  @UseGuards(JwtAuthGuard)
  @All('scheduler/*path')
  async proxyScheduler(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('scheduler', req, res);
  }

  /**
   * 订单服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('orders')
  async proxyOrdersExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 订单服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('orders/*path')
  async proxyOrders(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 套餐服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('plans')
  async proxyPlansExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 套餐服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('plans/*path')
  async proxyPlans(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 发票服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('invoices')
  async proxyInvoicesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 发票服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('invoices/*path')
  async proxyInvoices(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 计费服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('billing')
  async proxyBillingExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 计费服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('billing/*path')
  async proxyBilling(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 支付服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('payments')
  async proxyPaymentsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 支付服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('payments/*path')
  async proxyPayments(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 支付管理服务路由（精确匹配）- 管理员专用
   */
  @UseGuards(JwtAuthGuard)
  @All('admin/payments')
  async proxyAdminPaymentsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 支付管理服务路由（通配符）- 管理员专用
   */
  @UseGuards(JwtAuthGuard)
  @All('admin/payments/*path')
  async proxyAdminPayments(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 计量服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('metering')
  async proxyMeteringExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 计量服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('metering/*path')
  async proxyMetering(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 余额服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('balance')
  async proxyBalanceExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 余额服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('balance/*path')
  async proxyBalance(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 流媒体服务路由（WebRTC 相关）
   */
  @UseGuards(JwtAuthGuard)
  @All('media/*path')
  async proxyMedia(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('media', req, res);
  }

  /**
   * 统计服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('stats')
  async proxyStatsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 统计服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('stats/*path')
  async proxyStats(@Req() req: Request, @Res() res: Response) {
    // Stats are aggregated from multiple services, route to billing service for now
    return this.handleProxy('billing', req, res);
  }

  /**
   * 报表服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('reports')
  async proxyReportsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 报表服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('reports/*path')
  async proxyReports(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 设置服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('settings')
  async proxySettingsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 设置服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('settings/*path')
  async proxySettings(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 使用记录服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('usage')
  async proxyUsageExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 使用记录服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('usage/*path')
  async proxyUsage(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * SMS 短信服务路由 (notification-service)
   */
  @UseGuards(JwtAuthGuard)
  @All('sms')
  async proxySmsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('sms/*path')
  async proxySms(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  /**
   * GPU 管理路由 (device-service)
   */
  @UseGuards(JwtAuthGuard)
  @All('gpu')
  async proxyGpuExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('gpu/*path')
  async proxyGpu(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 设备生命周期管理路由 (device-service)
   */
  @UseGuards(JwtAuthGuard)
  @All('lifecycle')
  async proxyLifecycleExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('lifecycle/*path')
  async proxyLifecycle(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 设备快照管理路由 (device-service)
   */
  @UseGuards(JwtAuthGuard)
  @All('snapshots')
  async proxySnapshotsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('snapshots/*path')
  async proxySnapshots(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 设备故障转移路由 (device-service)
   */
  @UseGuards(JwtAuthGuard)
  @All('failover')
  async proxyFailoverExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('failover/*path')
  async proxyFailover(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 设备状态恢复路由 (device-service)
   */
  @UseGuards(JwtAuthGuard)
  @All('state-recovery')
  async proxyStateRecoveryExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('state-recovery/*path')
  async proxyStateRecovery(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 物理设备管理路由 (device-service)
   */
  @UseGuards(JwtAuthGuard)
  @All('admin/physical-devices')
  async proxyPhysicalDevicesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('admin/physical-devices/*path')
  async proxyPhysicalDevices(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 计费规则管理路由 (billing-service)
   */
  @UseGuards(JwtAuthGuard)
  @All('billing-rules')
  async proxyBillingRulesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('billing-rules/*path')
  async proxyBillingRules(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 通知模板服务路由 - 独立路由
   * GET/POST/PATCH/DELETE /templates
   */
  @UseGuards(JwtAuthGuard)
  @All('templates')
  async proxyTemplatesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('templates/*path')
  async proxyTemplates(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  /**
   * SMS接收服务路由 (sms-receive-service)
   * 虚拟号码请求和管理
   */
  @UseGuards(JwtAuthGuard)
  @All('sms-numbers')
  async proxySmsNumbersExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('sms-receive-service', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('sms-numbers/*path')
  async proxySmsNumbers(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('sms-receive-service', req, res);
  }

  /**
   * 通用代理处理方法
   */
  private async handleProxy(serviceName: string, req: Request, res: Response): Promise<void> {
    try {
      // 构建目标路径
      const urlParts = req.url.split('?');
      const pathParts = urlParts[0].split('/').filter((p) => p);

      // 后端服务已移除 app.setGlobalPrefix('api/v1')
      // 统一由 API Gateway 处理路由，不再添加 /api/v1 前缀
      // 直接转发路径即可

      let targetPath: string;
      // 直接使用原始路径，不添加任何前缀
      targetPath = `/${pathParts.join('/')}`;

      // 不要拼接查询参数到 path，而是通过 params 传递
      // if (urlParts[1]) {
      //   targetPath += `?${urlParts[1]}`;
      // }

      // 获取 Request ID
      const reqWithUser = req as RequestWithUser;
      const requestId = reqWithUser.requestId || 'unknown';

      this.logger.log(
        `[${requestId}] 🔀 Routing ${req.method} ${req.url} -> ${serviceName}${targetPath}`
      );
      this.logger.log(`[${requestId}] 📋 查询参数: ${JSON.stringify(req.query)}`);
      this.logger.log(
        `[${requestId}] 👤 用户信息: ${reqWithUser.user?.username} (${reqWithUser.user?.id})`
      );

      // 转发请求到目标服务
      const result$ = this.proxyService.proxyRequest(
        serviceName,
        targetPath,
        req.method,
        req.body,
        {
          ...req.headers,
          // 注入 Request ID (跨服务追踪)
          'x-request-id': requestId,
          // 注入用户信息（从 JWT 中提取）
          'x-user-id': reqWithUser.user?.id,
          'x-user-tenant': reqWithUser.user?.tenantId,
          // Base64 编码角色数组，避免 HTTP 头中的非法字符
          'x-user-roles': Buffer.from(JSON.stringify(reqWithUser.user?.roles || [])).toString(
            'base64'
          ),
        },
        req.query
      );

      const result = await lastValueFrom(result$);

      // 返回结果
      res.status(200).json(result);
    } catch (error) {
      this.logger.error(`Proxy error: ${error.message}`, error.stack);

      // 处理错误响应
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const response = error.getResponse();
        res.status(status).json(response);
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '网关内部错误',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}
