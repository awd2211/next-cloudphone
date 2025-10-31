import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PermissionCheckerService } from './permission-checker.service';
import { Permission, DataScopeType } from '../entities/permission.entity';
import { DataScope, ScopeType } from '../entities/data-scope.entity';
import {
  FieldPermission,
  FieldAccessLevel,
  OperationType,
} from '../entities/field-permission.entity';
import { User, UserStatus } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { createMockRepository } from '@cloudphone/shared/testing';

describe('PermissionCheckerService', () => {
  let service: PermissionCheckerService;
  let permissionRepository: ReturnType<typeof createMockRepository>;
  let dataScopeRepository: ReturnType<typeof createMockRepository>;
  let fieldPermissionRepository: ReturnType<typeof createMockRepository>;
  let userRepository: ReturnType<typeof createMockRepository>;
  let roleRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    permissionRepository = createMockRepository();
    dataScopeRepository = createMockRepository();
    fieldPermissionRepository = createMockRepository();
    userRepository = createMockRepository();
    roleRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionCheckerService,
        {
          provide: getRepositoryToken(Permission),
          useValue: permissionRepository,
        },
        {
          provide: getRepositoryToken(DataScope),
          useValue: dataScopeRepository,
        },
        {
          provide: getRepositoryToken(FieldPermission),
          useValue: fieldPermissionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: roleRepository,
        },
      ],
    }).compile();

    service = module.get<PermissionCheckerService>(PermissionCheckerService);
  });

  beforeEach(() => {
    // Clear all mocks before each test
    permissionRepository.findOne.mockClear();
    permissionRepository.find.mockClear();
    dataScopeRepository.find.mockClear();
    fieldPermissionRepository.find.mockClear();
    userRepository.findOne.mockClear();
    roleRepository.find.mockClear();
  });

  describe('checkFunctionPermission', () => {
    it('应该对超级管理员返回 true', async () => {
      // Arrange
      const userId = 'user-123';
      const functionCode = 'system:user:list';
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.checkFunctionPermission(userId, functionCode);

      // Assert
      expect(result).toBe(true);
    });

    it('应该对有权限的普通用户返回 true', async () => {
      // Arrange
      const userId = 'user-123';
      const functionCode = 'system:user:list';
      const mockRole = {
        id: 'role-123',
        permissions: [
          {
            id: 'perm-123',
            name: functionCode,
            isActive: true,
            conditions: {},
          },
        ],
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        status: UserStatus.ACTIVE,
        roles: [mockRole],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.checkFunctionPermission(userId, functionCode);

      // Assert
      expect(result).toBe(true);
    });

    it('应该对无权限的用户返回 false', async () => {
      // Arrange
      const userId = 'user-123';
      const functionCode = 'system:user:delete';
      const mockRole = {
        id: 'role-123',
        permissions: [
          {
            id: 'perm-123',
            name: 'system:user:list', // 不同的权限
            isActive: true,
            conditions: {},
          },
        ],
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [mockRole],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.checkFunctionPermission(userId, functionCode);

      // Assert
      expect(result).toBe(false);
    });

    it('应该对不存在的用户返回 false', async () => {
      // Arrange
      const userId = 'nonexistent';
      const functionCode = 'system:user:list';

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.checkFunctionPermission(userId, functionCode);

      // Assert
      expect(result).toBe(false);
    });

    it('应该检查权限是否激活', async () => {
      // Arrange
      const userId = 'user-123';
      const functionCode = 'system:user:list';
      const mockRole = {
        id: 'role-123',
        permissions: [
          {
            id: 'perm-123',
            name: functionCode,
            isActive: false, // 未激活
            conditions: {},
          },
        ],
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [mockRole],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.checkFunctionPermission(userId, functionCode);

      // Assert
      expect(result).toBe(false);
    });

    it('应该在发生异常时返回 false', async () => {
      // Arrange
      const userId = 'user-123';
      const functionCode = 'system:user:list';

      userRepository.findOne.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.checkFunctionPermission(userId, functionCode);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('checkOperationPermission', () => {
    it('应该对超级管理员返回允许所有数据范围', async () => {
      // Arrange
      const userId = 'user-123';
      const resource = 'user';
      const action = 'read';
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.checkOperationPermission(userId, resource, action);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.scope).toBe(DataScopeType.ALL);
    });

    it('应该对有权限的用户返回允许', async () => {
      // Arrange
      const userId = 'user-123';
      const resource = 'device';
      const action = 'create';
      const mockRole = {
        id: 'role-123',
        permissions: [
          {
            id: 'perm-123',
            resource,
            action,
            isActive: true,
            scope: DataScopeType.TENANT,
            dataFilter: { status: 'active' },
            conditions: {},
          },
        ],
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [mockRole],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.checkOperationPermission(userId, resource, action);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.scope).toBe(DataScopeType.TENANT);
      expect(result.filter).toEqual({ status: 'active' });
    });

    it('应该对无权限的用户返回拒绝', async () => {
      // Arrange
      const userId = 'user-123';
      const resource = 'device';
      const action = 'delete';
      const mockRole = {
        id: 'role-123',
        permissions: [
          {
            id: 'perm-123',
            resource: 'device',
            action: 'read', // 不同的操作
            isActive: true,
            conditions: {},
          },
        ],
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [mockRole],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.checkOperationPermission(userId, resource, action);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('没有');
    });

    it('应该对不存在的用户返回拒绝', async () => {
      // Arrange
      const userId = 'nonexistent';
      const resource = 'device';
      const action = 'read';

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.checkOperationPermission(userId, resource, action);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('用户不存在');
    });
  });

  describe('checkDataPermission', () => {
    it('应该对超级管理员允许访问所有数据', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const resourceData = { id: 'device-123', tenantId: 'tenant-456' };
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        tenantId: 'tenant-789', // 不同的租户
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.checkDataPermission(userId, resourceType, resourceData);

      // Assert
      expect(result).toBe(true);
    });

    it('应该根据租户范围检查数据权限', async () => {
      // Arrange
      const userId = 'user-123';
      const tenantId = 'tenant-123';
      const resourceType = 'device';
      const resourceData = { id: 'device-123', tenantId };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId,
        roles: [{ id: 'role-123' }],
      };
      const mockDataScope = {
        id: 'scope-123',
        scopeType: ScopeType.TENANT,
        priority: 1,
        filter: null,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([mockDataScope]);

      // Act
      const result = await service.checkDataPermission(userId, resourceType, resourceData);

      // Assert
      expect(result).toBe(true);
    });

    it('应该拒绝访问不同租户的数据', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const resourceData = { id: 'device-123', tenantId: 'tenant-456' };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123', // 不同的租户
        roles: [{ id: 'role-123' }],
      };
      const mockDataScope = {
        id: 'scope-123',
        scopeType: ScopeType.TENANT,
        priority: 1,
        filter: null,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([mockDataScope]);

      // Act
      const result = await service.checkDataPermission(userId, resourceType, resourceData);

      // Assert
      expect(result).toBe(false);
    });

    it('应该根据自身范围检查数据权限', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const resourceData = { id: 'device-123', createdBy: userId };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
        roles: [{ id: 'role-123' }],
      };
      const mockDataScope = {
        id: 'scope-123',
        scopeType: ScopeType.SELF,
        priority: 1,
        filter: null,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([mockDataScope]);

      // Act
      const result = await service.checkDataPermission(userId, resourceType, resourceData);

      // Assert
      expect(result).toBe(true);
    });

    it('应该对不存在的用户返回 false', async () => {
      // Arrange
      const userId = 'nonexistent';
      const resourceType = 'device';
      const resourceData = { id: 'device-123' };

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.checkDataPermission(userId, resourceType, resourceData);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('checkFieldPermission', () => {
    it('应该对超级管理员返回空权限（表示全部允许）', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'user';
      const operation = OperationType.READ;
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.checkFieldPermission(userId, resourceType, operation);

      // Assert
      expect(result.visibleFields).toEqual([]);
      expect(result.editableFields).toEqual([]);
      expect(result.hiddenFields).toEqual([]);
    });

    it('应该合并多个角色的字段权限', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'user';
      const operation = OperationType.UPDATE;
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }, { id: 'role-456' }],
      };
      const mockFieldPermissions = [
        {
          id: 'fp-123',
          hiddenFields: ['password', 'salt'],
          readOnlyFields: ['email'],
          writableFields: ['username', 'fullName'],
          requiredFields: ['username'],
          fieldAccessMap: {},
          priority: 1,
        },
        {
          id: 'fp-456',
          hiddenFields: ['internalNotes'],
          readOnlyFields: ['createdAt'],
          writableFields: ['phone', 'avatar'],
          requiredFields: ['phone'],
          fieldAccessMap: {},
          priority: 2,
        },
      ];

      userRepository.findOne.mockResolvedValue(mockUser);
      fieldPermissionRepository.find.mockResolvedValue(mockFieldPermissions);

      // Act
      const result = await service.checkFieldPermission(userId, resourceType, operation);

      // Assert
      expect(result.hiddenFields).toContain('password');
      expect(result.hiddenFields).toContain('internalNotes');
      expect(result.readOnlyFields).toContain('email');
      expect(result.readOnlyFields).toContain('createdAt');
      expect(result.editableFields).toContain('username');
      expect(result.editableFields).toContain('phone');
      expect(result.requiredFields).toContain('username');
      expect(result.requiredFields).toContain('phone');
    });

    it('应该对不存在的用户返回空权限', async () => {
      // Arrange
      const userId = 'nonexistent';
      const resourceType = 'user';
      const operation = OperationType.READ;

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.checkFieldPermission(userId, resourceType, operation);

      // Assert
      expect(result.visibleFields).toEqual([]);
      expect(result.editableFields).toEqual([]);
    });
  });

  describe('hasAnyPermission', () => {
    it('应该在用户拥有任一权限时返回 true', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionNames = ['system:user:create', 'system:user:delete', 'system:user:list'];
      const mockRole = {
        id: 'role-123',
        permissions: [
          {
            id: 'perm-123',
            name: 'system:user:list', // 拥有这个权限
            isActive: true,
            conditions: {},
          },
        ],
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [mockRole],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.hasAnyPermission(userId, permissionNames);

      // Assert
      expect(result).toBe(true);
    });

    it('应该在用户不拥有任何权限时返回 false', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionNames = ['system:user:create', 'system:user:delete'];
      const mockRole = {
        id: 'role-123',
        permissions: [
          {
            id: 'perm-123',
            name: 'system:user:list', // 不在请求的权限列表中
            isActive: true,
            conditions: {},
          },
        ],
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [mockRole],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.hasAnyPermission(userId, permissionNames);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('应该在用户拥有所有权限时返回 true', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionNames = ['system:user:list', 'system:user:read'];
      const mockRole = {
        id: 'role-123',
        permissions: [
          {
            id: 'perm-123',
            name: 'system:user:list',
            isActive: true,
            conditions: {},
          },
          {
            id: 'perm-456',
            name: 'system:user:read',
            isActive: true,
            conditions: {},
          },
        ],
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [mockRole],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.hasAllPermissions(userId, permissionNames);

      // Assert
      expect(result).toBe(true);
    });

    it('应该在用户缺少任一权限时返回 false', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionNames = [
        'system:user:list',
        'system:user:delete', // 缺少这个权限
      ];
      const mockRole = {
        id: 'role-123',
        permissions: [
          {
            id: 'perm-123',
            name: 'system:user:list',
            isActive: true,
            conditions: {},
          },
        ],
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [mockRole],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      roleRepository.find.mockResolvedValue([mockRole]);

      // Act
      const result = await service.hasAllPermissions(userId, permissionNames);

      // Assert
      expect(result).toBe(false);
    });
  });
});
