import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MenuPermissionService, MenuItem } from './menu-permission.service';
import { Permission } from '../entities/permission.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Menu } from '../entities/menu.entity';
import { createMockRepository } from '@cloudphone/shared/testing';

describe('MenuPermissionService', () => {
  let service: MenuPermissionService;
  let permissionRepository: ReturnType<typeof createMockRepository>;
  let userRepository: ReturnType<typeof createMockRepository>;
  let roleRepository: ReturnType<typeof createMockRepository>;
  let menuRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    permissionRepository = createMockRepository();
    userRepository = createMockRepository();
    roleRepository = createMockRepository();
    menuRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuPermissionService,
        {
          provide: getRepositoryToken(Permission),
          useValue: permissionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: roleRepository,
        },
        {
          provide: getRepositoryToken(Menu),
          useValue: menuRepository,
        },
      ],
    }).compile();

    service = module.get<MenuPermissionService>(MenuPermissionService);
  });

  beforeEach(() => {
    permissionRepository.find.mockClear();
    userRepository.findOne.mockClear();
    roleRepository.find.mockClear();
    menuRepository.find.mockClear();
  });

  describe('getUserMenus', () => {
    it('应该对超级管理员返回所有菜单', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserMenus(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      // 验证菜单按顺序排序
      expect(result[0].meta?.order).toBeLessThanOrEqual(
        result[1]?.meta?.order ?? 999,
      );
    });

    it('应该根据权限过滤菜单', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockRole = {
        id: 'role-123',
        permissions: [
          {
            id: 'perm-1',
            name: 'system:dashboard:view',
            isActive: true,
          },
          {
            id: 'perm-2',
            name: 'device:list',
            isActive: true,
          },
        ],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.getUserMenus(userId);

      // Assert
      expect(result).toBeDefined();
      // 应该包含 dashboard 和 devices
      const menuIds = result.map((m) => m.id);
      expect(menuIds).toContain('dashboard');
      expect(menuIds).toContain('devices');
      // 不应该包含无权限的菜单（如 users, billing）
      expect(menuIds).not.toContain('users');
      expect(menuIds).not.toContain('billing');
    });

    it('应该过滤没有权限的子菜单', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockRole = {
        id: 'role-123',
        permissions: [
          {
            id: 'perm-1',
            name: 'device:list',
            isActive: true,
          },
          // 注意：没有 device:template:list 权限
        ],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.getUserMenus(userId);

      // Assert
      const devicesMenu = result.find((m) => m.id === 'devices');
      expect(devicesMenu).toBeDefined();
      expect(devicesMenu?.children).toBeDefined();
      // 应该只包含 device-list，不包含 device-templates
      const childIds = devicesMenu?.children?.map((c) => c.id) || [];
      expect(childIds).toContain('device-list');
      expect(childIds).not.toContain('device-templates');
    });

    it('应该对用户不存在返回空数组', async () => {
      // Arrange
      const userId = 'nonexistent';

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getUserMenus(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it('应该对无角色用户返回空菜单', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserMenus(userId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getUserPermissionNames', () => {
    it('应该对超级管理员返回通配符', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.getUserPermissionNames(userId);

      // Assert
      expect(result).toEqual(['*']);
    });

    it('应该返回用户的所有权限名称', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockRole = {
        id: 'role-123',
        permissions: [
          { id: 'perm-1', name: 'device:list' },
          { id: 'perm-2', name: 'device:create' },
          { id: 'perm-3', name: 'device:update' },
        ],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.getUserPermissionNames(userId);

      // Assert
      expect(result).toContain('device:list');
      expect(result).toContain('device:create');
      expect(result).toContain('device:update');
      expect(result).toHaveLength(3);
    });

    it('应该合并多个角色的权限并去重', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-1' }, { id: 'role-2' }],
      };
      const mockRoles = [
        {
          id: 'role-1',
          permissions: [
            { id: 'perm-1', name: 'device:list' },
            { id: 'perm-2', name: 'device:create' },
          ],
        },
        {
          id: 'role-2',
          permissions: [
            { id: 'perm-1', name: 'device:list' }, // 重复
            { id: 'perm-3', name: 'user:list' },
          ],
        },
      ];

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue(mockRoles);

      // Act
      const result = await service.getUserPermissionNames(userId);

      // Assert
      expect(result).toHaveLength(3); // 去重后
      expect(result).toContain('device:list');
      expect(result).toContain('device:create');
      expect(result).toContain('user:list');
    });

    it('应该对用户不存在返回空数组', async () => {
      // Arrange
      const userId = 'nonexistent';

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getUserPermissionNames(userId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('checkMenuAccess', () => {
    it('应该对超级管理员返回 true', async () => {
      // Arrange
      const userId = 'user-123';
      const menuPath = '/devices';
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.checkMenuAccess(userId, menuPath);

      // Assert
      expect(result).toBe(true);
    });

    it('应该允许有权限的用户访问菜单', async () => {
      // Arrange
      const userId = 'user-123';
      const menuPath = '/devices';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockRole = {
        id: 'role-123',
        permissions: [
          {
            id: 'perm-1',
            name: 'device:list',
            isActive: true,
          },
        ],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.checkMenuAccess(userId, menuPath);

      // Assert
      expect(result).toBe(true);
    });

    it('应该拒绝无权限的用户访问菜单', async () => {
      // Arrange
      const userId = 'user-123';
      const menuPath = '/users';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockRole = {
        id: 'role-123',
        permissions: [
          {
            id: 'perm-1',
            name: 'device:list',
            isActive: true,
          },
        ],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.checkMenuAccess(userId, menuPath);

      // Assert
      expect(result).toBe(false);
    });

    it('应该允许访问不需要权限的菜单', async () => {
      // Arrange
      const userId = 'user-123';
      const menuPath = '/nonexistent-menu'; // 不存在的菜单
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.checkMenuAccess(userId, menuPath);

      // Assert
      expect(result).toBe(true); // 不存在的菜单默认允许
    });

    it('应该对用户不存在返回 false', async () => {
      // Arrange
      const userId = 'nonexistent';
      const menuPath = '/devices';

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.checkMenuAccess(userId, menuPath);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getAllMenus', () => {
    it('应该返回所有菜单（已排序）', () => {
      // Act
      const result = service.getAllMenus();

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      // 验证排序
      for (let i = 0; i < result.length - 1; i++) {
        const orderA = result[i].meta?.order ?? 999;
        const orderB = result[i + 1].meta?.order ?? 999;
        expect(orderA).toBeLessThanOrEqual(orderB);
      }
    });

    it('应该包含所有主要菜单', () => {
      // Act
      const result = service.getAllMenus();

      // Assert
      const menuIds = result.map((m) => m.id);
      expect(menuIds).toContain('dashboard');
      expect(menuIds).toContain('devices');
      expect(menuIds).toContain('users');
      expect(menuIds).toContain('apps');
      expect(menuIds).toContain('billing');
      expect(menuIds).toContain('system');
    });
  });

  describe('buildBreadcrumb', () => {
    it('应该为根菜单构建面包屑', () => {
      // Arrange
      const menuPath = '/dashboard';

      // Act
      const result = service.buildBreadcrumb(menuPath);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('dashboard');
    });

    it('应该为子菜单构建完整面包屑路径', () => {
      // Arrange
      const menuPath = '/devices/list';

      // Act
      const result = service.buildBreadcrumb(menuPath);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('devices');
      expect(result[1].id).toBe('device-list');
    });

    it('应该为深层子菜单构建面包屑', () => {
      // Arrange
      const menuPath = '/system/logs';

      // Act
      const result = service.buildBreadcrumb(menuPath);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('system');
      expect(result[1].id).toBe('system-logs');
    });

    it('应该对不存在的路径返回空数组', () => {
      // Arrange
      const menuPath = '/nonexistent/path';

      // Act
      const result = service.buildBreadcrumb(menuPath);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('loadMenusFromDatabase', () => {
    it('应该从数据库加载菜单', async () => {
      // Arrange
      const mockDbMenus = [
        {
          id: 'menu-1',
          code: 'dashboard',
          name: 'Dashboard',
          path: '/dashboard',
          icon: 'DashboardOutlined',
          permissionCode: 'system:dashboard:view',
          parentId: null,
          sort: 1,
          visible: true,
          isActive: true,
          metadata: {},
        },
        {
          id: 'menu-2',
          code: 'devices',
          name: 'Devices',
          path: '/devices',
          icon: 'MobileOutlined',
          permissionCode: 'device:list',
          parentId: null,
          sort: 2,
          visible: true,
          isActive: true,
          metadata: {},
        },
      ];

      menuRepository.find.mockResolvedValue(mockDbMenus);

      // Act
      const result = await service.loadMenusFromDatabase();

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('dashboard');
      expect(result[1].id).toBe('devices');
    });

    it('应该在数据库为空时返回默认菜单', async () => {
      // Arrange
      menuRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.loadMenusFromDatabase();

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      // 应该返回硬编码的默认菜单
      const menuIds = result.map((m) => m.id);
      expect(menuIds).toContain('dashboard');
    });

    it('应该正确构建父子关系', async () => {
      // Arrange
      const mockDbMenus = [
        {
          id: 'menu-1',
          code: 'devices',
          name: 'Devices',
          path: '/devices',
          icon: 'MobileOutlined',
          permissionCode: 'device:list',
          parentId: null,
          sort: 1,
          visible: true,
          isActive: true,
          metadata: {},
        },
        {
          id: 'menu-2',
          code: 'device-list',
          name: 'DeviceList',
          path: '/devices/list',
          icon: null,
          permissionCode: 'device:list',
          parentId: 'menu-1', // 父菜单
          sort: 1,
          visible: true,
          isActive: true,
          metadata: {},
        },
      ];

      menuRepository.find.mockResolvedValue(mockDbMenus);

      // Act
      const result = await service.loadMenusFromDatabase();

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(1); // 只有1个根菜单
      expect(result[0].id).toBe('devices');
      expect(result[0].children).toBeDefined();
      expect(result[0].children?.length).toBe(1);
      expect(result[0].children?.[0].id).toBe('device-list');
    });
  });
});
