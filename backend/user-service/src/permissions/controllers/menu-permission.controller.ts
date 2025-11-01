import { Controller, Get, Param, Query, UseGuards, Request, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MenuPermissionService } from '../menu-permission.service';
import { PermissionCacheService } from '../permission-cache.service';
import { EnhancedPermissionsGuard } from '../guards/enhanced-permissions.guard';
import { RequirePermissions, SkipPermission } from '../decorators';

/**
 * 菜单权限控制器
 * 提供菜单树和权限列表 API
 */
@Controller('menu-permissions')
@UseGuards(AuthGuard('jwt'), EnhancedPermissionsGuard)
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
  @SkipPermission()
  async getMyMenus(@Request() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      return {
        success: false,
        message: '未登录',
      };
    }

    const menus = await this.menuPermissionService.getUserMenus(userId);

    return {
      success: true,
      data: menus,
    };
  }

  /**
   * 获取当前用户的所有权限
   */
  @Get('my-permissions')
  @SkipPermission()
  async getMyPermissions(@Request() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      this.logger.warn('Unauthorized access attempt to my-permissions endpoint');
      return {
        success: false,
        message: '未登录',
      };
    }

    this.logger.debug(`Fetching permissions for user: ${userId}`);
    const permissions = await this.menuPermissionService.getUserPermissionNames(userId);

    return {
      success: true,
      data: permissions,
    };
  }

  /**
   * 检查当前用户是否有特定菜单的访问权限
   */
  @Get('check-menu-access')
  @SkipPermission()
  async checkMenuAccess(@Query('path') path: string, @Request() req: any) {
    const userId = req.user?.id;

    if (!userId || !path) {
      return {
        success: false,
        message: '参数错误',
      };
    }

    const hasAccess = await this.menuPermissionService.checkMenuAccess(userId, path);

    return {
      success: true,
      data: { hasAccess },
    };
  }

  /**
   * 获取完整菜单树（管理员用）
   */
  @Get('all-menus')
  @RequirePermissions('permission:menu:list')
  getAllMenus() {
    const menus = this.menuPermissionService.getAllMenus();

    return {
      success: true,
      data: menus,
    };
  }

  /**
   * 获取指定用户的菜单
   */
  @Get('user/:userId/menus')
  @RequirePermissions('permission:menu:view')
  async getUserMenus(@Param('userId') userId: string) {
    const menus = await this.menuPermissionService.getUserMenus(userId);

    return {
      success: true,
      data: menus,
    };
  }

  /**
   * 获取指定用户的权限列表
   */
  @Get('user/:userId/permissions')
  @RequirePermissions('permission:view')
  async getUserPermissions(@Param('userId') userId: string) {
    const permissions = await this.menuPermissionService.getUserPermissionNames(userId);

    return {
      success: true,
      data: permissions,
    };
  }

  /**
   * 构建面包屑导航
   */
  @Get('breadcrumb')
  @SkipPermission()
  getBreadcrumb(@Query('path') path: string) {
    if (!path) {
      return {
        success: false,
        message: '路径参数不能为空',
      };
    }

    const breadcrumb = this.menuPermissionService.buildBreadcrumb(path);

    return {
      success: true,
      data: breadcrumb,
    };
  }

  /**
   * 刷新用户权限缓存
   */
  @Get('cache/refresh/:userId')
  @RequirePermissions('permission:cache:manage')
  async refreshUserCache(@Param('userId') userId: string) {
    this.permissionCacheService.invalidateCache(userId);
    await this.permissionCacheService.loadAndCacheUserPermissions(userId);

    return {
      success: true,
      message: '用户权限缓存已刷新',
    };
  }

  /**
   * 清空所有权限缓存
   */
  @Get('cache/clear-all')
  @RequirePermissions('permission:cache:manage')
  clearAllCache() {
    this.permissionCacheService.invalidateCache();

    return {
      success: true,
      message: '所有权限缓存已清空',
    };
  }

  /**
   * 获取缓存统计信息
   */
  @Get('cache/stats')
  @RequirePermissions('permission:cache:view')
  getCacheStats() {
    const stats = this.permissionCacheService.getCacheStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * 预热活跃用户缓存
   */
  @Get('cache/warmup')
  @RequirePermissions('permission:cache:manage')
  async warmupCache(@Query('limit') limit?: number) {
    const warmupLimit = limit ? parseInt(String(limit), 10) : 100;
    await this.permissionCacheService.warmupActiveUsersCache(warmupLimit);

    return {
      success: true,
      message: `已预热 ${warmupLimit} 个活跃用户的权限缓存`,
    };
  }

  /**
   * 导出缓存数据（调试用）
   */
  @Get('cache/export')
  @RequirePermissions('permission:cache:view')
  exportCache() {
    const cacheData = this.permissionCacheService.exportCache();

    return {
      success: true,
      data: cacheData,
      total: cacheData.length,
    };
  }
}
