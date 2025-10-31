import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FieldFilterService } from './field-filter.service';
import {
  FieldPermission,
  FieldAccessLevel,
  OperationType,
} from '../entities/field-permission.entity';
import { User } from '../entities/user.entity';
import { createMockRepository } from '@cloudphone/shared/testing';

describe('FieldFilterService', () => {
  let service: FieldFilterService;
  let fieldPermissionRepository: ReturnType<typeof createMockRepository>;
  let userRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    fieldPermissionRepository = createMockRepository();
    userRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldFilterService,
        {
          provide: getRepositoryToken(FieldPermission),
          useValue: fieldPermissionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<FieldFilterService>(FieldFilterService);
  });

  beforeEach(() => {
    fieldPermissionRepository.find.mockClear();
    userRepository.findOne.mockClear();
  });

  describe('filterFields', () => {
    it('应该对超级管理员返回所有字段', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const data = {
        id: 'device-123',
        name: 'Device 1',
        password: 'secret123',
        email: 'test@example.com',
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.filterFields(userId, resourceType, data);

      // Assert
      expect(result).toEqual(data);
    });

    it('应该隐藏敏感字段', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const data = {
        id: 'device-123',
        name: 'Device 1',
        password: 'secret123',
        email: 'test@example.com',
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockFieldPermission = {
        id: 'perm-123',
        roleId: 'role-123',
        resourceType: 'device',
        operation: OperationType.VIEW,
        hiddenFields: ['password'],
        readOnlyFields: ['id', 'name', 'email'],
        writableFields: [],
        requiredFields: [],
        fieldAccessMap: {},
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      fieldPermissionRepository.find.mockResolvedValue([mockFieldPermission]);

      // Act
      const result = await service.filterFields(userId, resourceType, data);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('device-123');
      expect(result.name).toBe('Device 1');
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBeUndefined(); // 隐藏
    });

    it('应该应用字段脱敏', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'user';
      const data = {
        id: 'user-123',
        name: 'John Doe',
        phone: '13800138000',
        email: 'john@example.com',
      };
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockFieldPermission = {
        id: 'perm-123',
        roleId: 'role-123',
        resourceType: 'user',
        operation: OperationType.VIEW,
        hiddenFields: [],
        readOnlyFields: ['id', 'name', 'phone', 'email'],
        writableFields: [],
        requiredFields: [],
        fieldAccessMap: {},
        fieldTransforms: {
          phone: { type: 'mask', pattern: '{3}****{-4}' },
          email: { type: 'mask', pattern: '{3}***@***' },
        },
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      fieldPermissionRepository.find.mockResolvedValue([mockFieldPermission]);

      // Act
      const result = await service.filterFields(userId, resourceType, data);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('John Doe'); // 不脱敏
      expect(result.phone).toBe('138****8000'); // 脱敏
      expect(result.email).toBe('joh***@***'); // 脱敏
    });

    it('应该对用户不存在返回空对象', async () => {
      // Arrange
      const userId = 'nonexistent';
      const resourceType = 'device';
      const data = { id: 'device-123' };

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.filterFields(userId, resourceType, data);

      // Assert
      expect(result).toEqual({});
    });

    it('应该对空数据返回空数据', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const data = null;

      // Act
      const result = await service.filterFields(userId, resourceType, data);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('filterFieldsArray', () => {
    it('应该对超级管理员返回所有字段', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const dataArray = [
        { id: 'device-1', name: 'Device 1', password: 'secret1' },
        { id: 'device-2', name: 'Device 2', password: 'secret2' },
      ];
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.filterFieldsArray(userId, resourceType, dataArray);

      // Assert
      expect(result).toEqual(dataArray);
    });

    it('应该批量过滤敏感字段', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const dataArray = [
        { id: 'device-1', name: 'Device 1', password: 'secret1' },
        { id: 'device-2', name: 'Device 2', password: 'secret2' },
      ];
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockFieldPermission = {
        id: 'perm-123',
        roleId: 'role-123',
        resourceType: 'device',
        operation: OperationType.VIEW,
        hiddenFields: ['password'],
        readOnlyFields: ['id', 'name'],
        writableFields: [],
        requiredFields: [],
        fieldAccessMap: {},
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      fieldPermissionRepository.find.mockResolvedValue([mockFieldPermission]);

      // Act
      const result = await service.filterFieldsArray(userId, resourceType, dataArray);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].password).toBeUndefined();
      expect(result[1].password).toBeUndefined();
      expect(result[0].name).toBe('Device 1');
      expect(result[1].name).toBe('Device 2');
    });

    it('应该对空数组返回空数组', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const dataArray: any[] = [];

      // Act
      const result = await service.filterFieldsArray(userId, resourceType, dataArray);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getVisibleFields', () => {
    it('应该返回可见字段列表', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockFieldPermission = {
        id: 'perm-123',
        roleId: 'role-123',
        resourceType: 'device',
        operation: OperationType.VIEW,
        hiddenFields: ['password'],
        readOnlyFields: ['id', 'name'],
        writableFields: ['status'],
        requiredFields: [],
        fieldAccessMap: {},
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      fieldPermissionRepository.find.mockResolvedValue([mockFieldPermission]);

      // Act
      const result = await service.getVisibleFields(userId, resourceType);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('id');
      expect(result).toContain('name');
      expect(result).toContain('status');
      expect(result).not.toContain('password');
    });
  });

  describe('getEditableFields', () => {
    it('应该返回可编辑字段列表', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockFieldPermission = {
        id: 'perm-123',
        roleId: 'role-123',
        resourceType: 'device',
        operation: OperationType.UPDATE,
        hiddenFields: ['password'],
        readOnlyFields: ['id'],
        writableFields: ['name', 'status'],
        requiredFields: [],
        fieldAccessMap: {},
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      fieldPermissionRepository.find.mockResolvedValue([mockFieldPermission]);

      // Act
      const result = await service.getEditableFields(userId, resourceType);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('name');
      expect(result).toContain('status');
      expect(result).not.toContain('id');
    });
  });

  describe('getFieldLists', () => {
    it('应该对超级管理员返回空列表', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const operation = OperationType.VIEW;
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.getFieldLists(userId, resourceType, operation);

      // Assert
      expect(result).toEqual({
        visible: [],
        editable: [],
        hidden: [],
        readOnly: [],
        required: [],
      });
    });

    it('应该返回完整的字段列表信息', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const operation = OperationType.VIEW;
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockFieldPermission = {
        id: 'perm-123',
        roleId: 'role-123',
        resourceType: 'device',
        operation: OperationType.VIEW,
        hiddenFields: ['password'],
        readOnlyFields: ['id', 'createdAt'],
        writableFields: ['name', 'status'],
        requiredFields: ['name'],
        fieldAccessMap: {},
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      fieldPermissionRepository.find.mockResolvedValue([mockFieldPermission]);

      // Act
      const result = await service.getFieldLists(userId, resourceType, operation);

      // Assert
      expect(result).toBeDefined();
      expect(result.hidden).toContain('password');
      expect(result.readOnly).toContain('id');
      expect(result.readOnly).toContain('createdAt');
      expect(result.editable).toContain('name');
      expect(result.editable).toContain('status');
      expect(result.required).toContain('name');
    });

    it('应该对用户不存在返回空列表', async () => {
      // Arrange
      const userId = 'nonexistent';
      const resourceType = 'device';
      const operation = OperationType.VIEW;

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getFieldLists(userId, resourceType, operation);

      // Assert
      expect(result).toEqual({
        visible: [],
        editable: [],
        hidden: [],
        readOnly: [],
        required: [],
      });
    });
  });

  describe('validateFieldAccess', () => {
    it('应该对超级管理员返回 true', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const fieldName = 'password';
      const accessLevel = FieldAccessLevel.WRITE;
      const operation = OperationType.UPDATE;
      const mockUser = {
        id: userId,
        isSuperAdmin: true,
        roles: [],
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateFieldAccess(
        userId,
        resourceType,
        fieldName,
        accessLevel,
        operation
      );

      // Assert
      expect(result).toBe(true);
    });

    it('应该拒绝隐藏字段访问', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const fieldName = 'password';
      const accessLevel = FieldAccessLevel.READ;
      const operation = OperationType.VIEW;
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockFieldPermission = {
        id: 'perm-123',
        roleId: 'role-123',
        resourceType: 'device',
        operation: OperationType.VIEW,
        hiddenFields: ['password'],
        readOnlyFields: ['id', 'name'],
        writableFields: [],
        requiredFields: [],
        fieldAccessMap: {},
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      fieldPermissionRepository.find.mockResolvedValue([mockFieldPermission]);

      // Act
      const result = await service.validateFieldAccess(
        userId,
        resourceType,
        fieldName,
        accessLevel,
        operation
      );

      // Assert
      expect(result).toBe(false);
    });

    it('应该允许只读字段的读取访问', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const fieldName = 'id';
      const accessLevel = FieldAccessLevel.READ;
      const operation = OperationType.VIEW;
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockFieldPermission = {
        id: 'perm-123',
        roleId: 'role-123',
        resourceType: 'device',
        operation: OperationType.VIEW,
        hiddenFields: [],
        readOnlyFields: ['id'],
        writableFields: [],
        requiredFields: [],
        fieldAccessMap: {},
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      fieldPermissionRepository.find.mockResolvedValue([mockFieldPermission]);

      // Act
      const result = await service.validateFieldAccess(
        userId,
        resourceType,
        fieldName,
        accessLevel,
        operation
      );

      // Assert
      expect(result).toBe(true);
    });

    it('应该拒绝只读字段的写入访问', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const fieldName = 'id';
      const accessLevel = FieldAccessLevel.WRITE;
      const operation = OperationType.UPDATE;
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockFieldPermission = {
        id: 'perm-123',
        roleId: 'role-123',
        resourceType: 'device',
        operation: OperationType.UPDATE,
        hiddenFields: [],
        readOnlyFields: ['id'],
        writableFields: ['name'],
        requiredFields: [],
        fieldAccessMap: {},
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      fieldPermissionRepository.find.mockResolvedValue([mockFieldPermission]);

      // Act
      const result = await service.validateFieldAccess(
        userId,
        resourceType,
        fieldName,
        accessLevel,
        operation
      );

      // Assert
      expect(result).toBe(false);
    });

    it('应该允许可写字段的写入访问', async () => {
      // Arrange
      const userId = 'user-123';
      const resourceType = 'device';
      const fieldName = 'name';
      const accessLevel = FieldAccessLevel.WRITE;
      const operation = OperationType.UPDATE;
      const mockUser = {
        id: userId,
        isSuperAdmin: false,
        roles: [{ id: 'role-123' }],
      };
      const mockFieldPermission = {
        id: 'perm-123',
        roleId: 'role-123',
        resourceType: 'device',
        operation: OperationType.UPDATE,
        hiddenFields: [],
        readOnlyFields: ['id'],
        writableFields: ['name'],
        requiredFields: [],
        fieldAccessMap: {},
        isActive: true,
        priority: 1,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      fieldPermissionRepository.find.mockResolvedValue([mockFieldPermission]);

      // Act
      const result = await service.validateFieldAccess(
        userId,
        resourceType,
        fieldName,
        accessLevel,
        operation
      );

      // Assert
      expect(result).toBe(true);
    });

    it('应该对用户不存在返回 false', async () => {
      // Arrange
      const userId = 'nonexistent';
      const resourceType = 'device';
      const fieldName = 'name';
      const accessLevel = FieldAccessLevel.READ;
      const operation = OperationType.VIEW;

      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.validateFieldAccess(
        userId,
        resourceType,
        fieldName,
        accessLevel,
        operation
      );

      // Assert
      expect(result).toBe(false);
    });
  });
});
