import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { BulkCreatePermissionsDto } from './dto/bulk-create-permissions.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @RequirePermission('permission.create')
  @ApiOperation({ summary: '创建权限', description: '创建新的权限定义，指定资源、操作和描述信息' })
  @ApiResponse({
    status: 201,
    description: '权限创建成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 'perm-uuid-123',
          name: 'device:create',
          resource: 'device',
          action: 'create',
          description: '创建设备权限',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        message: '权限创建成功'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async create(@Body() createPermissionDto: CreatePermissionDto) {
    const permission = await this.permissionsService.create(createPermissionDto);
    return {
      success: true,
      data: permission,
      message: '权限创建成功',
    };
  }

  @Post('bulk')
  @RequirePermission('permission.create')
  @ApiOperation({ summary: '批量创建权限', description: '一次性批量创建多个权限定义，适用于系统初始化或批量导入场景' })
  @ApiResponse({
    status: 201,
    description: '批量创建成功',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'perm-uuid-1',
            name: 'device:create',
            resource: 'device',
            action: 'create',
            description: '创建设备权限'
          },
          {
            id: 'perm-uuid-2',
            name: 'device:read',
            resource: 'device',
            action: 'read',
            description: '查看设备权限'
          },
          {
            id: 'perm-uuid-3',
            name: 'device:update',
            resource: 'device',
            action: 'update',
            description: '更新设备权限'
          }
        ],
        message: '成功创建 3 个权限'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async bulkCreate(@Body() bulkDto: BulkCreatePermissionsDto) {
    const permissions = await this.permissionsService.bulkCreate(bulkDto.permissions);
    return {
      success: true,
      data: permissions,
      message: `成功创建 ${permissions.length} 个权限`,
    };
  }

  @Get()
  @RequirePermission('permission.read')
  @ApiOperation({ summary: '获取权限列表', description: '分页获取权限列表，支持按资源类型筛选' })
  @ApiQuery({ name: 'page', required: false, description: '页码(从1开始)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'resource', required: false, description: '资源类型筛选', example: 'device' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'perm-uuid-1',
            name: 'device:read',
            resource: 'device',
            action: 'read',
            description: '查看设备权限',
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 'perm-uuid-2',
            name: 'device:create',
            resource: 'device',
            action: 'create',
            description: '创建设备权限',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ],
        total: 25,
        page: 1,
        limit: 10
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('resource') resource?: string
  ) {
    const result = await this.permissionsService.findAll(parseInt(page), parseInt(limit), resource);
    return {
      success: true,
      ...result,
    };
  }

  @Get('resource/:resource')
  @RequirePermission('permission.read')
  @ApiOperation({ summary: '按资源获取权限', description: '根据资源类型获取该资源的所有相关权限定义' })
  @ApiParam({ name: 'resource', description: '资源类型', example: 'device' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'perm-uuid-1',
            name: 'device:read',
            resource: 'device',
            action: 'read',
            description: '查看设备权限'
          },
          {
            id: 'perm-uuid-2',
            name: 'device:create',
            resource: 'device',
            action: 'create',
            description: '创建设备权限'
          },
          {
            id: 'perm-uuid-3',
            name: 'device:update',
            resource: 'device',
            action: 'update',
            description: '更新设备权限'
          },
          {
            id: 'perm-uuid-4',
            name: 'device:delete',
            resource: 'device',
            action: 'delete',
            description: '删除设备权限'
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findByResource(@Param('resource') resource: string) {
    const permissions = await this.permissionsService.findByResource(resource);
    return {
      success: true,
      data: permissions,
    };
  }

  @Get(':id')
  @RequirePermission('permission.read')
  @ApiOperation({ summary: '获取权限详情', description: '根据权限ID获取详细信息，包括关联的角色列表' })
  @ApiParam({ name: 'id', description: '权限 ID', example: 'perm-uuid-123' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 'perm-uuid-123',
          name: 'device:create',
          resource: 'device',
          action: 'create',
          description: '创建设备权限',
          roles: [
            { id: 'role-uuid-1', name: 'Admin', description: '管理员角色' },
            { id: 'role-uuid-2', name: 'DeviceManager', description: '设备管理员' }
          ],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: '权限不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findOne(@Param('id') id: string) {
    const permission = await this.permissionsService.findOne(id);
    return {
      success: true,
      data: permission,
    };
  }

  @Patch(':id')
  @RequirePermission('permission.update')
  @ApiOperation({ summary: '更新权限', description: '更新权限的描述信息（注意：name、resource、action等核心标识不可修改）' })
  @ApiParam({ name: 'id', description: '权限 ID', example: 'perm-uuid-123' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 'perm-uuid-123',
          name: 'device:create',
          resource: 'device',
          action: 'create',
          description: '更新后的描述：允许创建新设备',
          updatedAt: '2024-01-02T00:00:00Z'
        },
        message: '权限更新成功'
      }
    }
  })
  @ApiResponse({ status: 404, description: '权限不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async update(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto) {
    const permission = await this.permissionsService.update(id, updatePermissionDto);
    return {
      success: true,
      data: permission,
      message: '权限更新成功',
    };
  }

  @Delete(':id')
  @RequirePermission('permission.delete')
  @ApiOperation({ summary: '删除权限', description: '永久删除指定权限（注意：如果权限正在被角色使用，删除操作可能失败）' })
  @ApiParam({ name: 'id', description: '权限 ID', example: 'perm-uuid-123' })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      example: {
        success: true,
        message: '权限删除成功'
      }
    }
  })
  @ApiResponse({ status: 404, description: '权限不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async remove(@Param('id') id: string) {
    await this.permissionsService.remove(id);
    return {
      success: true,
      message: '权限删除成功',
    };
  }
}
