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
import { trace, SpanStatusCode } from '@opentelemetry/api';
import * as os from 'os';

// 缓存系统信息（启动时计算一次，避免每次请求都调用）
const SYSTEM_INFO = {
  hostname: os.hostname(),
  platform: os.platform(),
  cpuCores: os.cpus().length,
  cpuModel: os.cpus()[0]?.model || 'unknown',
  totalMemory: os.totalmem(),
};

// 内存信息缓存（5秒）
let memoryCache: { data: any; timestamp: number } | null = null;
const MEMORY_CACHE_TTL = 5000;

function getMemoryInfo() {
  const now = Date.now();
  if (memoryCache && now - memoryCache.timestamp < MEMORY_CACHE_TTL) {
    return memoryCache.data;
  }
  const freeMemory = os.freemem();
  const usedMemory = SYSTEM_INFO.totalMemory - freeMemory;
  const data = {
    total: Math.floor(SYSTEM_INFO.totalMemory / 1024 / 1024),
    free: Math.floor(freeMemory / 1024 / 1024),
    used: Math.floor(usedMemory / 1024 / 1024),
    usagePercent: Math.floor((usedMemory / SYSTEM_INFO.totalMemory) * 100),
  };
  memoryCache = { data, timestamp: now };
  return data;
}

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
  private readonly tracer = trace.getTracer('api-gateway');

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
      message: serviceName
        ? `Cleared cache for service: ${serviceName}`
        : 'Cleared all service URL caches',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 健康检查端点（公开访问）- 聚合所有微服务健康状态
   * 性能优化：使用缓存的系统信息，避免每次请求都调用 os 模块
   */
  @Public()
  @All('health')
  async healthCheck() {
    const services = await this.proxyService.checkServicesHealth();
    const allHealthy = Object.values(services).every((s: any) => s.status === 'healthy');

    // 使用缓存的内存信息（5秒 TTL）
    const memory = getMemoryInfo();

    return {
      status: allHealthy ? 'ok' : 'degraded',
      service: 'api-gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      system: {
        hostname: SYSTEM_INFO.hostname,
        platform: SYSTEM_INFO.platform,
        memory,
        cpu: {
          cores: SYSTEM_INFO.cpuCores,
          model: SYSTEM_INFO.cpuModel,
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
   * 数据权限服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('data-scopes')
  async proxyDataScopesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 数据权限服务路由（通配符，包括元数据路由）
   * 注意：已移除公开的 /data-scopes/meta/* 路由以符合安全最佳实践
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
   * 菜单服务路由（精确匹配）
   */
  @UseGuards(JwtAuthGuard)
  @All('menus')
  async proxyMenusExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 菜单服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('menus/*path')
  async proxyMenus(@Req() req: Request, @Res() res: Response) {
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
   * 邮件服务路由（精确匹配）- 路由到 notification-service
   * 用于测试邮件发送等功能
   */
  @UseGuards(JwtAuthGuard)
  @All('email')
  async proxyEmailExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  /**
   * 邮件服务路由（通配符）- 路由到 notification-service
   */
  @UseGuards(JwtAuthGuard)
  @All('email/*path')
  async proxyEmail(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  /**
   * 设备组管理路由（精确匹配）- 路由到 proxy-service
   * 注意：必须在 devices/*path 之前定义，以确保优先匹配
   */
  @UseGuards(JwtAuthGuard)
  @All('devices/groups')
  async proxyDeviceGroupsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('proxy-service', req, res);
  }

  /**
   * 设备组管理路由（通配符）- 路由到 proxy-service
   */
  @UseGuards(JwtAuthGuard)
  @All('devices/groups/*path')
  async proxyDeviceGroups(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('proxy-service', req, res);
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
   * 使用记录管理路由（精确匹配）- 管理员专用
   * 包括: 使用记录导出、查询等功能
   */
  @UseGuards(JwtAuthGuard)
  @All('billing/admin/usage')
  async proxyBillingAdminUsageExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 使用记录管理路由（通配符）- 管理员专用
   */
  @UseGuards(JwtAuthGuard)
  @All('billing/admin/usage/*path')
  async proxyBillingAdminUsage(@Req() req: Request, @Res() res: Response) {
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
   * 云端对账路由（精确匹配）- 管理员专用
   * 路由到 device-service (providers.controller.ts)
   */
  @UseGuards(JwtAuthGuard)
  @All('admin/billing/cloud-reconciliation')
  async proxyAdminBillingCloudReconciliation(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 计费管理服务路由（精确匹配）- 管理员专用
   * 包括: 其他高级计费功能
   */
  @UseGuards(JwtAuthGuard)
  @All('admin/billing')
  async proxyAdminBillingExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 计费管理服务路由（通配符）- 管理员专用
   */
  @UseGuards(JwtAuthGuard)
  @All('admin/billing/*path')
  async proxyAdminBilling(@Req() req: Request, @Res() res: Response) {
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
    return this.handleProxy('billing', req, res);
  }

  /**
   * 余额服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('balance/*path')
  async proxyBalance(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
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
   * SMS 短信验证码服务路由 (sms-receive-service)
   * 处理短信验证码接收、查询、号码池管理等功能
   */
  @UseGuards(JwtAuthGuard)
  @All('sms')
  async proxySmsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('sms-receive-service', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('sms/*path')
  async proxySms(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('sms-receive-service', req, res);
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
   * 设备模板服务路由 - 特定路由（必须在通用 /templates 路由之前）
   * GET /templates/popular - 获取热门设备模板
   * GET /templates/stats - 获取设备模板统计
   * POST /templates/:id/create-device - 从模板创建设备
   * POST /templates/:id/batch-create - 批量创建设备
   */
  @UseGuards(JwtAuthGuard)
  @All('templates/popular')
  async proxyDeviceTemplatesPopular(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('templates/stats')
  async proxyDeviceTemplatesStats(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('templates/:id/create-device')
  async proxyDeviceTemplatesCreateDevice(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('templates/:id/batch-create')
  async proxyDeviceTemplatesBatchCreate(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 设备模板服务路由 - 通用路由
   * GET/POST/PATCH/DELETE /templates
   * 所有 /templates 请求都路由到 device-service
   */
  @UseGuards(JwtAuthGuard)
  @All('templates')
  async proxyTemplatesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('templates/*path')
  async proxyTemplates(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 通知模板服务路由 - 使用独立路径避免冲突
   * GET/POST/PATCH/DELETE /notification-templates
   */
  @UseGuards(JwtAuthGuard)
  @All('notification-templates')
  async proxyNotificationTemplatesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('notification-templates/*path')
  async proxyNotificationTemplates(@Req() req: Request, @Res() res: Response) {
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

  // ============================================================================
  // P0 高优先级路由 - 核心功能缺失路由补全
  // ============================================================================

  /**
   * 帮助中心路由 (精确匹配)
   * 当前回退到 notification-service 处理
   * 未来可创建独立的 help-service 提供更完善的帮助文档功能
   */
  @UseGuards(JwtAuthGuard)
  @All('help')
  async proxyHelpExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('help/*path')
  async proxyHelp(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  /**
   * 数据导出路由 (精确匹配)
   * 当前回退到 billing-service 处理（账单导出等）
   * 未来可创建独立的 export-service 提供统一导出功能
   */
  @UseGuards(JwtAuthGuard)
  @All('export')
  async proxyExportExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('export/*path')
  async proxyExport(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 营销活动路由 (精确匹配)
   * 路由到 billing-service 处理营销相关功能
   */
  @UseGuards(JwtAuthGuard)
  @All('activities')
  async proxyActivitiesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('activities/*path')
  async proxyActivities(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 优惠券路由 (精确匹配)
   * 路由到 billing-service 处理优惠券功能
   */
  @UseGuards(JwtAuthGuard)
  @All('coupons')
  async proxyCouponsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('coupons/*path')
  async proxyCoupons(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 邀请返利路由 (精确匹配)
   * 路由到 billing-service 处理邀请返利功能
   */
  @UseGuards(JwtAuthGuard)
  @All('referral')
  async proxyReferralExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('referral/*path')
  async proxyReferral(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 审计日志增强路由 (精确匹配)
   * 路由到 user-service 的审计日志模块
   */
  @UseGuards(JwtAuthGuard)
  @All('logs/audit')
  async proxyLogsAuditExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('logs/audit/*path')
  async proxyLogsAudit(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 设备提供商管理路由 (精确匹配)
   * 路由到 device-service 的多提供商管理模块
   */
  @UseGuards(JwtAuthGuard)
  @All('admin/providers')
  async proxyProvidersExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('admin/providers/*path')
  async proxyProviders(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 资源管理路由 (精确匹配) - GPU等资源
   * 路由到 device-service 的资源管理模块
   */
  @UseGuards(JwtAuthGuard)
  @All('resources')
  async proxyResourcesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('resources/*path')
  async proxyResources(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  // ============================================================================
  // P1 中优先级路由 - 重要功能增强
  // ============================================================================

  /**
   * 网络策略路由 (精确匹配)
   * 路由到 device-service 的网络策略模块
   */
  @UseGuards(JwtAuthGuard)
  @All('network-policy')
  async proxyNetworkPolicyExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('network-policy/*path')
  async proxyNetworkPolicy(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * Prometheus 监控路由 (精确匹配)
   * 当前回退到 device-service 获取设备监控指标
   * 未来可创建独立的 monitoring-service 聚合所有服务监控数据
   */
  @UseGuards(JwtAuthGuard)
  @All('prometheus')
  async proxyPrometheusExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('prometheus/*path')
  async proxyPrometheus(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 通知偏好路由 (精确匹配)
   * 路由到 notification-service 的用户偏好模块
   */
  @UseGuards(JwtAuthGuard)
  @All('notification-preferences')
  async proxyNotificationPreferencesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('notification-preferences/*path')
  async proxyNotificationPreferences(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  // ============================================================================
  // Proxy Service 路由 - 代理服务（IP代理、设备代理管理）
  // ============================================================================

  /**
   * Proxy 服务路由 (精确匹配)
   * 路由到 proxy-service 处理代理相关功能
   * 包括: audit-logs, geo, reports, cost, sessions, alerts, device-groups, providers
   */
  @UseGuards(JwtAuthGuard)
  @All('proxy')
  async proxyProxyServiceExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('proxy-service', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('proxy/*path')
  async proxyProxyService(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('proxy-service', req, res);
  }

  // ============================================================================
  // P0 紧急补充路由 - 前端调用但之前缺失的路由
  // ============================================================================

  /**
   * API日志路由 (精确匹配)
   * 路由到 user-service 的日志模块
   * 注意：使用 api-logs 避免与 logs/audit 路由冲突
   */
  @UseGuards(JwtAuthGuard)
  @All('api-logs')
  async proxyApiLogsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('api-logs/*path')
  async proxyApiLogs(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 消息管理路由 (精确匹配)
   * 路由到 notification-service 的消息模块
   */
  @UseGuards(JwtAuthGuard)
  @All('messages')
  async proxyMessagesExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('messages/*path')
  async proxyMessages(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  /**
   * WebRTC信令路由 (精确匹配)
   * 路由到 media-service 的WebRTC模块
   */
  @UseGuards(JwtAuthGuard)
  @All('webrtc')
  async proxyWebrtcExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('media', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('webrtc/*path')
  async proxyWebrtc(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('media', req, res);
  }

  // ============================================================================
  // CMS 内容管理系统路由 - 官网内容管理
  // ============================================================================

  /**
   * CMS 设置路由 (公开访问)
   * GET /cms/settings - 官网获取网站设置（Logo、联系方式等）
   */
  @Public()
  @All('cms/settings')
  async proxyCmsSettingsPublic(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * CMS 内容路由 (公开访问)
   * GET /cms/contents - 官网获取页面内容
   */
  @Public()
  @All('cms/contents')
  async proxyCmsContentsPublic(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * CMS 职位路由 (公开访问)
   * GET /cms/jobs - 官网获取招聘职位
   */
  @Public()
  @All('cms/jobs')
  async proxyCmsJobsPublic(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * CMS 法律文档路由 (公开访问)
   * GET /cms/legal - 官网获取法律文档
   * GET /cms/legal/:type - 获取指定类型法律文档
   */
  @Public()
  @All('cms/legal')
  async proxyCmsLegalPublic(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  @Public()
  @All('cms/legal/*path')
  async proxyCmsLegalPathPublic(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * CMS 客户案例路由 (公开访问)
   * GET /cms/cases - 官网获取客户案例
   */
  @Public()
  @All('cms/cases')
  async proxyCmsCasesPublic(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * CMS 定价方案路由 (公开访问)
   * GET /cms/pricing - 官网获取定价方案
   */
  @Public()
  @All('cms/pricing')
  async proxyCmsPricingPublic(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * CMS 管理路由 (需要认证)
   * 包括: 设置管理、内容管理、职位管理、案例管理、定价管理等
   * 所有 /cms/* 下的管理操作（POST/PUT/DELETE）
   */
  @UseGuards(JwtAuthGuard)
  @All('cms')
  async proxyCmsExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('cms/*path')
  async proxyCms(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  // ============================================================================
  // LiveChat 在线客服服务路由
  // ============================================================================

  /**
   * LiveChat 服务统一路由 (精确匹配)
   * 所有路由使用 /livechat/* 前缀，明确区分服务归属
   *
   * 路由示例:
   * - /livechat/chat/*        - 会话管理
   * - /livechat/agents/*      - 客服管理
   * - /livechat/queues/*      - 排队管理
   * - /livechat/ai/*          - AI 智能客服
   * - /livechat/analytics/*   - 统计分析
   * - /livechat/quality/*     - 质检管理
   * - /livechat/archives/*    - 归档管理
   * - /livechat/device-assist/* - 设备协助
   * - /livechat/tickets/*     - 会话转工单
   * - /livechat/media/*       - 媒体上传
   */
  @UseGuards(JwtAuthGuard)
  @All('livechat')
  async proxyLivechatExact(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('livechat', req, res);
  }

  @UseGuards(JwtAuthGuard)
  @All('livechat/*path')
  async proxyLivechat(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('livechat', req, res);
  }

  /**
   * 通用代理处理方法
   */
  private async handleProxy(serviceName: string, req: Request, res: Response): Promise<void> {
    return await this.tracer.startActiveSpan(
      'gateway.proxy_request',
      {
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'gateway.target_service': serviceName,
        },
      },
      async (span) => {
        try {
          // 构建目标路径
          const urlParts = req.url.split('?');
          const pathParts = urlParts[0].split('/').filter((p) => p);

          // 前端通过 Vite/Nginx 代理时已 rewrite 移除 /api 前缀
          // 直接转发路径到后端服务
          const targetPath = `/${pathParts.join('/')}`;

          // 获取 Request ID
          const reqWithUser = req as RequestWithUser;
          const requestId = reqWithUser.requestId || 'unknown';

          // 添加追踪属性
          span.setAttributes({
            'http.target_path': targetPath,
            'http.request_id': requestId,
            'user.id': reqWithUser.user?.id || 'anonymous',
            'user.username': reqWithUser.user?.username || 'anonymous',
            'user.tenant_id': reqWithUser.user?.tenantId || 'none',
          });

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

          // 记录响应状态
          span.setAttributes({
            'http.status_code': 200,
            'proxy.success': true,
          });
          span.setStatus({ code: SpanStatusCode.OK });

          // 返回结果
          res.status(200).json(result);
        } catch (error) {
          this.logger.error(`Proxy error: ${error.message}`, error.stack);

          // 记录错误
          span.recordException(error);

          // 处理错误响应
          if (error instanceof HttpException) {
            const status = error.getStatus();
            const response = error.getResponse();

            span.setAttributes({
              'http.status_code': status,
              'proxy.success': false,
              'error.type': 'HttpException',
            });
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

            res.status(status).json(response);
          } else {
            span.setAttributes({
              'http.status_code': HttpStatus.INTERNAL_SERVER_ERROR,
              'proxy.success': false,
              'error.type': 'InternalError',
            });
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              message: '网关内部错误',
              timestamp: new Date().toISOString(),
            });
          }
        } finally {
          span.end();
        }
      }
    );
  }
}
