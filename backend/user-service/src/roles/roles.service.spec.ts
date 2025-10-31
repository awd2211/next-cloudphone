import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { CacheService } from '../cache/cache.service';
import {
  createMockRepository,
  createMockRole,
  createMockPermission,
  createMockUser,
  createMockCacheService,
} from '@cloudphone/shared/testing';

describe('RolesService', () => {
  let service: RolesService;
  let rolesRepository: ReturnType<typeof createMockRepository>;
  let permissionsRepository: ReturnType<typeof createMockRepository>;
  let cacheService: ReturnType<typeof createMockCacheService>;

  beforeEach(async () => {
    rolesRepository = createMockRepository();
    permissionsRepository = createMockRepository();
    cacheService = createMockCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: rolesRepository,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: permissionsRepository,
        },
        {
          provide: CacheService,
          useValue: cacheService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  beforeEach(() => {
    // 清除所有mock调用记录
    rolesRepository.findOne.mockClear();
    rolesRepository.find.mockClear();
    rolesRepository.findAndCount.mockClear();
    rolesRepository.create.mockClear();
    rolesRepository.save.mockClear();
    rolesRepository.remove.mockClear();
    permissionsRepository.find.mockClear();
    cacheService.get.mockClear();
    cacheService.set.mockClear();
  });

  describe('create', () => {
    it('应该成功创建角色', async () => {
      // Arrange
      const createRoleDto = {
        name: 'test-role',
        description: 'Test role',
        permissionIds: ['perm-1', 'perm-2'],
      };

      const mockPermissions = [
        createMockPermission({ id: 'perm-1' }),
        createMockPermission({ id: 'perm-2' }),
      ];

      const mockRole = createMockRole({
        name: createRoleDto.name,
        description: createRoleDto.description,
        permissions: mockPermissions,
      });

      rolesRepository.findOne.mockResolvedValue(null); // 名称不重复
      permissionsRepository.find.mockResolvedValue(mockPermissions);
      rolesRepository.create.mockReturnValue(mockRole);
      rolesRepository.save.mockResolvedValue(mockRole);

      // Act
      const result = await service.create(createRoleDto);

      // Assert
      expect(result).toEqual(mockRole);
      expect(rolesRepository.findOne).toHaveBeenCalledWith({
        where: { name: createRoleDto.name },
      });
      expect(permissionsRepository.find).toHaveBeenCalledWith({
        where: { id: expect.anything() },
      });
      expect(rolesRepository.save).toHaveBeenCalled();
    });

    it('应该在角色名已存在时抛出 ConflictException', async () => {
      // Arrange
      const createRoleDto = {
        name: 'existing-role',
        description: 'Test',
      };

      const existingRole = createMockRole({ name: 'existing-role' });
      rolesRepository.findOne.mockResolvedValue(existingRole);

      // Act & Assert
      await expect(service.create(createRoleDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createRoleDto)).rejects.toThrow('角色 existing-role 已存在');
      expect(rolesRepository.save).not.toHaveBeenCalled();
    });

    it('应该能创建没有权限的角色', async () => {
      // Arrange
      const createRoleDto = {
        name: 'no-perm-role',
        description: 'Role without permissions',
      };

      const mockRole = createMockRole({
        name: createRoleDto.name,
        permissions: [],
      });

      rolesRepository.findOne.mockResolvedValue(null);
      rolesRepository.create.mockReturnValue(mockRole);
      rolesRepository.save.mockResolvedValue(mockRole);

      // Act
      const result = await service.create(createRoleDto);

      // Assert
      expect(result.permissions).toEqual([]);
      expect(permissionsRepository.find).not.toHaveBeenCalled();
    });

    it('应该正确关联多个权限', async () => {
      // Arrange
      const permissionIds = ['p1', 'p2', 'p3'];
      const createRoleDto = {
        name: 'multi-perm-role',
        description: 'Test',
        permissionIds,
      };

      const mockPermissions = permissionIds.map((id) => createMockPermission({ id }));

      rolesRepository.findOne.mockResolvedValue(null);
      permissionsRepository.find.mockResolvedValue(mockPermissions);
      rolesRepository.create.mockReturnValue(createMockRole({ permissions: mockPermissions }));
      rolesRepository.save.mockResolvedValue(createMockRole({ permissions: mockPermissions }));

      // Act
      await service.create(createRoleDto);

      // Assert
      expect(permissionsRepository.find).toHaveBeenCalledWith({
        where: { id: expect.anything() },
      });
    });
  });

  describe('findAll', () => {
    it('应该返回分页的角色列表', async () => {
      // Arrange
      const page = 1;
      const limit = 10;
      const mockRoles = [createMockRole(), createMockRole()];
      const total = 20;

      rolesRepository.findAndCount.mockResolvedValue([mockRoles, total]);

      // Act
      const result = await service.findAll(page, limit);

      // Assert
      expect(result).toEqual({
        data: mockRoles,
        total,
        page,
        limit,
      });
      expect(rolesRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: limit,
        relations: ['permissions'],
        order: { createdAt: 'DESC' },
      });
    });

    it('应该支持租户过滤', async () => {
      // Arrange
      const tenantId = 'tenant-123';
      const mockRoles = [createMockRole({ tenantId })];

      rolesRepository.findAndCount.mockResolvedValue([mockRoles, 1]);

      // Act
      await service.findAll(1, 10, tenantId);

      // Assert
      expect(rolesRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId },
        })
      );
    });

    it('应该正确计算分页偏移量', async () => {
      // Arrange
      const page = 3;
      const limit = 15;
      const expectedSkip = (page - 1) * limit; // (3-1)*15 = 30

      rolesRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(page, limit);

      // Assert
      expect(rolesRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: expectedSkip,
          take: limit,
        })
      );
    });

    it('应该使用默认分页参数', async () => {
      // Arrange
      rolesRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll();

      // Assert
      expect(rolesRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
    });
  });

  describe('findOne', () => {
    it('应该成功查找角色', async () => {
      // Arrange
      const roleId = 'role-123';
      const mockRole = createMockRole({ id: roleId });

      cacheService.get.mockResolvedValue(null); // 缓存未命中
      rolesRepository.findOne.mockResolvedValue(mockRole);

      // Act
      const result = await service.findOne(roleId);

      // Assert
      expect(result).toEqual(mockRole);
      expect(cacheService.get).toHaveBeenCalledWith(`role:${roleId}`);
      expect(rolesRepository.findOne).toHaveBeenCalledWith({
        where: { id: roleId },
        relations: ['permissions', 'users'],
      });
    });

    it('应该在角色不存在时抛出 NotFoundException', async () => {
      // Arrange
      const roleId = 'nonexistent';

      cacheService.get.mockResolvedValue(null);
      rolesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(roleId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(roleId)).rejects.toThrow(`角色 #${roleId} 不存在`);
    });

    it('应该从缓存中返回角色', async () => {
      // Arrange
      const roleId = 'role-123';
      const cachedRole = createMockRole({ id: roleId });

      cacheService.get.mockResolvedValue(cachedRole);

      // Act
      const result = await service.findOne(roleId);

      // Assert
      expect(result).toEqual(cachedRole);
      expect(rolesRepository.findOne).not.toHaveBeenCalled();
    });

    it('应该将查询结果存入缓存', async () => {
      // Arrange
      const roleId = 'role-123';
      const mockRole = createMockRole({ id: roleId });

      cacheService.get.mockResolvedValue(null);
      rolesRepository.findOne.mockResolvedValue(mockRole);

      // Act
      await service.findOne(roleId);

      // Assert
      expect(cacheService.set).toHaveBeenCalledWith(`role:${roleId}`, mockRole, { ttl: 600 });
    });
  });

  describe('findByName', () => {
    it('应该成功按名称查找角色', async () => {
      // Arrange
      const roleName = 'admin';
      const mockRole = createMockRole({ name: roleName });

      rolesRepository.findOne.mockResolvedValue(mockRole);

      // Act
      const result = await service.findByName(roleName);

      // Assert
      expect(result).toEqual(mockRole);
      expect(rolesRepository.findOne).toHaveBeenCalledWith({
        where: { name: roleName },
        relations: ['permissions'],
      });
    });

    it('应该在角色不存在时抛出 NotFoundException', async () => {
      // Arrange
      const roleName = 'nonexistent';

      rolesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByName(roleName)).rejects.toThrow(NotFoundException);
      await expect(service.findByName(roleName)).rejects.toThrow(`角色 ${roleName} 不存在`);
    });
  });

  describe('update', () => {
    it('应该成功更新角色', async () => {
      // Arrange
      const roleId = 'role-123';
      const updateDto = {
        description: 'Updated description',
      };

      const mockRole = createMockRole({ id: roleId, isSystem: false });
      const updatedRole = { ...mockRole, ...updateDto };

      rolesRepository.findOne.mockResolvedValue(mockRole);
      rolesRepository.save.mockResolvedValue(updatedRole);

      // Act
      const result = await service.update(roleId, updateDto);

      // Assert
      expect(result.description).toBe(updateDto.description);
      expect(rolesRepository.save).toHaveBeenCalled();
    });

    it('应该在角色不存在时抛出 NotFoundException', async () => {
      // Arrange
      const roleId = 'nonexistent';
      const updateDto = { description: 'Test' };

      rolesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(roleId, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('应该拒绝修改系统角色', async () => {
      // Arrange
      const roleId = 'system-role';
      const updateDto = { name: 'new-name' };
      const systemRole = createMockRole({ id: roleId, isSystem: true });

      rolesRepository.findOne.mockResolvedValue(systemRole);

      // Act & Assert
      await expect(service.update(roleId, updateDto)).rejects.toThrow(BadRequestException);
      await expect(service.update(roleId, updateDto)).rejects.toThrow('系统角色不允许修改');
      expect(rolesRepository.save).not.toHaveBeenCalled();
    });

    it('应该检查更新后的角色名是否重复', async () => {
      // Arrange
      const roleId = 'role-123';
      const updateDto = { name: 'existing-name' };

      const currentRole = createMockRole({
        id: roleId,
        name: 'old-name',
        isSystem: false,
      });
      const conflictRole = createMockRole({ name: 'existing-name' });

      // 第一次调用findOne返回当前角色，第二次检查名称重复返回冲突角色
      rolesRepository.findOne
        .mockResolvedValueOnce(currentRole)
        .mockResolvedValueOnce(conflictRole)
        .mockResolvedValueOnce(currentRole) // 第二个expect调用
        .mockResolvedValueOnce(conflictRole);

      // Act & Assert
      await expect(service.update(roleId, updateDto)).rejects.toThrow(ConflictException);
      await expect(service.update(roleId, updateDto)).rejects.toThrow(
        `角色 ${updateDto.name} 已存在`
      );
    });

    it('应该允许保持相同的角色名', async () => {
      // Arrange
      const roleId = 'role-123';
      const roleName = 'same-name';
      const updateDto = {
        name: roleName,
        description: 'Updated',
      };

      const mockRole = createMockRole({
        id: roleId,
        name: roleName,
        isSystem: false,
      });

      rolesRepository.findOne.mockResolvedValue(mockRole);
      rolesRepository.save.mockResolvedValue(mockRole);

      // Act
      await service.update(roleId, updateDto);

      // Assert
      // 不应该检查重复（因为名称没变）
      expect(rolesRepository.findOne).toHaveBeenCalledTimes(1);
      expect(rolesRepository.save).toHaveBeenCalled();
    });

    it('应该能更新角色的权限', async () => {
      // Arrange
      const roleId = 'role-123';
      const permissionIds = ['p1', 'p2'];
      const updateDto = { permissionIds };

      const mockPermissions = permissionIds.map((id) => createMockPermission({ id }));
      const mockRole = createMockRole({ id: roleId, isSystem: false });

      rolesRepository.findOne.mockResolvedValue(mockRole);
      permissionsRepository.find.mockResolvedValue(mockPermissions);
      rolesRepository.save.mockResolvedValue({
        ...mockRole,
        permissions: mockPermissions,
      });

      // Act
      const result = await service.update(roleId, updateDto);

      // Assert
      expect(permissionsRepository.find).toHaveBeenCalledWith({
        where: { id: expect.anything() },
      });
      expect(result.permissions).toEqual(mockPermissions);
    });
  });

  describe('remove', () => {
    it('应该成功删除角色', async () => {
      // Arrange
      const roleId = 'role-123';
      const mockRole = createMockRole({
        id: roleId,
        isSystem: false,
        users: [],
      });

      rolesRepository.findOne.mockResolvedValue(mockRole);
      rolesRepository.remove.mockResolvedValue(mockRole);

      // Act
      await service.remove(roleId);

      // Assert
      expect(rolesRepository.findOne).toHaveBeenCalledWith({
        where: { id: roleId },
        relations: ['users'],
      });
      expect(rolesRepository.remove).toHaveBeenCalledWith(mockRole);
    });

    it('应该在角色不存在时抛出 NotFoundException', async () => {
      // Arrange
      const roleId = 'nonexistent';

      rolesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(roleId)).rejects.toThrow(NotFoundException);
    });

    it('应该拒绝删除系统角色', async () => {
      // Arrange
      const roleId = 'system-role';
      const systemRole = createMockRole({ id: roleId, isSystem: true });

      rolesRepository.findOne.mockResolvedValue(systemRole);

      // Act & Assert
      await expect(service.remove(roleId)).rejects.toThrow(BadRequestException);
      await expect(service.remove(roleId)).rejects.toThrow('系统角色不允许删除');
      expect(rolesRepository.remove).not.toHaveBeenCalled();
    });

    it('应该拒绝删除有用户的角色', async () => {
      // Arrange
      const roleId = 'role-123';
      const mockRole = createMockRole({
        id: roleId,
        isSystem: false,
        users: [createMockUser(), createMockUser()],
      });

      rolesRepository.findOne.mockResolvedValue(mockRole);

      // Act & Assert
      await expect(service.remove(roleId)).rejects.toThrow(BadRequestException);
      await expect(service.remove(roleId)).rejects.toThrow('该角色下还有用户，无法删除');
      expect(rolesRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('addPermissions', () => {
    it('应该成功添加权限到角色', async () => {
      // Arrange
      const roleId = 'role-123';
      const permissionIds = ['p1', 'p2'];

      const existingPermissions = [createMockPermission({ id: 'p0' })];
      const newPermissions = permissionIds.map((id) => createMockPermission({ id }));

      const mockRole = createMockRole({
        id: roleId,
        permissions: existingPermissions,
      });

      rolesRepository.findOne.mockResolvedValue(mockRole);
      permissionsRepository.find.mockResolvedValue(newPermissions);
      rolesRepository.save.mockResolvedValue({
        ...mockRole,
        permissions: [...existingPermissions, ...newPermissions],
      });

      // Act
      const result = await service.addPermissions(roleId, permissionIds);

      // Assert
      expect(result.permissions).toHaveLength(3);
      expect(rolesRepository.save).toHaveBeenCalled();
    });

    it('应该在角色不存在时抛出 NotFoundException', async () => {
      // Arrange
      const roleId = 'nonexistent';
      const permissionIds = ['p1'];

      rolesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.addPermissions(roleId, permissionIds)).rejects.toThrow(
        NotFoundException
      );
    });

    it('应该去除重复的权限', async () => {
      // Arrange
      const roleId = 'role-123';
      const existingPerm = createMockPermission({ id: 'p1' });
      const mockRole = createMockRole({
        id: roleId,
        permissions: [existingPerm],
      });

      const permissionsToAdd = [
        createMockPermission({ id: 'p1' }), // 重复
        createMockPermission({ id: 'p2' }), // 新的
      ];

      rolesRepository.findOne.mockResolvedValue(mockRole);
      permissionsRepository.find.mockResolvedValue(permissionsToAdd);
      rolesRepository.save.mockResolvedValue(mockRole);

      // Act
      await service.addPermissions(roleId, ['p1', 'p2']);

      // Assert
      const savedRole = rolesRepository.save.mock.calls[0][0];
      expect(savedRole.permissions).toHaveLength(2); // p1 + p2 (不重复)
    });

    it('应该正确处理空权限列表', async () => {
      // Arrange
      const roleId = 'role-123';
      const mockRole = createMockRole({
        id: roleId,
        permissions: [createMockPermission()],
      });

      rolesRepository.findOne.mockResolvedValue(mockRole);
      permissionsRepository.find.mockResolvedValue([]);
      rolesRepository.save.mockResolvedValue(mockRole);

      // Act
      const result = await service.addPermissions(roleId, []);

      // Assert
      expect(result.permissions).toHaveLength(1); // 保持原有权限
    });
  });

  describe('removePermissions', () => {
    it('应该成功移除权限', async () => {
      // Arrange
      const roleId = 'role-123';
      const permissionToRemove = 'p2';

      const permissions = [
        createMockPermission({ id: 'p1' }),
        createMockPermission({ id: 'p2' }),
        createMockPermission({ id: 'p3' }),
      ];

      const mockRole = createMockRole({ id: roleId, permissions });

      rolesRepository.findOne.mockResolvedValue(mockRole);
      rolesRepository.save.mockResolvedValue({
        ...mockRole,
        permissions: permissions.filter((p) => p.id !== permissionToRemove),
      });

      // Act
      const result = await service.removePermissions(roleId, [permissionToRemove]);

      // Assert
      expect(result.permissions).toHaveLength(2);
      expect(result.permissions.find((p) => p.id === 'p2')).toBeUndefined();
    });

    it('应该在角色不存在时抛出 NotFoundException', async () => {
      // Arrange
      const roleId = 'nonexistent';

      rolesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.removePermissions(roleId, ['p1'])).rejects.toThrow(NotFoundException);
    });

    it('应该能移除多个权限', async () => {
      // Arrange
      const roleId = 'role-123';
      const permissions = [
        createMockPermission({ id: 'p1' }),
        createMockPermission({ id: 'p2' }),
        createMockPermission({ id: 'p3' }),
      ];

      const mockRole = createMockRole({ id: roleId, permissions });

      rolesRepository.findOne.mockResolvedValue(mockRole);
      rolesRepository.save.mockResolvedValue({
        ...mockRole,
        permissions: [createMockPermission({ id: 'p1' })],
      });

      // Act
      const result = await service.removePermissions(roleId, ['p2', 'p3']);

      // Assert
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].id).toBe('p1');
    });

    it('应该正确处理移除不存在的权限', async () => {
      // Arrange
      const roleId = 'role-123';
      const permissions = [createMockPermission({ id: 'p1' })];

      const mockRole = createMockRole({ id: roleId, permissions });

      rolesRepository.findOne.mockResolvedValue(mockRole);
      rolesRepository.save.mockResolvedValue(mockRole);

      // Act
      const result = await service.removePermissions(roleId, ['nonexistent-perm']);

      // Assert
      expect(result.permissions).toHaveLength(1); // 保持原有权限
    });
  });
});
