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
import {
  FieldPermission,
  FieldAccessLevel,
  OperationType,
} from '../../entities/field-permission.entity';
import { EnhancedPermissionsGuard } from '../guards/enhanced-permissions.guard';
import { AuditPermissionInterceptor } from '../interceptors/audit-permission.interceptor';
import {
  RequirePermissions,
  AuditCreate,
  AuditUpdate,
  AuditDelete,
} from '../decorators';

/**
 * 创建字段权限 DTO
 */
class CreateFieldPermissionDto {
  roleId: string;
  resourceType: string;
  operation: OperationType;
  hiddenFields?: string[];
  readOnlyFields?: string[];
  writableFields?: string[];
  requiredFields?: string[];
  fieldAccessMap?: Record<string, FieldAccessLevel>;
  fieldTransforms?: Record<string, any>;
  description?: string;
  priority?: number;
}

/**
 * 更新字段权限 DTO
 */
class UpdateFieldPermissionDto {
  hiddenFields?: string[];
  readOnlyFields?: string[];
  writableFields?: string[];
  requiredFields?: string[];
  fieldAccessMap?: Record<string, FieldAccessLevel>;
  fieldTransforms?: Record<string, any>;
  description?: string;
  isActive?: boolean;
  priority?: number;
}

/**
 * 字段权限管理控制器
 * 管理角色对资源字段的访问权限
 */
@Controller('field-permissions')
@UseGuards(EnhancedPermissionsGuard)
@UseInterceptors(AuditPermissionInterceptor)
export class FieldPermissionController {
  constructor(
    @InjectRepository(FieldPermission)
    private fieldPermissionRepository: Repository<FieldPermission>,
  ) {}

  /**
   * 获取所有字段权限配置
   */
  @Get()
  @RequirePermissions('permission:fieldPermission:list')
  async findAll(
    @Query('roleId') roleId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('operation') operation?: OperationType,
  ) {
    const where: any = {};
    if (roleId) where.roleId = roleId;
    if (resourceType) where.resourceType = resourceType;
    if (operation) where.operation = operation;

    const permissions = await this.fieldPermissionRepository.find({
      where,
      order: { priority: 'ASC', createdAt: 'DESC' },
    });

    return {
      success: true,
      data: permissions,
      total: permissions.length,
    };
  }

  /**
   * 根据ID获取字段权限配置
   */
  @Get(':id')
  @RequirePermissions('permission:fieldPermission:view')
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
  @RequirePermissions('permission:fieldPermission:list')
  async findByRole(
    @Param('roleId') roleId: string,
    @Query('resourceType') resourceType?: string,
  ) {
    const where: any = { roleId };
    if (resourceType) where.resourceType = resourceType;

    const permissions = await this.fieldPermissionRepository.find({
      where,
      order: { resourceType: 'ASC', operation: 'ASC', priority: 'ASC' },
    });

    // 按资源类型和操作类型分组
    const grouped = permissions.reduce((acc, perm) => {
      const key = `${perm.resourceType}:${perm.operation}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(perm);
      return acc;
    }, {} as Record<string, FieldPermission[]>);

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
  @RequirePermissions('permission:fieldPermission:create')
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
  @RequirePermissions('permission:fieldPermission:update')
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
  @RequirePermissions('permission:fieldPermission:delete')
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
  @RequirePermissions('permission:fieldPermission:create')
  @AuditCreate('fieldPermission')
  async batchCreate(@Body() dtos: CreateFieldPermissionDto[]) {
    const permissions = dtos.map((dto) =>
      this.fieldPermissionRepository.create({
        ...dto,
        isActive: true,
        priority: dto.priority ?? 100,
      }),
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
  @RequirePermissions('permission:fieldPermission:update')
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
  @RequirePermissions('permission:fieldPermission:list')
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
  @RequirePermissions('permission:fieldPermission:list')
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
  @RequirePermissions('permission:fieldPermission:list')
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
