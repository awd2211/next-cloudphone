import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { DataScopeService } from './data-scope.service';
import { DataScope, ScopeType } from '../entities/data-scope.entity';
import { User } from '../entities/user.entity';
import { Department } from '../entities/department.entity';
import { createMockRepository } from '@cloudphone/shared/testing';

describe('DataScopeService', () => {
  let service: DataScopeService;
  let dataScopeRepository: ReturnType<typeof createMockRepository>;
  let userRepository: ReturnType<typeof createMockRepository>;
  let departmentRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    dataScopeRepository = createMockRepository();
    userRepository = createMockRepository();
    departmentRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataScopeService,
        {
          provide: getRepositoryToken(DataScope),
          useValue: dataScopeRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Department),
          useValue: departmentRepository,
        },
      ],
    }).compile();

    service = module.get<DataScopeService>(DataScopeService);
  });

  beforeEach(() => {
    dataScopeRepository.find.mockClear();
    userRepository.findOne.mockClear();
    departmentRepository.find.mockClear();
  });

  describe('getDataScopeFilter', () => {
    it('应该对超级管理员返回 null（无需过滤）', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        tenantId: 'tenant-123',
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.getDataScopeFilter(userId, resourceType);

      // Assert
      expect(result).toBeNull();
    });

    it('应该对不存在的用户返回 null', async () => {
      // Arrange
      const userId = 'nonexistent';
      const resourceType = 'device';

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getDataScopeFilter(userId, resourceType);

      // Assert
      expect(result).toBeNull();
    });

    it('应该返回租户级别的数据过滤器', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
        roles: [{ id: 'role-123' }],
      };
      const mockDataScope = {
        id: 'scope-123',
        roleId: 'role-123',
        resourceType: 'device',
        scopeType: ScopeType.TENANT,
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([mockDataScope]);

      // Act
      const result = await service.getDataScopeFilter(userId, resourceType);

      // Assert
      expect(result).toBeDefined();
      expect(result?.whereClause).toContain('tenantId');
      expect(result?.parameters).toEqual({ tenantId: 'tenant-123' });
    });

    it('应该返回部门级别的数据过滤器', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
        departmentId: 'dept-123',
        roles: [{ id: 'role-123' }],
      };
      const mockDataScope = {
        id: 'scope-123',
        roleId: 'role-123',
        resourceType: 'device',
        scopeType: ScopeType.DEPARTMENT,
        departmentIds: ['dept-123'],
        includeSubDepartments: false,
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([mockDataScope]);

      // Act
      const result = await service.getDataScopeFilter(userId, resourceType);

      // Assert
      expect(result).toBeDefined();
      expect(result?.whereClause).toContain('departmentId');
      expect(result?.parameters).toEqual({ departmentIds: ['dept-123'] });
    });

    it('应该包含子部门的数据过滤器', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
        departmentId: 'dept-123',
        roles: [{ id: 'role-123' }],
      };
      const mockDataScope = {
        id: 'scope-123',
        roleId: 'role-123',
        resourceType: 'device',
        scopeType: ScopeType.DEPARTMENT,
        departmentIds: ['dept-123'],
        includeSubDepartments: true,
        isActive: true,
        priority: 1,
      };
      const mockSubDepartments = [
        { id: 'dept-456', parentId: 'dept-123' },
        { id: 'dept-789', parentId: 'dept-123' },
      ];

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([mockDataScope]);
      departmentRepository.find.mockResolvedValue(mockSubDepartments);

      // Act
      const result = await service.getDataScopeFilter(userId, resourceType);

      // Assert
      expect(result).toBeDefined();
      expect(result?.parameters.departmentIds).toContain('dept-123');
      expect(result?.parameters.departmentIds).toContain('dept-456');
      expect(result?.parameters.departmentIds).toContain('dept-789');
    });

    it('应该返回仅本人的数据过滤器', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
        roles: [{ id: 'role-123' }],
      };
      const mockDataScope = {
        id: 'scope-123',
        roleId: 'role-123',
        resourceType: 'device',
        scopeType: ScopeType.SELF,
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([mockDataScope]);

      // Act
      const result = await service.getDataScopeFilter(userId, resourceType);

      // Assert
      expect(result).toBeDefined();
      expect(result?.whereClause).toContain('createdBy');
      expect(result?.whereClause).toContain('userId');
      expect(result?.parameters).toEqual({ userId: 'user-123' });
    });

    it('应该使用默认数据范围（无配置时）', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
        departmentId: 'dept-123',
        dataScope: 'department',
        roles: [{ id: 'role-123' }],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([]); // 无配置
      departmentRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getDataScopeFilter(userId, resourceType);

      // Assert
      expect(result).toBeDefined();
      expect(result?.whereClause).toContain('departmentId');
    });
  });

  describe('applyScopeToQuery', () => {
    it('应该对超级管理员不应用过滤', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        tenantId: 'tenant-123',
        roles: [],
      };
      const mockQueryBuilder = {
        alias: 'device',
        andWhere: jest.fn().mockReturnThis(),
      } as any;

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.applyScopeToQuery(mockQueryBuilder, userId, resourceType);

      // Assert
      expect(result).toBe(mockQueryBuilder);
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('应该应用数据范围过滤到查询', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
        roles: [{ id: 'role-123' }],
      };
      const mockDataScope = {
        id: 'scope-123',
        roleId: 'role-123',
        resourceType: 'device',
        scopeType: ScopeType.TENANT,
        isActive: true,
        priority: 1,
      };
      const mockQueryBuilder = {
        alias: 'device',
        andWhere: jest.fn().mockReturnThis(),
      } as any;

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([mockDataScope]);

      // Act
      await service.applyScopeToQuery(mockQueryBuilder, userId, resourceType);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('应该使用自定义表别名', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const customAlias = 'customDevice';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
        roles: [{ id: 'role-123' }],
      };
      const mockDataScope = {
        id: 'scope-123',
        roleId: 'role-123',
        resourceType: 'device',
        scopeType: ScopeType.TENANT,
        isActive: true,
        priority: 1,
      };
      const mockQueryBuilder = {
        alias: 'device',
        andWhere: jest.fn().mockReturnThis(),
      } as any;

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([mockDataScope]);

      // Act
      await service.applyScopeToQuery(mockQueryBuilder, userId, resourceType, customAlias);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('checkRowAccess', () => {
    it('应该允许超级管理员访问任何数据', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const resourceData = {
        id: 'device-123',
        tenantId: 'tenant-456', // 不同租户
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        tenantId: 'tenant-123',
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.checkRowAccess(userId, resourceType, resourceData);

      // Assert
      expect(result).toBe(true);
    });

    it('应该拒绝访问其他租户数据', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const resourceData = {
        id: 'device-123',
        tenantId: 'tenant-456', // 不同租户
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
        roles: [{ id: 'role-123' }],
      };
      const mockDataScope = {
        id: 'scope-123',
        roleId: 'role-123',
        resourceType: 'device',
        scopeType: ScopeType.TENANT,
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([mockDataScope]);

      // Act
      const result = await service.checkRowAccess(userId, resourceType, resourceData);

      // Assert
      expect(result).toBe(false);
    });

    it('应该允许访问同租户数据', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const resourceData = {
        id: 'device-123',
        tenantId: 'tenant-123', // 同租户
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
        roles: [{ id: 'role-123' }],
      };
      const mockDataScope = {
        id: 'scope-123',
        roleId: 'role-123',
        resourceType: 'device',
        scopeType: ScopeType.TENANT,
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([mockDataScope]);

      // Act
      const result = await service.checkRowAccess(userId, resourceType, resourceData);

      // Assert
      expect(result).toBe(true);
    });

    it('应该允许访问自己创建的数据', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const resourceData = {
        id: 'device-123',
        createdBy: 'user-123', // 自己创建
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
        roles: [{ id: 'role-123' }],
      };
      const mockDataScope = {
        id: 'scope-123',
        roleId: 'role-123',
        resourceType: 'device',
        scopeType: ScopeType.SELF,
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([mockDataScope]);

      // Act
      const result = await service.checkRowAccess(userId, resourceType, resourceData);

      // Assert
      expect(result).toBe(true);
    });

    it('应该拒绝访问他人创建的数据（仅本人范围）', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const resourceData = {
        id: 'device-123',
        createdBy: 'user-456', // 他人创建
        userId: 'user-456',
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        tenantId: 'tenant-123',
        roles: [{ id: 'role-123' }],
      };
      const mockDataScope = {
        id: 'scope-123',
        roleId: 'role-123',
        resourceType: 'device',
        scopeType: ScopeType.SELF,
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      dataScopeRepository.find.mockResolvedValue([mockDataScope]);

      // Act
      const result = await service.checkRowAccess(userId, resourceType, resourceData);

      // Assert
      expect(result).toBe(false);
    });

    it('应该对不存在的用户返回 false', async () => {
      // Arrange
      const userId = 'nonexistent';
      const resourceType = 'device';
      const resourceData = { id: 'device-123' };

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.checkRowAccess(userId, resourceType, resourceData);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getDepartmentWithChildren', () => {
    it('应该返回部门及其所有子部门ID', async () => {
      // Arrange
      const departmentId = 'dept-123';
      const mockSubDepartments = [
        { id: 'dept-456', parentId: 'dept-123', isActive: true },
        { id: 'dept-789', parentId: 'dept-123', isActive: true },
      ];

      departmentRepository.find
        .mockResolvedValueOnce(mockSubDepartments)
        .mockResolvedValueOnce([]) // dept-456 无子部门
        .mockResolvedValueOnce([]); // dept-789 无子部门

      // Act
      const result = await service.getDepartmentWithChildren(departmentId);

      // Assert
      expect(result).toContain('dept-123');
      expect(result).toContain('dept-456');
      expect(result).toContain('dept-789');
      expect(result).toHaveLength(3);
    });

    it('应该处理多层嵌套部门', async () => {
      // Arrange
      const departmentId = 'dept-123';

      departmentRepository.find
        .mockResolvedValueOnce([{ id: 'dept-456', parentId: 'dept-123', isActive: true }])
        .mockResolvedValueOnce([{ id: 'dept-789', parentId: 'dept-456', isActive: true }])
        .mockResolvedValueOnce([]); // dept-789 无子部门

      // Act
      const result = await service.getDepartmentWithChildren(departmentId);

      // Assert
      expect(result).toContain('dept-123');
      expect(result).toContain('dept-456');
      expect(result).toContain('dept-789');
      expect(result).toHaveLength(3);
    });

    it('应该处理无子部门的情况', async () => {
      // Arrange
      const departmentId = 'dept-123';

      departmentRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getDepartmentWithChildren(departmentId);

      // Assert
      expect(result).toEqual(['dept-123']);
    });
  });
});
