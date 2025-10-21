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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataScope, ScopeType } from '../../entities/data-scope.entity';
import { EnhancedPermissionsGuard } from '../guards/enhanced-permissions.guard';
import { AuditPermissionInterceptor } from '../interceptors/audit-permission.interceptor';
import {
  RequirePermissions,
  AuditCreate,
  AuditUpdate,
  AuditDelete,
} from '../decorators';

/**
 * 创建数据范围 DTO
 */
class CreateDataScopeDto {
  roleId: string;
  resourceType: string;
  scopeType: ScopeType;
  filter?: Record<string, any>;
  departmentIds?: string[];
  includeSubDepartments?: boolean;
  description?: string;
  priority?: number;
}

/**
 * 更新数据范围 DTO
 */
class UpdateDataScopeDto {
  scopeType?: ScopeType;
  filter?: Record<string, any>;
  departmentIds?: string[];
  includeSubDepartments?: boolean;
  description?: string;
  isActive?: boolean;
  priority?: number;
}

/**
 * 数据范围管理控制器
 * 管理角色的数据访问范围配置
 */
@Controller('data-scopes')
@UseGuards(EnhancedPermissionsGuard)
@UseInterceptors(AuditPermissionInterceptor)
export class DataScopeController {
  constructor(
    @InjectRepository(DataScope)
    private dataScopeRepository: Repository<DataScope>,
  ) {}

  /**
   * 获取所有数据范围配置
   */
  @Get()
  @RequirePermissions('permission:dataScope:list')
  async findAll(
    @Query('roleId') roleId?: string,
    @Query('resourceType') resourceType?: string,
  ) {
    const where: any = {};
    if (roleId) where.roleId = roleId;
    if (resourceType) where.resourceType = resourceType;

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
  @RequirePermissions('permission:dataScope:list')
  async findByRole(@Param('roleId') roleId: string) {
    const scopes = await this.dataScopeRepository.find({
      where: { roleId },
      order: { priority: 'ASC' },
    });

    // 按资源类型分组
    const grouped = scopes.reduce((acc, scope) => {
      if (!acc[scope.resourceType]) {
        acc[scope.resourceType] = [];
      }
      acc[scope.resourceType].push(scope);
      return acc;
    }, {} as Record<string, DataScope[]>);

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
  @RequirePermissions('permission:dataScope:create')
  @AuditCreate('dataScope')
  async batchCreate(@Body() dtos: CreateDataScopeDto[]) {
    const scopes = dtos.map((dto) =>
      this.dataScopeRepository.create({
        ...dto,
        isActive: true,
        priority: dto.priority ?? 100,
      }),
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
   * 获取可用的范围类型
   */
  @Get('meta/scope-types')
  @RequirePermissions('permission:dataScope:list')
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
