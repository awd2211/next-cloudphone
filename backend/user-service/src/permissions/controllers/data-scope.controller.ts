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
import { DataScope, ScopeType } from '../../entities/data-scope.entity';
import { EnhancedPermissionsGuard } from '../guards/enhanced-permissions.guard';
import { AuditPermissionInterceptor } from '../interceptors/audit-permission.interceptor';
import {
  RequirePermissions,
  SkipPermission,
  AuditCreate,
  AuditUpdate,
  AuditDelete,
} from '../decorators';
import { DataScopeFilter, DataScopeWhereCondition } from '../types';

/**
 * 创建数据范围 DTO
 */
class CreateDataScopeDto {
  @ApiProperty({ description: '角色ID', example: 'role-uuid-123' })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({ description: '资源类型', example: 'device', enum: ['device', 'user', 'order', 'report'] })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @ApiProperty({ description: '数据范围类型', enum: ScopeType, example: ScopeType.DEPARTMENT })
  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @ApiProperty({
    description: '自定义过滤条件',
    required: false,
    example: { status: 'active', createdAt: { $gt: '2024-01-01' } }
  })
  @IsObject()
  @IsOptional()
  filter?: DataScopeFilter;

  @ApiProperty({ description: '部门ID列表', required: false, type: [String], example: ['dept-1', 'dept-2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  departmentIds?: string[];

  @ApiProperty({ description: '是否包含子部门', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  includeSubDepartments?: boolean;

  @ApiProperty({ description: '描述信息', required: false, example: '销售部门可查看所有设备' })
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
 * 更新数据范围 DTO
 */
class UpdateDataScopeDto {
  @ApiProperty({ description: '数据范围类型', enum: ScopeType, required: false, example: ScopeType.DEPARTMENT })
  @IsEnum(ScopeType)
  @IsOptional()
  scopeType?: ScopeType;

  @ApiProperty({
    description: '自定义过滤条件',
    required: false,
    example: { status: 'active', createdAt: { $gt: '2024-01-01' } }
  })
  @IsObject()
  @IsOptional()
  filter?: DataScopeFilter;

  @ApiProperty({ description: '部门ID列表', required: false, type: [String], example: ['dept-1', 'dept-2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  departmentIds?: string[];

  @ApiProperty({ description: '是否包含子部门', required: false })
  @IsBoolean()
  @IsOptional()
  includeSubDepartments?: boolean;

  @ApiProperty({ description: '描述信息', required: false, example: '销售部门可查看所有设备' })
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
 * 数据范围管理控制器
 * 管理角色的数据访问范围配置
 */
@ApiTags('数据范围管理')
@ApiBearerAuth()
@Controller('data-scopes')
@UseGuards(EnhancedPermissionsGuard)
@UseInterceptors(AuditPermissionInterceptor)
export class DataScopeController {
  constructor(
    @InjectRepository(DataScope)
    private dataScopeRepository: Repository<DataScope>
  ) {}

  /**
   * 获取可用的范围类型（元数据）
   * 需要查看权限以符合安全最佳实践
   */
  @Get('meta/scope-types')
  @ApiOperation({
    summary: '获取可用的数据范围类型',
    description: '返回系统支持的所有数据范围类型及其中文标签'
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: [
          { value: 'ALL', label: '全部数据' },
          { value: 'TENANT', label: '本租户数据' },
          { value: 'DEPARTMENT', label: '本部门及子部门数据' },
          { value: 'DEPARTMENT_ONLY', label: '仅本部门数据' },
          { value: 'SELF', label: '仅本人数据' },
          { value: 'CUSTOM', label: '自定义范围' }
        ]
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:dataScope:view')
  getScopeTypes() {
    return {
      success: true,
      data: Object.values(ScopeType).map((type) => ({
        value: type,
        label: this.getScopeTypeLabel(type),
      })),
    };
  }

  /**
   * 获取所有数据范围配置
   */
  @Get()
  @ApiOperation({
    summary: '获取所有数据范围配置',
    description: '根据条件查询数据范围配置列表,支持按角色、资源类型、状态过滤'
  })
  @ApiQuery({ name: 'roleId', required: false, description: '角色ID', example: 'role-uuid-123' })
  @ApiQuery({ name: 'resourceType', required: false, description: '资源类型', example: 'device' })
  @ApiQuery({ name: 'isActive', required: false, description: '是否启用', example: 'true' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'scope-uuid-1',
            roleId: 'role-uuid-1',
            resourceType: 'device',
            scopeType: 'DEPARTMENT',
            isActive: true,
            priority: 100,
            createdAt: '2024-01-01T00:00:00Z'
          }
        ],
        total: 1
      }
    }
  })
  @SkipPermission() // 允许所有登录用户查询
  async findAll(
    @Query('roleId') roleId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('isActive') isActive?: string
  ) {
    const where: DataScopeWhereCondition = {};
    if (roleId) where.roleId = roleId;
    if (resourceType) where.resourceType = resourceType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const scopes = await this.dataScopeRepository.find({
      where,
      order: { priority: 'ASC', createdAt: 'DESC' },
    });

    return {
      success: true,
      data: scopes,
      total: scopes.length,
    };
  }

  /**
   * 根据ID获取数据范围配置
   */
  @Get(':id')
  @ApiOperation({
    summary: '获取数据范围配置详情',
    description: '根据ID获取单个数据范围配置的详细信息'
  })
  @ApiParam({ name: 'id', description: '数据范围配置ID', example: 'scope-uuid-123' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 'scope-uuid-1',
          roleId: 'role-uuid-1',
          resourceType: 'device',
          scopeType: 'DEPARTMENT',
          filter: { status: 'active' },
          role: {
            id: 'role-uuid-1',
            name: '销售主管'
          },
          isActive: true,
          priority: 100,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: '配置不存在',
    schema: {
      example: {
        success: false,
        message: '数据范围配置不存在'
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:dataScope:view')
  async findOne(@Param('id') id: string) {
    const scope = await this.dataScopeRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!scope) {
      return {
        success: false,
        message: '数据范围配置不存在',
      };
    }

    return {
      success: true,
      data: scope,
    };
  }

  /**
   * 获取角色的数据范围配置
   */
  @Get('role/:roleId')
  @ApiOperation({
    summary: '获取角色的数据范围配置',
    description: '获取指定角色的所有数据范围配置,按资源类型分组'
  })
  @ApiParam({ name: 'roleId', description: '角色ID', example: 'role-uuid-123' })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: {
          device: [
            {
              id: 'scope-uuid-1',
              roleId: 'role-uuid-1',
              resourceType: 'device',
              scopeType: 'DEPARTMENT',
              priority: 100
            }
          ],
          user: [
            {
              id: 'scope-uuid-2',
              roleId: 'role-uuid-1',
              resourceType: 'user',
              scopeType: 'SELF',
              priority: 200
            }
          ]
        },
        total: 2
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:dataScope:list')
  async findByRole(@Param('roleId') roleId: string) {
    const scopes = await this.dataScopeRepository.find({
      where: { roleId },
      order: { priority: 'ASC' },
    });

    // 按资源类型分组
    const grouped = scopes.reduce(
      (acc, scope) => {
        if (!acc[scope.resourceType]) {
          acc[scope.resourceType] = [];
        }
        acc[scope.resourceType].push(scope);
        return acc;
      },
      {} as Record<string, DataScope[]>
    );

    return {
      success: true,
      data: grouped,
      total: scopes.length,
    };
  }

  /**
   * 创建数据范围配置
   */
  @Post()
  @ApiOperation({
    summary: '创建数据范围配置',
    description: '为指定角色创建数据访问范围配置'
  })
  @ApiResponse({
    status: 201,
    description: '创建成功',
    schema: {
      example: {
        success: true,
        message: '数据范围配置创建成功',
        data: {
          id: 'scope-uuid-1',
          roleId: 'role-uuid-1',
          resourceType: 'device',
          scopeType: 'DEPARTMENT',
          isActive: true,
          priority: 100
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: '配置已存在或参数错误',
    schema: {
      example: {
        success: false,
        message: '该角色对此资源类型的数据范围配置已存在'
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:dataScope:create')
  @AuditCreate('dataScope')
  async create(@Body() dto: CreateDataScopeDto) {
    // 检查是否已存在同角色同资源类型的配置
    const existing = await this.dataScopeRepository.findOne({
      where: {
        roleId: dto.roleId,
        resourceType: dto.resourceType,
      },
    });

    if (existing) {
      return {
        success: false,
        message: '该角色对此资源类型的数据范围配置已存在',
      };
    }

    const scope = this.dataScopeRepository.create({
      ...dto,
      isActive: true,
      priority: dto.priority ?? 100,
    });

    await this.dataScopeRepository.save(scope);

    return {
      success: true,
      message: '数据范围配置创建成功',
      data: scope,
    };
  }

  /**
   * 更新数据范围配置
   */
  @Put(':id')
  @ApiOperation({
    summary: '更新数据范围配置',
    description: '更新指定ID的数据范围配置信息'
  })
  @ApiParam({ name: 'id', description: '数据范围配置ID', example: 'scope-uuid-123' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      example: {
        success: true,
        message: '数据范围配置更新成功',
        data: {
          id: 'scope-uuid-1',
          scopeType: 'CUSTOM',
          filter: { status: 'active' },
          priority: 50
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: '配置不存在',
    schema: {
      example: {
        success: false,
        message: '数据范围配置不存在'
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:dataScope:update')
  @AuditUpdate('dataScope')
  async update(@Param('id') id: string, @Body() dto: UpdateDataScopeDto) {
    const scope = await this.dataScopeRepository.findOne({
      where: { id },
    });

    if (!scope) {
      return {
        success: false,
        message: '数据范围配置不存在',
      };
    }

    Object.assign(scope, dto);
    await this.dataScopeRepository.save(scope);

    return {
      success: true,
      message: '数据范围配置更新成功',
      data: scope,
    };
  }

  /**
   * 删除数据范围配置
   */
  @Delete(':id')
  @ApiOperation({
    summary: '删除数据范围配置',
    description: '删除指定ID的数据范围配置'
  })
  @ApiParam({ name: 'id', description: '数据范围配置ID', example: 'scope-uuid-123' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      example: {
        success: true,
        message: '数据范围配置删除成功'
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: '配置不存在',
    schema: {
      example: {
        success: false,
        message: '数据范围配置不存在'
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:dataScope:delete')
  @AuditDelete('dataScope')
  async remove(@Param('id') id: string) {
    const scope = await this.dataScopeRepository.findOne({
      where: { id },
    });

    if (!scope) {
      return {
        success: false,
        message: '数据范围配置不存在',
      };
    }

    await this.dataScopeRepository.remove(scope);

    return {
      success: true,
      message: '数据范围配置删除成功',
    };
  }

  /**
   * 批量设置角色的数据范围
   */
  @Post('batch')
  @ApiOperation({
    summary: '批量创建数据范围配置',
    description: '批量为角色设置数据访问范围配置'
  })
  @ApiResponse({
    status: 201,
    description: '批量创建成功',
    schema: {
      example: {
        success: true,
        message: '成功创建 2 条数据范围配置',
        data: [
          {
            id: 'scope-uuid-1',
            roleId: 'role-uuid-1',
            resourceType: 'device',
            scopeType: 'DEPARTMENT'
          },
          {
            id: 'scope-uuid-2',
            roleId: 'role-uuid-1',
            resourceType: 'user',
            scopeType: 'SELF'
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:dataScope:create')
  @AuditCreate('dataScope')
  async batchCreate(@Body() dtos: CreateDataScopeDto[]) {
    const scopes = dtos.map((dto) =>
      this.dataScopeRepository.create({
        ...dto,
        isActive: true,
        priority: dto.priority ?? 100,
      })
    );

    await this.dataScopeRepository.save(scopes);

    return {
      success: true,
      message: `成功创建 ${scopes.length} 条数据范围配置`,
      data: scopes,
    };
  }

  /**
   * 启用/禁用数据范围配置
   */
  @Put(':id/toggle')
  @ApiOperation({
    summary: '切换数据范围配置状态',
    description: '启用或禁用指定ID的数据范围配置'
  })
  @ApiParam({ name: 'id', description: '数据范围配置ID', example: 'scope-uuid-123' })
  @ApiResponse({
    status: 200,
    description: '切换成功',
    schema: {
      example: {
        success: true,
        message: '数据范围配置已启用',
        data: {
          id: 'scope-uuid-1',
          isActive: true
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: '配置不存在',
    schema: {
      example: {
        success: false,
        message: '数据范围配置不存在'
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  @RequirePermissions('permission:dataScope:update')
  @AuditUpdate('dataScope')
  async toggle(@Param('id') id: string) {
    const scope = await this.dataScopeRepository.findOne({
      where: { id },
    });

    if (!scope) {
      return {
        success: false,
        message: '数据范围配置不存在',
      };
    }

    scope.isActive = !scope.isActive;
    await this.dataScopeRepository.save(scope);

    return {
      success: true,
      message: `数据范围配置已${scope.isActive ? '启用' : '禁用'}`,
      data: scope,
    };
  }

  /**
   * 获取范围类型的中文标签
   */
  private getScopeTypeLabel(type: ScopeType): string {
    const labels: Record<ScopeType, string> = {
      [ScopeType.ALL]: '全部数据',
      [ScopeType.TENANT]: '本租户数据',
      [ScopeType.DEPARTMENT]: '本部门及子部门数据',
      [ScopeType.DEPARTMENT_ONLY]: '仅本部门数据',
      [ScopeType.SELF]: '仅本人数据',
      [ScopeType.CUSTOM]: '自定义范围',
    };
    return labels[type] || type;
  }
}
