import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Menu } from '../entities/menu.entity';

/**
 * 菜单项
 */
export interface MenuItem {
  id: string;
  name: string;
  path: string;
  icon?: string;
  component?: string;
  permission?: string;
  children?: MenuItem[];
  meta?: {
    title: string;
    requiresAuth?: boolean;
    hidden?: boolean;
    order?: number;
    [key: string]: any;
  };
}

/**
 * 菜单权限服务
 * 负责根据用户权限生成菜单结构
 */
@Injectable()
export class MenuPermissionService {
  private readonly logger = new Logger(MenuPermissionService.name);

  // 完整菜单配置（应该从配置文件或数据库加载）
  private readonly ALL_MENUS: MenuItem[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      path: '/dashboard',
      icon: 'DashboardOutlined',
      permission: 'system:dashboard:view',
      meta: { title: '仪表盘', order: 1 },
    },
    {
      id: 'devices',
      name: 'Devices',
      path: '/devices',
      icon: 'MobileOutlined',
      permission: 'device:list',
      meta: { title: '设备管理', order: 2 },
      children: [
        {
          id: 'device-list',
          name: 'DeviceList',
          path: '/devices/list',
          permission: 'device:list',
          meta: { title: '设备列表' },
        },
        {
          id: 'device-templates',
          name: 'DeviceTemplates',
          path: '/devices/templates',
          permission: 'device:template:list',
          meta: { title: '设备模板' },
        },
        {
          id: 'device-groups',
          name: 'DeviceGroups',
          path: '/devices/groups',
          permission: 'device:group:list',
          meta: { title: '设备分组' },
        },
      ],
    },
    {
      id: 'users',
      name: 'Users',
      path: '/users',
      icon: 'UserOutlined',
      permission: 'user:list',
      meta: { title: '用户管理', order: 3 },
      children: [
        {
          id: 'user-list',
          name: 'UserList',
          path: '/users/list',
          permission: 'user:list',
          meta: { title: '用户列表' },
        },
        {
          id: 'role-list',
          name: 'RoleList',
          path: '/users/roles',
          permission: 'role:list',
          meta: { title: '角色管理' },
        },
        {
          id: 'permission-list',
          name: 'PermissionList',
          path: '/users/permissions',
          permission: 'permission:list',
          meta: { title: '权限管理' },
        },
      ],
    },
    {
      id: 'apps',
      name: 'Apps',
      path: '/apps',
      icon: 'AppstoreOutlined',
      permission: 'app:list',
      meta: { title: '应用管理', order: 4 },
      children: [
        {
          id: 'app-list',
          name: 'AppList',
          path: '/apps/list',
          permission: 'app:list',
          meta: { title: '应用列表' },
        },
        {
          id: 'app-store',
          name: 'AppStore',
          path: '/apps/store',
          permission: 'app:store:view',
          meta: { title: '应用商店' },
        },
      ],
    },
    {
      id: 'billing',
      name: 'Billing',
      path: '/billing',
      icon: 'DollarOutlined',
      permission: 'billing:view',
      meta: { title: '计费管理', order: 5 },
      children: [
        {
          id: 'billing-overview',
          name: 'BillingOverview',
          path: '/billing/overview',
          permission: 'billing:view',
          meta: { title: '计费概览' },
        },
        {
          id: 'billing-plans',
          name: 'BillingPlans',
          path: '/billing/plans',
          permission: 'billing:plan:list',
          meta: { title: '套餐管理' },
        },
        {
          id: 'billing-transactions',
          name: 'BillingTransactions',
          path: '/billing/transactions',
          permission: 'billing:transaction:list',
          meta: { title: '交易记录' },
        },
        {
          id: 'billing-invoices',
          name: 'BillingInvoices',
          path: '/billing/invoices',
          permission: 'billing:invoice:list',
          meta: { title: '发票管理' },
        },
      ],
    },
    {
      id: 'analytics',
      name: 'Analytics',
      path: '/analytics',
      icon: 'BarChartOutlined',
      permission: 'analytics:view',
      meta: { title: '数据分析', order: 6 },
    },
    {
      id: 'system',
      name: 'System',
      path: '/system',
      icon: 'SettingOutlined',
      permission: 'system:view',
      meta: { title: '系统设置', order: 99 },
      children: [
        {
          id: 'system-settings',
          name: 'SystemSettings',
          path: '/system/settings',
          permission: 'system:settings:manage',
          meta: { title: '系统配置' },
        },
        {
          id: 'system-logs',
          name: 'SystemLogs',
          path: '/system/logs',
          permission: 'system:logs:view',
          meta: { title: '系统日志' },
        },
        {
          id: 'audit-logs',
          name: 'AuditLogs',
          path: '/system/audit',
          permission: 'system:audit:view',
          meta: { title: '审计日志' },
        },
      ],
    },
  ];

  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>
  ) {}

  /**
   * 获取用户菜单
   * @param userId 用户ID
   * @returns 用户有权访问的菜单列表
   */
  async getUserMenus(userId: string): Promise<MenuItem[]> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles'],
      });

      if (!user) {
        return [];
      }

      // 超级管理员返回所有菜单
      if (user.isSuperAdmin) {
        return this.sortMenus(this.ALL_MENUS);
      }

      // 获取用户权限
      const permissions = await this.getUserPermissions(user);
      const permissionNames = permissions.map((p) => p.name);

      // 过滤菜单
      const filteredMenus = this.filterMenusByPermissions(this.ALL_MENUS, permissionNames);

      return this.sortMenus(filteredMenus);
    } catch (error) {
      this.logger.error(`获取用户菜单失败: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 获取用户的所有权限名称
   * @param userId 用户ID
   * @returns 权限名称列表
   */
  async getUserPermissionNames(userId: string): Promise<string[]> {
    try {
      this.logger.debug(`[getUserPermissionNames] 开始查询 - userId: ${userId}`);

      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles'],
      });

      if (!user) {
        this.logger.warn(`[getUserPermissionNames] 用户不存在 - userId: ${userId}`);
        return [];
      }

      this.logger.debug(`[getUserPermissionNames] 找到用户: ${user.username}, isSuperAdmin: ${user.isSuperAdmin}`);

      // 超级管理员拥有所有权限
      if (user.isSuperAdmin) {
        this.logger.debug(`[getUserPermissionNames] 超级管理员，返回通配符权限`);
        return ['*'];
      }

      this.logger.debug(`[getUserPermissionNames] 调用 getUserPermissions() 获取权限...`);
      const permissions = await this.getUserPermissions(user);
      const permissionNames = permissions.map((p) => p.name);

      this.logger.debug(`[getUserPermissionNames] 返回 ${permissionNames.length} 个权限名称`);

      return permissionNames;
    } catch (error) {
      this.logger.error(`获取用户权限列表失败: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 检查用户是否有菜单访问权限
   * @param userId 用户ID
   * @param menuPath 菜单路径
   * @returns 是否有权限
   */
  async checkMenuAccess(userId: string, menuPath: string): Promise<boolean> {
    const menu = this.findMenuByPath(this.ALL_MENUS, menuPath);
    if (!menu || !menu.permission) {
      return true; // 无需权限的菜单
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      return false;
    }

    // 超级管理员拥有所有权限
    if (user.isSuperAdmin) {
      return true;
    }

    const permissions = await this.getUserPermissions(user);
    return permissions.some((p) => p.name === menu.permission && p.isActive);
  }

  /**
   * 获取菜单树（包含权限信息）
   * @returns 完整菜单树
   */
  getAllMenus(): MenuItem[] {
    return this.sortMenus(this.ALL_MENUS);
  }

  /**
   * 根据路径查找菜单
   * @param menus 菜单列表
   * @param path 路径
   * @returns 菜单项
   */
  private findMenuByPath(menus: MenuItem[], path: string): MenuItem | null {
    for (const menu of menus) {
      if (menu.path === path) {
        return menu;
      }
      if (menu.children) {
        const found = this.findMenuByPath(menu.children, path);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * 获取用户的所有权限
   */
  private async getUserPermissions(user: User): Promise<Permission[]> {
    // 🔍 调试日志：检查用户角色
    this.logger.debug(`[getUserPermissions] 开始查询用户权限 - userId: ${user.id}, username: ${user.username}`);
    this.logger.debug(`[getUserPermissions] user.roles 是否存在: ${!!user.roles}`);
    this.logger.debug(`[getUserPermissions] user.roles 长度: ${user.roles?.length || 0}`);

    if (!user.roles || user.roles.length === 0) {
      this.logger.warn(`[getUserPermissions] 用户 ${user.username} 没有角色信息`);
      return [];
    }

    const roleIds = user.roles.map((r) => r.id);
    this.logger.debug(`[getUserPermissions] 角色IDs: ${JSON.stringify(roleIds)}`);
    this.logger.debug(`[getUserPermissions] 角色名称: ${user.roles.map(r => r.name).join(', ')}`);

    const roles = await this.roleRepository.find({
      where: { id: In(roleIds) },
      relations: ['permissions'],
    });

    this.logger.debug(`[getUserPermissions] 从数据库查询到 ${roles.length} 个角色`);

    roles.forEach((role, index) => {
      this.logger.debug(`[getUserPermissions] 角色[${index}] - name: ${role.name}, id: ${role.id}`);
      this.logger.debug(`[getUserPermissions] 角色[${index}] - permissions 是否存在: ${!!role.permissions}`);
      this.logger.debug(`[getUserPermissions] 角色[${index}] - permissions 长度: ${role.permissions?.length || 0}`);

      if (role.permissions && role.permissions.length > 0) {
        this.logger.debug(`[getUserPermissions] 角色[${index}] - 权限示例: ${role.permissions.slice(0, 3).map(p => p.name).join(', ')}`);
      }
    });

    // 合并所有角色的权限（去重）
    const permissionMap = new Map<string, Permission>();
    roles.forEach((role) => {
      role.permissions?.forEach((permission) => {
        permissionMap.set(permission.id, permission);
      });
    });

    const finalPermissions = Array.from(permissionMap.values());
    this.logger.debug(`[getUserPermissions] 最终合并后权限数量: ${finalPermissions.length}`);

    if (finalPermissions.length > 0) {
      this.logger.debug(`[getUserPermissions] 权限示例: ${finalPermissions.slice(0, 5).map(p => p.name).join(', ')}`);
    } else {
      this.logger.error(`[getUserPermissions] ⚠️ 警告：用户 ${user.username} 的角色在数据库中没有关联任何权限！`);
    }

    return finalPermissions;
  }

  /**
   * 根据权限过滤菜单
   */
  private filterMenusByPermissions(menus: MenuItem[], permissionNames: string[]): MenuItem[] {
    const filtered: MenuItem[] = [];

    for (const menu of menus) {
      // 检查菜单权限
      if (menu.permission && !permissionNames.includes(menu.permission)) {
        continue; // 无权访问此菜单
      }

      // 递归过滤子菜单
      const filteredChildren = menu.children
        ? this.filterMenusByPermissions(menu.children, permissionNames)
        : undefined;

      // 如果有子菜单但过滤后为空，跳过此菜单
      if (menu.children && (!filteredChildren || filteredChildren.length === 0)) {
        continue;
      }

      filtered.push({
        ...menu,
        children: filteredChildren,
      });
    }

    return filtered;
  }

  /**
   * 排序菜单
   */
  private sortMenus(menus: MenuItem[]): MenuItem[] {
    const sorted = [...menus].sort((a, b) => {
      const orderA = a.meta?.order ?? 999;
      const orderB = b.meta?.order ?? 999;
      return orderA - orderB;
    });

    // 递归排序子菜单
    return sorted.map((menu) => ({
      ...menu,
      children: menu.children ? this.sortMenus(menu.children) : undefined,
    }));
  }

  /**
   * 从数据库加载菜单配置
   */
  async loadMenusFromDatabase(): Promise<MenuItem[]> {
    const menus = await this.menuRepository.find({
      where: { isActive: true },
      order: { sort: 'ASC' },
    });

    if (menus.length === 0) {
      // 如果数据库中没有菜单，返回硬编码的默认菜单
      this.logger.warn('No menus found in database, using hardcoded menus');
      return this.ALL_MENUS;
    }

    return this.buildMenuTree(menus);
  }

  /**
   * 构建菜单树结构
   */
  private buildMenuTree(menus: Menu[]): MenuItem[] {
    const menuMap = new Map<string, MenuItem>();
    const rootMenus: MenuItem[] = [];

    // 转换为MenuItem格式
    menus.forEach((menu) => {
      menuMap.set(menu.id, {
        id: menu.code,
        name: menu.name,
        path: menu.path,
        icon: menu.icon,
        permission: menu.permissionCode,
        children: [],
        meta: {
          title: menu.name,
          hidden: !menu.visible,
          order: menu.sort,
          ...menu.metadata,
        },
      });
    });

    // 构建树结构
    menus.forEach((menu) => {
      const menuItem = menuMap.get(menu.id);
      if (!menuItem) return;

      if (menu.parentId && menuMap.has(menu.parentId)) {
        const parent = menuMap.get(menu.parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(menuItem);
        }
      } else {
        rootMenus.push(menuItem);
      }
    });

    return rootMenus;
  }

  /**
   * 构建面包屑导航
   * @param menuPath 当前菜单路径
   * @returns 面包屑路径
   */
  buildBreadcrumb(menuPath: string): MenuItem[] {
    const breadcrumb: MenuItem[] = [];
    this.findBreadcrumbPath(this.ALL_MENUS, menuPath, breadcrumb);
    return breadcrumb;
  }

  /**
   * 递归查找面包屑路径
   */
  private findBreadcrumbPath(
    menus: MenuItem[],
    targetPath: string,
    breadcrumb: MenuItem[]
  ): boolean {
    for (const menu of menus) {
      breadcrumb.push(menu);

      if (menu.path === targetPath) {
        return true;
      }

      if (menu.children) {
        if (this.findBreadcrumbPath(menu.children, targetPath, breadcrumb)) {
          return true;
        }
      }

      breadcrumb.pop();
    }

    return false;
  }
}
