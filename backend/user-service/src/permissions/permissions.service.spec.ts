import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { Permission } from '../entities/permission.entity';
import { createMockRepository, createMockPermission } from '@cloudphone/shared/testing';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionsRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    permissionsRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(Permission),
          useValue: permissionsRepository,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  beforeEach(() => {
    // 清除所有mock调用记录
    permissionsRepository.findOne.mockClear();
    permissionsRepository.find.mockClear();
    permissionsRepository.findAndCount.mockClear();
    permissionsRepository.create.mockClear();
    permissionsRepository.save.mockClear();
    permissionsRepository.remove.mockClear();
  });

  describe('create', () => {
    it('应该成功创建权限', async () => {
      // Arrange
      const createDto = {
        name: 'device:read',
        resource: 'device',
        action: 'read',
        description: 'Read device permission',
      };

      const mockPermission = createMockPermission(createDto);

      permissionsRepository.findOne.mockResolvedValue(null); // 名称不重复
      permissionsRepository.create.mockReturnValue(mockPermission);
      permissionsRepository.save.mockResolvedValue(mockPermission);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockPermission);
      expect(permissionsRepository.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name },
      });
      expect(permissionsRepository.save).toHaveBeenCalled();
    });

    it('应该在权限名已存在时抛出 ConflictException', async () => {
      // Arrange
      const createDto = {
        name: 'existing-perm',
        resource: 'device',
        action: 'read',
      };

      const existingPermission = createMockPermission({ name: 'existing-perm' });
      permissionsRepository.findOne.mockResolvedValue(existingPermission);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow('权限 existing-perm 已存在');
      expect(permissionsRepository.save).not.toHaveBeenCalled();
    });

    it('应该正确设置权限属性', async () => {
      // Arrange
      const createDto = {
        name: 'user:update',
        resource: 'user',
        action: 'update',
        description: 'Update user',
      };

      permissionsRepository.findOne.mockResolvedValue(null);
      permissionsRepository.create.mockImplementation((dto) => dto as any);
      permissionsRepository.save.mockImplementation((perm) => Promise.resolve(perm));

      // Act
      await service.create(createDto);

      // Assert
      expect(permissionsRepository.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('应该返回分页的权限列表', async () => {
      // Arrange
      const page = 1;
      const limit = 10;
      const mockPermissions = [createMockPermission(), createMockPermission()];
      const total = 25;

      permissionsRepository.findAndCount.mockResolvedValue([mockPermissions, total]);

      // Act
      const result = await service.findAll(page, limit);

      // Assert
      expect(result).toEqual({
        data: mockPermissions,
        total,
        page,
        limit,
      });
      expect(permissionsRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: limit,
        order: { createdAt: 'DESC' },
      });
    });

    it('应该支持resource过滤', async () => {
      // Arrange
      const resource = 'device';
      const mockPermissions = [
        createMockPermission({ resource }),
        createMockPermission({ resource }),
      ];

      permissionsRepository.findAndCount.mockResolvedValue([mockPermissions, 2]);

      // Act
      await service.findAll(1, 10, resource);

      // Assert
      expect(permissionsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { resource },
        })
      );
    });

    it('应该正确计算分页偏移量', async () => {
      // Arrange
      const page = 4;
      const limit = 20;
      const expectedSkip = (page - 1) * limit; // 60

      permissionsRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(page, limit);

      // Assert
      expect(permissionsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: expectedSkip,
          take: limit,
        })
      );
    });

    it('应该使用默认分页参数', async () => {
      // Arrange
      permissionsRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.findAll();

      // Assert
      expect(permissionsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
    });
  });

  describe('findOne', () => {
    it('应该成功查找权限', async () => {
      // Arrange
      const permissionId = 'perm-123';
      const mockPermission = createMockPermission({ id: permissionId });

      permissionsRepository.findOne.mockResolvedValue(mockPermission);

      // Act
      const result = await service.findOne(permissionId);

      // Assert
      expect(result).toEqual(mockPermission);
      expect(permissionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: permissionId },
        relations: ['roles'],
      });
    });

    it('应该在权限不存在时抛出 NotFoundException', async () => {
      // Arrange
      const permissionId = 'nonexistent';

      permissionsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(permissionId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(permissionId)).rejects.toThrow(`权限 #${permissionId} 不存在`);
    });

    it('应该加载权限关联的角色', async () => {
      // Arrange
      const permissionId = 'perm-123';

      permissionsRepository.findOne.mockResolvedValue(createMockPermission({ id: permissionId }));

      // Act
      await service.findOne(permissionId);

      // Assert
      expect(permissionsRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['roles'],
        })
      );
    });
  });

  describe('findByName', () => {
    it('应该成功按名称查找权限', async () => {
      // Arrange
      const permName = 'device:read';
      const mockPermission = createMockPermission({ name: permName });

      permissionsRepository.findOne.mockResolvedValue(mockPermission);

      // Act
      const result = await service.findByName(permName);

      // Assert
      expect(result).toEqual(mockPermission);
      expect(permissionsRepository.findOne).toHaveBeenCalledWith({
        where: { name: permName },
      });
    });

    it('应该在权限不存在时抛出 NotFoundException', async () => {
      // Arrange
      const permName = 'nonexistent';

      permissionsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByName(permName)).rejects.toThrow(NotFoundException);
      await expect(service.findByName(permName)).rejects.toThrow(`权限 ${permName} 不存在`);
    });
  });

  describe('update', () => {
    it('应该成功更新权限', async () => {
      // Arrange
      const permissionId = 'perm-123';
      const updateDto = {
        description: 'Updated description',
      };

      const mockPermission = createMockPermission({ id: permissionId });
      const updatedPermission = { ...mockPermission, ...updateDto };

      permissionsRepository.findOne.mockResolvedValue(mockPermission);
      permissionsRepository.save.mockResolvedValue(updatedPermission);

      // Act
      const result = await service.update(permissionId, updateDto);

      // Assert
      expect(result.description).toBe(updateDto.description);
      expect(permissionsRepository.save).toHaveBeenCalled();
    });

    it('应该在权限不存在时抛出 NotFoundException', async () => {
      // Arrange
      const permissionId = 'nonexistent';
      const updateDto = { description: 'Test' };

      permissionsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(permissionId, updateDto)).rejects.toThrow(NotFoundException);
    });

    // NOTE: name, resource, and action fields are immutable and cannot be updated
    // These fields are not included in UpdatePermissionDto by design

    it('应该能更新权限的resource和action', async () => {
      // Arrange
      const permissionId = 'perm-123';
      const updateDto = {
        resource: 'new-resource',
        action: 'new-action',
      };

      const mockPermission = createMockPermission({ id: permissionId });

      permissionsRepository.findOne.mockResolvedValue(mockPermission);
      permissionsRepository.save.mockImplementation((perm) => Promise.resolve(perm));

      // Act
      await service.update(permissionId, updateDto);

      // Assert
      const savedPermission = permissionsRepository.save.mock.calls[0][0];
      expect(savedPermission.resource).toBe(updateDto.resource);
      expect(savedPermission.action).toBe(updateDto.action);
    });
  });

  describe('remove', () => {
    it('应该成功删除权限', async () => {
      // Arrange
      const permissionId = 'perm-123';
      const mockPermission = createMockPermission({ id: permissionId });

      permissionsRepository.findOne.mockResolvedValue(mockPermission);
      permissionsRepository.remove.mockResolvedValue(mockPermission);

      // Act
      await service.remove(permissionId);

      // Assert
      expect(permissionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: permissionId },
        relations: ['roles'],
      });
      expect(permissionsRepository.remove).toHaveBeenCalledWith(mockPermission);
    });

    it('应该在权限不存在时抛出 NotFoundException', async () => {
      // Arrange
      const permissionId = 'nonexistent';

      permissionsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(permissionId)).rejects.toThrow(NotFoundException);
    });

    it('应该能删除有关联角色的权限', async () => {
      // Arrange
      const permissionId = 'perm-123';
      const mockPermission = createMockPermission({
        id: permissionId,
        roles: [{} as any, {} as any], // 有角色关联
      });

      permissionsRepository.findOne.mockResolvedValue(mockPermission);
      permissionsRepository.remove.mockResolvedValue(mockPermission);

      // Act
      await service.remove(permissionId);

      // Assert
      expect(permissionsRepository.remove).toHaveBeenCalled();
    });
  });

  describe('findByResource', () => {
    it('应该成功按资源查找权限', async () => {
      // Arrange
      const resource = 'device';
      const mockPermissions = [
        createMockPermission({ resource, action: 'read' }),
        createMockPermission({ resource, action: 'write' }),
      ];

      permissionsRepository.find.mockResolvedValue(mockPermissions);

      // Act
      const result = await service.findByResource(resource);

      // Assert
      expect(result).toEqual(mockPermissions);
      expect(permissionsRepository.find).toHaveBeenCalledWith({
        where: { resource },
      });
    });

    it('应该返回空数组当资源没有权限时', async () => {
      // Arrange
      const resource = 'nonexistent-resource';

      permissionsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findByResource(resource);

      // Assert
      expect(result).toEqual([]);
    });

    it('应该返回指定资源的所有权限', async () => {
      // Arrange
      const resource = 'user';
      const actions = ['read', 'create', 'update', 'delete'];
      const mockPermissions = actions.map((action) => createMockPermission({ resource, action }));

      permissionsRepository.find.mockResolvedValue(mockPermissions);

      // Act
      const result = await service.findByResource(resource);

      // Assert
      expect(result).toHaveLength(4);
      expect(result.every((p) => p.resource === resource)).toBe(true);
    });
  });

  describe('bulkCreate', () => {
    it('应该成功批量创建权限', async () => {
      // Arrange
      const createDtos = [
        { name: 'perm1', resource: 'res1', action: 'read' },
        { name: 'perm2', resource: 'res2', action: 'write' },
        { name: 'perm3', resource: 'res3', action: 'delete' },
      ];

      const mockPermissions = createDtos.map((dto) => createMockPermission(dto));

      permissionsRepository.create.mockImplementation((dto) => dto as any);
      permissionsRepository.save.mockResolvedValue(mockPermissions);

      // Act
      const result = await service.bulkCreate(createDtos);

      // Assert
      expect(result).toHaveLength(3);
      expect(permissionsRepository.create).toHaveBeenCalledTimes(3);
      expect(permissionsRepository.save).toHaveBeenCalledWith(expect.arrayContaining(createDtos));
    });

    it('应该能处理空数组', async () => {
      // Arrange
      const createDtos: any[] = [];

      permissionsRepository.save.mockResolvedValue([]);

      // Act
      const result = await service.bulkCreate(createDtos);

      // Assert
      expect(result).toEqual([]);
      expect(permissionsRepository.create).not.toHaveBeenCalled();
    });

    it('应该正确创建多个不同资源的权限', async () => {
      // Arrange
      const createDtos = [
        { name: 'device:read', resource: 'device', action: 'read' },
        { name: 'user:read', resource: 'user', action: 'read' },
        { name: 'billing:read', resource: 'billing', action: 'read' },
      ];

      permissionsRepository.create.mockImplementation((dto) => dto as any);
      permissionsRepository.save.mockImplementation((perms) => Promise.resolve(perms));

      // Act
      await service.bulkCreate(createDtos);

      // Assert
      const savedPermissions = permissionsRepository.save.mock.calls[0][0];
      expect(savedPermissions).toHaveLength(3);
      expect(savedPermissions[0].resource).toBe('device');
      expect(savedPermissions[1].resource).toBe('user');
      expect(savedPermissions[2].resource).toBe('billing');
    });

    it('应该一次性保存所有权限', async () => {
      // Arrange
      const createDtos = [
        { name: 'p1', resource: 'r1', action: 'a1' },
        { name: 'p2', resource: 'r2', action: 'a2' },
      ];

      permissionsRepository.create.mockImplementation((dto) => dto as any);
      permissionsRepository.save.mockResolvedValue([]);

      // Act
      await service.bulkCreate(createDtos);

      // Assert
      expect(permissionsRepository.save).toHaveBeenCalledTimes(1); // 只调用一次save
    });
  });
});
