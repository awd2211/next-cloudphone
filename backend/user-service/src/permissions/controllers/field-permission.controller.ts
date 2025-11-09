import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import {
  FieldPermission,
  FieldAccessLevel,
  OperationType,
} from '../../entities/field-permission.entity';
import { EnhancedPermissionsGuard } from '../guards/enhanced-permissions.guard';
import { AuditPermissionInterceptor } from '../interceptors/audit-permission.interceptor';
import { RequirePermissions, AuditCreate, AuditUpdate, AuditDelete } from '../decorators';
import { FieldTransformMap, FieldPermissionWhereCondition } from '../types';

/**
 * 创建字段权限 DTO
 */
class CreateFieldPermissionDto {
  @ApiProperty({ description: '角色ID', example: 'role-uuid-123' })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({ description: '资源类型', example: 'device', enum: ['device', 'user', 'order'] })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @ApiProperty({ description: '操作类型', enum: OperationType, example: OperationType.VIEW })
  @IsEnum(OperationType)
  operation: OperationType;

  @ApiProperty({ description: '隐藏字段列表', required: false, type: [String], example: ['password', 'apiKey'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  hiddenFields?: string[];

  @ApiProperty({ description: '只读字段列表', required: false, type: [String], example: ['id', 'createdAt'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  readOnlyFields?: string[];

  @ApiProperty({ description: '可写字段列表', required: false, type: [String], example: ['name', 'description'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  writableFields?: string[];

  @ApiProperty({ description: '必填字段列表', required: false, type: [String], example: ['name'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredFields?: string[];

  @ApiProperty({ description: '字段访问级别映射', required: false, example: { name: 'READ', email: 'WRITE' } })
  @IsObject()
  @IsOptional()
  fieldAccessMap?: Record<string, FieldAccessLevel>;

  @ApiProperty({
    description: '字段转换规则',
    required: false,
    example: {
      phone: { type: 'mask', pattern: '***-****-{4}' },
      email: { type: 'mask', pattern: '{3}***@***' },
      password: { type: 'hash' }
    }
  })
  @IsObject()
  @IsOptional()
  fieldTransforms?: FieldTransformMap;

  @ApiProperty({ description: '描述信息', required: false, example: '销售角色查看设备时的字段权限' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '优先级(数字越小优先级越高)', required: false, minimum: 0, default: 100 })
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}

/**
 * 更新字段权限 DTO
 */
class UpdateFieldPermissionDto {
  @ApiProperty({ description: '隐藏字段列表', required: false, type: [String], example: ['password', 'apiKey'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  hiddenFields?: string[];

  @ApiProperty({ description: '只读字段列表', required: false, type: [String], example: ['id', 'createdAt'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  readOnlyFields?: string[];

  @ApiProperty({ description: '可写字段列表', required: false, type: [String], example: ['name', 'description'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  writableFields?: string[];

  @ApiProperty({ description: '必填字段列表', required: false, type: [String], example: ['name'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredFields?: string[];

  @ApiProperty({ description: '字段访问级别映射', required: false, example: { name: 'READ', email: 'WRITE' } })
  @IsObject()
  @IsOptional()
  fieldAccessMap?: Record<string, FieldAccessLevel>;

  @ApiProperty({
    description: '字段转换规则',
    required: false,
    example: {
      phone: { type: 'mask', pattern: '***-****-{4}' },
      email: { type: 'mask', pattern: '{3}***@***' }
    }
  })
  @IsObject()
  @IsOptional()
  fieldTransforms?: FieldTransformMap;

  @ApiProperty({ description: '描述信息', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '是否启用', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: '优先级(数字越小优先级越高)', required: false, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}

/**
 * 字段权限管理控制器
 * 管理角色对资源字段的访问权限
 */
@ApiTags('字段权限管理')
@ApiBearerAuth()
@Controller('field-permissions')
@UseGuards(AuthGuard('jwt'), EnhancedPermissionsGuard)
@UseInterceptors(AuditPermissionInterceptor)
export class FieldPermissionController {
  constructor(
    @InjectRepository(FieldPermission)
    private fieldPermissionRepository: Repository<FieldPermission>
  ) {}

  /**
   * 获取所有字段权限配置
   */
  @Get()
  @ApiOperation({
    summary: '获取所有字段权限配置',
    description: '根据条件查询字段权限配置列表,支持按角色、资源类型、操作类型过滤，支持服务端分页'
  })
  @ApiQuery({ name: 'roleId', required: false, description: '角色ID', example: 'role-uuid-123' })
  @ApiQuery({ name: 'resourceType', required: false, description: '资源类型', example: 'device' })
  @ApiQuery({ name: 'operation', required: false, description: '操作类型', enum: OperationType })
  @ApiQuery({ name: 'isActive', required: false, description: '是否启用', type: 'boolean' })
  @ApiQuery({ name: 'page', required: false, description: '页码(从1开始)', type: 'number', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', type: 'number', example: 20 })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序字段', example: 'priority' })
  @ApiQuery({ name: 'sortOrder', required: false, description: '排序顺序', enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'field-perm-uuid-1',
            roleId: 'role-uuid-1',
            resourceType: 'device',
            operation: 'VIEW',
            hiddenFields: ['password', 'apiKey'],
            readOnlyFields: ['id', 'createdAt'],
            isActive: true,
            priority: 100
          }
        ],
        total: 150,
        page: 1,
        pageSize: 20
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('field-permission:list')
  async findAll(
    @Query('roleId') roleId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('operation') operation?: OperationType,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const where: FieldPermissionWhereCondition = {};
    if (roleId) where.roleId = roleId;
    if (resourceType) where.resourceType = resourceType;
    if (operation) where.operation = operation;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    // ✅ 分页参数（默认第1页，每页20条）
    const currentPage = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limit = pageSize ? Math.max(1, Math.min(100, parseInt(pageSize, 10))) : 20; // 最大100条/页
    const skip = (currentPage - 1) * limit;

    // ✅ 排序参数（默认按优先级升序）
    const orderBy = sortBy || 'priority';
    const order = sortOrder || 'ASC';
    const orderClause = { [orderBy]: order, createdAt: 'DESC' as const };

    // ✅ 使用 findAndCount 同时获取数据和总数
    const [permissions, total] = await this.fieldPermissionRepository.findAndCount({
      where: where as any,
      order: orderClause as any,
      take: limit,
      skip: skip,
    });

    return {
      success: true,
      data: permissions,
      total,
      page: currentPage,
      pageSize: limit,
    };
  }

  /**
   * 获取字段权限统计数据
   * ⚠️ 必须在 @Get(':id') 之前定义，否则 "stats" 会被当作 ID 参数
   */
  @Get('stats')
  @ApiOperation({
    summary: '获取字段权限统计数据',
    description: '获取字段权限的聚合统计信息，包括总数、启用/禁用数量、按操作类型分组等'
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: {
          total: 150,
          active: 120,
          inactive: 30,
          byOperation: {
            CREATE: 40,
            UPDATE: 35,
            VIEW: 50,
            EXPORT: 25
          },
          byResourceType: {
            device: 60,
            user: 45,
            order: 45
          }
        }
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('field-permission:list')
  async getStats() {
    // ✅ 使用 COUNT 查询，避免加载所有数据
    const total = await this.fieldPermissionRepository.count();
    const active = await this.fieldPermissionRepository.count({
      where: { isActive: true },
    });
    const inactive = total - active;

    // ✅ 按操作类型统计
    const byOperationPromises = Object.values(OperationType).map(async (operation) => {
      const count = await this.fieldPermissionRepository.count({
        where: { operation },
      });
      return { operation, count };
    });
    const byOperationResults = await Promise.all(byOperationPromises);
    const byOperation = byOperationResults.reduce(
      (acc, { operation, count }) => {
        acc[operation] = count;
        return acc;
      },
      {} as Record<OperationType, number>
    );

    // ✅ 按资源类型统计（获取所有不同的资源类型）
    const resourceTypes = await this.fieldPermissionRepository
      .createQueryBuilder('fp')
      .select('DISTINCT fp.resourceType', 'resourceType')
      .getRawMany();

    const byResourceTypePromises = resourceTypes.map(async ({ resourceType }) => {
      const count = await this.fieldPermissionRepository.count({
        where: { resourceType },
      });
      return { resourceType, count };
    });
    const byResourceTypeResults = await Promise.all(byResourceTypePromises);
    const byResourceType = byResourceTypeResults.reduce(
      (acc, { resourceType, count }) => {
        acc[resourceType] = count;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      success: true,
      data: {
        total,
        active,
        inactive,
        byOperation,
        byResourceType,
      },
    };
  }

  /**
   * 根据ID获取字段权限配置
   */
  @Get(':id')
  @ApiOperation({
    summary: '根据ID获取字段权限配置',
    description: '获取指定ID的字段权限详细信息，包括关联的角色信息'
  })
  @ApiParam({ name: 'id', description: '字段权限ID', example: 'field-perm-uuid-1' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 'field-perm-uuid-1',
          roleId: 'role-uuid-1',
          resourceType: 'device',
          operation: 'VIEW',
          hiddenFields: ['password', 'apiKey'],
          readOnlyFields: ['id', 'createdAt'],
          writableFields: ['name', 'description'],
          requiredFields: ['name'],
          fieldAccessMap: { name: 'WRITE', email: 'READ' },
          fieldTransforms: {
            phone: { type: 'mask', pattern: '***-****-{4}' }
          },
          description: '销售角色查看设备时的字段权限',
          isActive: true,
          priority: 100,
          role: {
            id: 'role-uuid-1',
            name: 'Sales',
            description: '销售角色'
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: '字段权限配置不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('field-permission:read')
  async findOne(@Param('id') id: string) {
    const permission = await this.fieldPermissionRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!permission) {
      return {
        success: false,
        message: '字段权限配置不存在',
      };
    }

    return {
      success: true,
      data: permission,
    };
  }

  /**
   * 获取角色的字段权限配置
   */
  @Get('role/:roleId')
  @ApiOperation({
    summary: '获取角色的字段权限配置',
    description: '获取指定角色的所有字段权限配置，可选按资源类型过滤，结果按资源类型和操作类型分组'
  })
  @ApiParam({ name: 'roleId', description: '角色ID', example: 'role-uuid-1' })
  @ApiQuery({ name: 'resourceType', required: false, description: '资源类型', example: 'device' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: {
          'device:VIEW': [
            {
              id: 'field-perm-uuid-1',
              roleId: 'role-uuid-1',
              resourceType: 'device',
              operation: 'VIEW',
              hiddenFields: ['password', 'apiKey'],
              readOnlyFields: ['id', 'createdAt'],
              isActive: true,
              priority: 100
            }
          ],
          'device:UPDATE': [
            {
              id: 'field-perm-uuid-2',
              roleId: 'role-uuid-1',
              resourceType: 'device',
              operation: 'UPDATE',
              writableFields: ['name', 'description'],
              requiredFields: ['name'],
              isActive: true,
              priority: 100
            }
          ]
        },
        total: 2
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('field-permission:list')
  async findByRole(@Param('roleId') roleId: string, @Query('resourceType') resourceType?: string) {
    const where: FieldPermissionWhereCondition = { roleId };
    if (resourceType) where.resourceType = resourceType;

    const permissions = await this.fieldPermissionRepository.find({
      where: where as any,
      order: { resourceType: 'ASC', operation: 'ASC', priority: 'ASC' },
    });

    // 按资源类型和操作类型分组
    const grouped = permissions.reduce(
      (acc, perm) => {
        const key = `${perm.resourceType}:${perm.operation}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(perm);
        return acc;
      },
      {} as Record<string, FieldPermission[]>
    );

    return {
      success: true,
      data: grouped,
      total: permissions.length,
    };
  }

  /**
   * 创建字段权限配置
   */
  @Post()
  @ApiOperation({
    summary: '创建字段权限配置',
    description: '为指定角色和资源类型创建新的字段权限规则，可配置隐藏/只读/可写/必填字段，以及字段转换规则'
  })
  @ApiResponse({
    status: 201,
    description: '创建成功',
    schema: {
      example: {
        success: true,
        message: '字段权限配置创建成功',
        data: {
          id: 'field-perm-uuid-new',
          roleId: 'role-uuid-123',
          resourceType: 'device',
          operation: 'VIEW',
          hiddenFields: ['password', 'apiKey'],
          readOnlyFields: ['id', 'createdAt'],
          writableFields: ['name', 'description'],
          requiredFields: ['name'],
          fieldAccessMap: { name: 'WRITE', email: 'READ' },
          fieldTransforms: {
            phone: { type: 'mask', pattern: '***-****-{4}' }
          },
          description: '销售角色查看设备时的字段权限',
          isActive: true,
          priority: 100,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('field-permission:create')
  @AuditCreate('fieldPermission')
  async create(@Body() dto: CreateFieldPermissionDto) {
    const permission = this.fieldPermissionRepository.create({
      ...dto,
      isActive: true,
      priority: dto.priority ?? 100,
    });

    await this.fieldPermissionRepository.save(permission);

    return {
      success: true,
      message: '字段权限配置创建成功',
      data: permission,
    };
  }

  /**
   * 更新字段权限配置
   */
  @Put(':id')
  @ApiOperation({
    summary: '更新字段权限配置',
    description: '更新指定字段权限的配置信息，可修改字段列表、访问级别、转换规则、启用状态等'
  })
  @ApiParam({ name: 'id', description: '字段权限ID', example: 'field-perm-uuid-1' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      example: {
        success: true,
        message: '字段权限配置更新成功',
        data: {
          id: 'field-perm-uuid-1',
          roleId: 'role-uuid-1',
          resourceType: 'device',
          operation: 'VIEW',
          hiddenFields: ['password', 'apiKey', 'secret'],
          readOnlyFields: ['id', 'createdAt', 'updatedAt'],
          description: '更新后的描述',
          isActive: true,
          priority: 50,
          updatedAt: '2024-01-02T00:00:00Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 404, description: '字段权限配置不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('field-permission:update')
  @AuditUpdate('fieldPermission')
  async update(@Param('id') id: string, @Body() dto: UpdateFieldPermissionDto) {
    const permission = await this.fieldPermissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      return {
        success: false,
        message: '字段权限配置不存在',
      };
    }

    Object.assign(permission, dto);
    await this.fieldPermissionRepository.save(permission);

    return {
      success: true,
      message: '字段权限配置更新成功',
      data: permission,
    };
  }

  /**
   * 删除字段权限配置
   */
  @Delete(':id')
  @ApiOperation({
    summary: '删除字段权限配置',
    description: '永久删除指定的字段权限配置，删除后无法恢复'
  })
  @ApiParam({ name: 'id', description: '字段权限ID', example: 'field-perm-uuid-1' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      example: {
        success: true,
        message: '字段权限配置删除成功'
      }
    }
  })
  @ApiResponse({ status: 404, description: '字段权限配置不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('field-permission:delete')
  @AuditDelete('fieldPermission')
  async remove(@Param('id') id: string) {
    const permission = await this.fieldPermissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      return {
        success: false,
        message: '字段权限配置不存在',
      };
    }

    await this.fieldPermissionRepository.remove(permission);

    return {
      success: true,
      message: '字段权限配置删除成功',
    };
  }

  /**
   * 批量创建字段权限
   */
  @Post('batch')
  @ApiOperation({
    summary: '批量创建字段权限',
    description: '一次性创建多个字段权限配置，适用于角色初始化或批量配置场景'
  })
  @ApiResponse({
    status: 201,
    description: '批量创建成功',
    schema: {
      example: {
        success: true,
        message: '成功创建 3 条字段权限配置',
        data: [
          {
            id: 'field-perm-uuid-1',
            roleId: 'role-uuid-1',
            resourceType: 'device',
            operation: 'VIEW',
            hiddenFields: ['password'],
            isActive: true,
            priority: 100
          },
          {
            id: 'field-perm-uuid-2',
            roleId: 'role-uuid-1',
            resourceType: 'device',
            operation: 'UPDATE',
            writableFields: ['name', 'description'],
            isActive: true,
            priority: 100
          },
          {
            id: 'field-perm-uuid-3',
            roleId: 'role-uuid-1',
            resourceType: 'user',
            operation: 'VIEW',
            hiddenFields: ['password', 'apiKey'],
            isActive: true,
            priority: 100
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('field-permission:create')
  @AuditCreate('fieldPermission')
  async batchCreate(@Body() dtos: CreateFieldPermissionDto[]) {
    const permissions = dtos.map((dto) =>
      this.fieldPermissionRepository.create({
        ...dto,
        isActive: true,
        priority: dto.priority ?? 100,
      })
    );

    await this.fieldPermissionRepository.save(permissions);

    return {
      success: true,
      message: `成功创建 ${permissions.length} 条字段权限配置`,
      data: permissions,
    };
  }

  /**
   * 启用/禁用字段权限配置
   */
  @Put(':id/toggle')
  @ApiOperation({
    summary: '启用/禁用字段权限配置',
    description: '切换字段权限配置的启用状态，禁用后该权限规则将不生效'
  })
  @ApiParam({ name: 'id', description: '字段权限ID', example: 'field-perm-uuid-1' })
  @ApiResponse({
    status: 200,
    description: '切换成功',
    schema: {
      example: {
        success: true,
        message: '字段权限配置已启用',
        data: {
          id: 'field-perm-uuid-1',
          roleId: 'role-uuid-1',
          resourceType: 'device',
          operation: 'VIEW',
          isActive: true,
          priority: 100,
          updatedAt: '2024-01-02T00:00:00Z'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: '字段权限配置不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('field-permission:toggle')
  @AuditUpdate('fieldPermission')
  async toggle(@Param('id') id: string) {
    const permission = await this.fieldPermissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      return {
        success: false,
        message: '字段权限配置不存在',
      };
    }

    permission.isActive = !permission.isActive;
    await this.fieldPermissionRepository.save(permission);

    return {
      success: true,
      message: `字段权限配置已${permission.isActive ? '启用' : '禁用'}`,
      data: permission,
    };
  }

  /**
   * 获取字段访问级别枚举
   */
  @Get('meta/access-levels')
  @ApiOperation({
    summary: '获取字段访问级别枚举',
    description: '获取所有可用的字段访问级别选项，用于前端下拉选择'
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: [
          { value: 'HIDDEN', label: '隐藏' },
          { value: 'READ', label: '只读' },
          { value: 'WRITE', label: '可写' },
          { value: 'REQUIRED', label: '必填' }
        ]
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('field-permission:meta')
  getAccessLevels() {
    return {
      success: true,
      data: Object.values(FieldAccessLevel).map((level) => ({
        value: level,
        label: this.getAccessLevelLabel(level),
      })),
    };
  }

  /**
   * 获取操作类型枚举
   */
  @Get('meta/operation-types')
  @ApiOperation({
    summary: '获取操作类型枚举',
    description: '获取所有可用的操作类型选项，用于前端下拉选择'
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: [
          { value: 'CREATE', label: '创建' },
          { value: 'UPDATE', label: '更新' },
          { value: 'VIEW', label: '查看' },
          { value: 'EXPORT', label: '导出' }
        ]
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('field-permission:meta')
  getOperationTypes() {
    return {
      success: true,
      data: Object.values(OperationType).map((type) => ({
        value: type,
        label: this.getOperationTypeLabel(type),
      })),
    };
  }

  /**
   * 获取字段转换规则示例
   */
  @Get('meta/transform-examples')
  @ApiOperation({
    summary: '获取字段转换规则示例',
    description: '获取所有支持的字段转换类型及其示例，帮助理解如何配置字段脱敏、哈希等转换规则'
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: {
          mask: {
            description: '字段脱敏',
            examples: [
              {
                field: 'phone',
                transform: { type: 'mask', pattern: '***-****-{4}' },
                example: '138-1234-5678 → ***-****-5678'
              },
              {
                field: 'email',
                transform: { type: 'mask', pattern: '{3}***@***' },
                example: 'user@example.com → use***@***'
              },
              {
                field: 'idCard',
                transform: { type: 'mask', pattern: '{6}********{4}' },
                example: '110101199001011234 → 110101********1234'
              }
            ]
          },
          hash: {
            description: '哈希替换',
            example: { type: 'hash' },
            result: '***HASHED***'
          },
          remove: {
            description: '完全移除',
            example: { type: 'remove' },
            result: '字段被删除'
          },
          replace: {
            description: '固定值替换',
            example: { type: 'replace', value: '***' },
            result: '***'
          }
        }
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('field-permission:meta')
  getTransformExamples() {
    return {
      success: true,
      data: {
        mask: {
          description: '字段脱敏',
          examples: [
            {
              field: 'phone',
              transform: { type: 'mask', pattern: '***-****-{4}' },
              example: '138-1234-5678 → ***-****-5678',
            },
            {
              field: 'email',
              transform: { type: 'mask', pattern: '{3}***@***' },
              example: 'user@example.com → use***@***',
            },
            {
              field: 'idCard',
              transform: { type: 'mask', pattern: '{6}********{4}' },
              example: '110101199001011234 → 110101********1234',
            },
          ],
        },
        hash: {
          description: '哈希替换',
          example: { type: 'hash' },
          result: '***HASHED***',
        },
        remove: {
          description: '完全移除',
          example: { type: 'remove' },
          result: '字段被删除',
        },
        replace: {
          description: '固定值替换',
          example: { type: 'replace', value: '***' },
          result: '***',
        },
      },
    };
  }

  /**
   * 获取访问级别的中文标签
   */
  private getAccessLevelLabel(level: FieldAccessLevel): string {
    const labels: Record<FieldAccessLevel, string> = {
      [FieldAccessLevel.HIDDEN]: '隐藏',
      [FieldAccessLevel.READ]: '只读',
      [FieldAccessLevel.WRITE]: '可写',
      [FieldAccessLevel.REQUIRED]: '必填',
    };
    return labels[level] || level;
  }

  /**
   * 获取操作类型的中文标签
   */
  private getOperationTypeLabel(type: OperationType): string {
    const labels: Record<OperationType, string> = {
      [OperationType.CREATE]: '创建',
      [OperationType.UPDATE]: '更新',
      [OperationType.VIEW]: '查看',
      [OperationType.EXPORT]: '导出',
    };
    return labels[type] || type;
  }
}
