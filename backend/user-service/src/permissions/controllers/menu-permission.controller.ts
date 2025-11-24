import { Controller, Get, Param, Query, UseGuards, Request, Logger, Req, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MenuPermissionService } from '../menu-permission.service';
import { PermissionCacheService } from '../permission-cache.service';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions, SkipPermission } from '../decorators';
import { AuthenticatedRequest } from '../types';

/**
 * 菜单权限控制器
 * 提供菜单树和权限列表 API
 */
@ApiTags('菜单权限管理')
@ApiBearerAuth()
@Controller('menu-permissions')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class MenuPermissionController {
  private readonly logger = new Logger(MenuPermissionController.name);

  constructor(
    private menuPermissionService: MenuPermissionService,
    private permissionCacheService: PermissionCacheService
  ) {}

  /**
   * 获取当前用户的菜单树
   * 根据用户权限自动过滤菜单
   */
  @Get('my-menus')
  @ApiOperation({
    summary: '获取当前用户的菜单树',
    description: '根据当前登录用户的权限自动过滤并返回可访问的菜单树结构'
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        data: [
          {
            id: 'dashboard',
            title: '仪表盘',
            path: '/dashboard',
            icon: 'DashboardOutlined',
            children: []
          },
          {
            id: 'devices',
            title: '设备管理',
            path: '/devices',
            icon: 'MobileOutlined',
            children: [
              { id: 'device-list', title: '设备列表', path: '/devices/list' },
              { id: 'device-create', title: '创建设备', path: '/devices/create' }
            ]
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 401, description: '未登录' })
  @SkipPermission()
  async getMyMenus(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.id;

    if (!userId) {
      return {
        success: false,
        message: '未登录',
      };
    }

    const menus = await this.menuPermissionService.getUserMenus(userId);

    return {
      data: menus,
    };
  }

  /**
   * 获取当前用户的所有权限
   */
  @Get('my-permissions')
  @ApiOperation({
    summary: '获取当前用户的所有权限',
    description: '返回当前登录用户拥有的所有权限标识列表，用于前端权限控制'
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        data: [
          'user:read',
          'user:create',
          'user:update',
          'device:read',
          'device:create',
          'device:control',
          'app:read',
          'billing:read'
        ]
      }
    }
  })
  @ApiResponse({ status: 401, description: '未登录' })
  @SkipPermission()
  async getMyPermissions(@Request() req: AuthenticatedRequest): Promise<string[]> {
    const userId = req.user?.id;

    if (!userId) {
      this.logger.warn('Unauthorized access attempt to my-permissions endpoint');
      throw new UnauthorizedException('未登录');
    }

    this.logger.debug(`Fetching permissions for user: ${userId}`);
    const permissions = await this.menuPermissionService.getUserPermissionNames(userId);

    // 直接返回权限数组，由 TransformInterceptor 统一包装为 { success: true, data: [...] }
    return permissions;
  }

  /**
   * 检查当前用户是否有特定菜单的访问权限
   */
  @Get('check-menu-access')
  @ApiOperation({
    summary: '检查菜单访问权限',
    description: '检查当前用户是否有权访问指定路径的菜单'
  })
  @ApiQuery({ name: 'path', description: '菜单路径', example: '/devices/list' })
  @ApiResponse({
    status: 200,
    description: '检查成功',
    schema: {
      example: {
        data: { hasAccess: true }
      }
    }
  })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 401, description: '未登录' })
  @SkipPermission()
  async checkMenuAccess(@Query('path') path: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user?.id;

    if (!userId || !path) {
      return {
        success: false,
        message: '参数错误',
      };
    }

    const hasAccess = await this.menuPermissionService.checkMenuAccess(userId, path);

    return {
      data: { hasAccess },
    };
  }

  /**
   * 获取完整菜单树（管理员用）
   */
  @Get('all-menus')
  @ApiOperation({
    summary: '获取完整菜单树',
    description: '获取系统所有菜单的完整树结构，不进行权限过滤，仅管理员可访问'
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        data: [
          {
            id: 'dashboard',
            title: '仪表盘',
            path: '/dashboard',
            icon: 'DashboardOutlined',
            requiredPermission: 'dashboard:view',
            children: []
          },
          {
            id: 'system',
            title: '系统管理',
            path: '/system',
            icon: 'SettingOutlined',
            children: [
              {
                id: 'user-management',
                title: '用户管理',
                path: '/system/users',
                requiredPermission: 'user:read'
              },
              {
                id: 'role-management',
                title: '角色管理',
                path: '/system/roles',
                requiredPermission: 'role:read'
              }
            ]
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:menu:list')
  async getAllMenus() {
    const menus = await this.menuPermissionService.getAllMenus();

    return {
      data: menus,
    };
  }

  /**
   * 获取指定用户的菜单
   */
  @Get('user/:userId/menus')
  @ApiOperation({
    summary: '获取指定用户的菜单树',
    description: '根据指定用户的权限获取其可访问的菜单树结构，用于管理员查看用户菜单'
  })
  @ApiParam({ name: 'userId', description: '用户ID', example: 'user-uuid-123' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        data: [
          {
            id: 'dashboard',
            title: '仪表盘',
            path: '/dashboard',
            children: []
          },
          {
            id: 'devices',
            title: '设备管理',
            path: '/devices',
            children: [
              { id: 'device-list', title: '设备列表', path: '/devices/list' }
            ]
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:menu:view')
  async getUserMenus(@Param('userId') userId: string) {
    const menus = await this.menuPermissionService.getUserMenus(userId);

    return {
      data: menus,
    };
  }

  /**
   * 获取指定用户的权限列表
   *
   * 安全规则：
   * 1. 用户可以查询自己的权限（userId == 当前用户）
   * 2. 管理员可以查询任何用户的权限（需要 permission:view 权限）
   */
  @Get('user/:userId/permissions')
  @SkipPermission()  // 使用自定义权限检查逻辑
  @ApiOperation({
    summary: '获取指定用户的权限列表',
    description: '获取指定用户拥有的所有权限标识列表。普通用户可以查询自己的权限，管理员可以查询任何用户的权限。'
  })
  @ApiParam({ name: 'userId', description: '用户ID', example: 'user-uuid-123' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        data: [
          'user:read',
          'user:create',
          'device:read',
          'device:create',
          'app:read'
        ]
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getUserPermissions(
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    const currentUser = req.user;

    // 检查访问权限：
    // 1. 用户查询自己的权限（允许）
    // 2. 管理员查询其他用户的权限（需要permission:view权限）
    if (currentUser.sub !== userId) {
      // 查询其他用户权限，需要管理员权限
      const userPermissions = await this.menuPermissionService.getUserPermissionNames(currentUser.sub);

      if (!userPermissions.includes('*') && !userPermissions.includes('permission:view')) {
        throw new ForbiddenException('无权查看其他用户的权限');
      }
    }

    const permissions = await this.menuPermissionService.getUserPermissionNames(userId);

    return {
      data: permissions,
    };
  }

  /**
   * 构建面包屑导航
   */
  @Get('breadcrumb')
  @ApiOperation({
    summary: '构建面包屑导航',
    description: '根据给定的页面路径构建面包屑导航路径'
  })
  @ApiQuery({ name: 'path', description: '页面路径', example: '/system/users' })
  @ApiResponse({
    status: 200,
    description: '构建成功',
    schema: {
      example: {
        data: [
          { title: '首页', path: '/' },
          { title: '系统管理', path: '/system' },
          { title: '用户管理', path: '/system/users' }
        ]
      }
    }
  })
  @ApiResponse({ status: 400, description: '路径参数不能为空' })
  @SkipPermission()
  async getBreadcrumb(@Query('path') path: string) {
    if (!path) {
      return {
        success: false,
        message: '路径参数不能为空',
      };
    }

    const breadcrumb = await this.menuPermissionService.buildBreadcrumb(path);

    return {
      data: breadcrumb,
    };
  }

  /**
   * 刷新用户权限缓存
   */
  @Get('cache/refresh/:userId')
  @ApiOperation({
    summary: '刷新用户权限缓存',
    description: '清除并重新加载指定用户的权限缓存，用于权限变更后立即生效'
  })
  @ApiParam({ name: 'userId', description: '用户ID', example: 'user-uuid-123' })
  @ApiResponse({
    status: 200,
    description: '刷新成功',
    schema: {
      example: {
        message: '用户权限缓存已刷新'
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:cache:manage')
  async refreshUserCache(@Param('userId') userId: string) {
    this.permissionCacheService.invalidateCache(userId);
    await this.permissionCacheService.loadAndCacheUserPermissions(userId);

    return {
      message: '用户权限缓存已刷新',
    };
  }

  /**
   * 清空所有权限缓存
   */
  @Get('cache/clear-all')
  @ApiOperation({
    summary: '清空所有权限缓存',
    description: '清空所有用户的权限缓存，用于全局权限配置变更或故障排查'
  })
  @ApiResponse({
    status: 200,
    description: '清空成功',
    schema: {
      example: {
        message: '所有权限缓存已清空'
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:cache:manage')
  clearAllCache() {
    this.permissionCacheService.invalidateCache();

    return {
      message: '所有权限缓存已清空',
    };
  }

  /**
   * 获取缓存统计信息
   */
  @Get('cache/stats')
  @ApiOperation({
    summary: '获取缓存统计信息',
    description: '获取权限缓存的统计信息，包括缓存命中率、大小等'
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        data: {
          totalCachedUsers: 250,
          cacheHitRate: 0.92,
          averageLoadTime: 5.3,
          cacheSize: '2.4 MB',
          lastWarmupTime: '2024-01-01T00:00:00Z'
        }
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:cache:view')
  getCacheStats() {
    const stats = this.permissionCacheService.getCacheStats();

    return {
      data: stats,
    };
  }

  /**
   * 预热活跃用户缓存
   */
  @Get('cache/warmup')
  @ApiOperation({
    summary: '预热活跃用户缓存',
    description: '预先加载指定数量活跃用户的权限数据到缓存，提升系统响应速度'
  })
  @ApiQuery({ name: 'limit', required: false, description: '预热用户数量', example: 100 })
  @ApiResponse({
    status: 200,
    description: '预热成功',
    schema: {
      example: {
        message: '已预热 100 个活跃用户的权限缓存'
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:cache:manage')
  async warmupCache(@Query('limit') limit?: number) {
    const warmupLimit = limit ? parseInt(String(limit), 10) : 100;
    await this.permissionCacheService.warmupActiveUsersCache(warmupLimit);

    return {
      message: `已预热 ${warmupLimit} 个活跃用户的权限缓存`,
    };
  }

  /**
   * 获取详细的缓存统计信息（调试用）
   */
  @Get('cache/stats-detail')
  @ApiOperation({
    summary: '获取详细的缓存统计信息',
    description: '获取更详细的缓存统计信息，包含调试信息，用于系统监控和故障排查'
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        data: {
          totalCachedUsers: 250,
          cacheHitRate: 0.92,
          averageLoadTime: 5.3,
          cacheSize: '2.4 MB',
          lastWarmupTime: '2024-01-01T00:00:00Z',
          cacheKeys: ['user:uuid-1', 'user:uuid-2'],
          memoryUsage: '24.5 MB',
          evictionCount: 15
        },
        message: '缓存统计信息获取成功'
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:cache:view')
  getCacheStatsDetail() {
    const stats = this.permissionCacheService.getCacheStats();

    return {
      data: stats,
      message: '缓存统计信息获取成功',
    };
  }

  /**
   * 导出缓存数据
   */
  @Get('cache/export')
  @ApiOperation({
    summary: '导出缓存数据',
    description: '导出所有用户的权限缓存数据，用于调试、备份或数据分析。返回的数据包含用户权限概览信息。'
  })
  @ApiResponse({
    status: 200,
    description: '导出成功',
    schema: {
      example: {
        data: {
          'user-uuid-1': {
            userId: 'user-uuid-1',
            tenantId: 'tenant-1',
            isSuperAdmin: false,
            rolesCount: 2,
            roles: ['admin', 'user'],
            permissionsCount: 15,
            permissions: ['user:read', 'user:create', 'device:read'],
            dataScopesCount: 3,
            fieldPermissionsCount: 5,
            cachedAt: '2024-01-01T00:00:00Z'
          },
          'user-uuid-2': {
            userId: 'user-uuid-2',
            tenantId: 'tenant-1',
            isSuperAdmin: true,
            rolesCount: 1,
            roles: ['super_admin'],
            permissionsCount: 1,
            permissions: ['*'],
            dataScopesCount: 0,
            fieldPermissionsCount: 0,
            cachedAt: '2024-01-01T00:00:00Z'
          }
        },
        message: '缓存数据导出成功'
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:cache:view')
  async exportCacheData() {
    const cacheData = await this.permissionCacheService.exportCache();

    return {
      data: cacheData,
      message: '缓存数据导出成功',
    };
  }
}
