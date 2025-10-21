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
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { lastValueFrom } from 'rxjs';

@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private readonly proxyService: ProxyService) {}

  /**
   * 健康检查端点（公开访问）- 聚合所有微服务健康状态
   */
  @Public()
  @All('health')
  async healthCheck() {
    const services = await this.proxyService.checkServicesHealth();
    const allHealthy = Object.values(services).every(
      (s: any) => s.status === 'healthy',
    );

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
   * 用户服务路由
   */
  @UseGuards(JwtAuthGuard)
  @All('users/*')
  async proxyUsers(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 角色服务路由
   */
  @UseGuards(JwtAuthGuard)
  @All('roles/*')
  async proxyRoles(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('users', req, res);
  }

  /**
   * 权限服务路由
   */
  @UseGuards(JwtAuthGuard)
  @All('permissions/*')
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
   * 数据权限服务路由（通配符）
   */
  @UseGuards(JwtAuthGuard)
  @All('data-scopes/*')
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
  @All('field-permissions/*')
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
  @All('menu-permissions/*')
  async proxyMenuPermissions(@Req() req: Request, @Res() res: Response) {
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
  @All('notifications/*')
  async proxyNotifications(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('notifications', req, res);
  }

  /**
   * 设备服务路由
   */
  @UseGuards(JwtAuthGuard)
  @All('devices/*')
  async proxyDevices(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('devices', req, res);
  }

  /**
   * 应用服务路由
   */
  @UseGuards(JwtAuthGuard)
  @All('apps/*')
  async proxyApps(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('apps', req, res);
  }

  /**
   * 调度服务路由
   */
  @UseGuards(JwtAuthGuard)
  @All('scheduler/*')
  async proxyScheduler(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('scheduler', req, res);
  }

  /**
   * 计费服务路由
   */
  @UseGuards(JwtAuthGuard)
  @All('billing/*')
  async proxyBilling(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 流媒体服务路由（WebRTC 相关）
   */
  @UseGuards(JwtAuthGuard)
  @All('media/*')
  async proxyMedia(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('media', req, res);
  }

  /**
   * 统计服务路由
   */
  @UseGuards(JwtAuthGuard)
  @All('stats/*')
  async proxyStats(@Req() req: Request, @Res() res: Response) {
    // Stats are aggregated from multiple services, route to billing service for now
    return this.handleProxy('billing', req, res);
  }

  /**
   * 报表服务路由
   */
  @UseGuards(JwtAuthGuard)
  @All('reports/*')
  async proxyReports(@Req() req: Request, @Res() res: Response) {
    return this.handleProxy('billing', req, res);
  }

  /**
   * 通用代理处理方法
   */
  private async handleProxy(
    serviceName: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      // 构建目标路径（移除服务名前缀，但保留其他部分）
      const urlParts = req.url.split('?');
      const pathParts = urlParts[0].split('/').filter((p) => p);

      // 移除 'api' 前缀（如果存在）
      if (pathParts[0] === 'api') {
        pathParts.shift();
      }

      // 对于 users 服务，保留完整路径
      let targetPath: string;
      if (serviceName === 'users') {
        targetPath = '/' + pathParts.join('/');
      } else {
        // 对于其他服务，保留服务名后的路径
        const serviceIndex = pathParts.findIndex((p) =>
          ['devices', 'apps', 'scheduler', 'billing', 'media', 'roles', 'permissions', 'data-scopes', 'field-permissions', 'menu-permissions', 'notifications', 'stats', 'reports'].includes(p),
        );
        if (serviceIndex !== -1) {
          targetPath = '/' + pathParts.slice(serviceIndex).join('/');
        } else {
          targetPath = '/' + pathParts.join('/');
        }
      }

      // 添加查询参数
      if (urlParts[1]) {
        targetPath += '?' + urlParts[1];
      }

      this.logger.debug(
        `Routing ${req.method} ${req.url} -> ${serviceName}${targetPath}`,
      );

      // 转发请求到目标服务
      const result$ = this.proxyService.proxyRequest(
        serviceName,
        targetPath,
        req.method,
        req.body,
        {
          ...req.headers,
          // 注入用户信息（从 JWT 中提取）
          'x-user-id': (req as any).user?.id,
          'x-user-tenant': (req as any).user?.tenantId,
          // Base64 编码角色数组，避免 HTTP 头中的非法字符
          'x-user-roles': Buffer.from(JSON.stringify((req as any).user?.roles || [])).toString('base64'),
        },
        req.query,
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
