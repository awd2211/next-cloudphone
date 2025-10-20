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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermission('roles.create')
  @ApiOperation({ summary: '创建角色', description: '创建新角色' })
  @ApiResponse({ status: 201, description: '角色创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async create(@Body() createRoleDto: CreateRoleDto) {
    const role = await this.rolesService.create(createRoleDto);
    return {
      success: true,
      data: role,
      message: '角色创建成功',
    };
  }

  @Get()
  @RequirePermission('roles.read')
  @ApiOperation({ summary: '获取角色列表', description: '分页获取角色列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('tenantId') tenantId?: string,
  ) {
    const result = await this.rolesService.findAll(
      parseInt(page),
      parseInt(limit),
      tenantId,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get(':id')
  @RequirePermission('roles.read')
  @ApiOperation({ summary: '获取角色详情', description: '根据 ID 获取角色详细信息' })
  @ApiParam({ name: 'id', description: '角色 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.findOne(id);
    return {
      success: true,
      data: role,
    };
  }

  @Patch(':id')
  @RequirePermission('roles.update')
  @ApiOperation({ summary: '更新角色', description: '更新角色信息' })
  @ApiParam({ name: 'id', description: '角色 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    const role = await this.rolesService.update(id, updateRoleDto);
    return {
      success: true,
      data: role,
      message: '角色更新成功',
    };
  }

  @Delete(':id')
  @RequirePermission('roles.delete')
  @ApiOperation({ summary: '删除角色', description: '删除角色' })
  @ApiParam({ name: 'id', description: '角色 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
    return {
      success: true,
      message: '角色删除成功',
    };
  }

  @Post(':id/permissions')
  @RequirePermission('roles.update')
  @ApiOperation({ summary: '为角色添加权限', description: '为角色分配权限' })
  @ApiParam({ name: 'id', description: '角色 ID' })
  @ApiResponse({ status: 200, description: '权限添加成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async addPermissions(
    @Param('id') id: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    const role = await this.rolesService.addPermissions(id, permissionIds);
    return {
      success: true,
      data: role,
      message: '权限添加成功',
    };
  }

  @Delete(':id/permissions')
  @RequirePermission('roles.update')
  @ApiOperation({ summary: '移除角色权限', description: '从角色中移除权限' })
  @ApiParam({ name: 'id', description: '角色 ID' })
  @ApiResponse({ status: 200, description: '权限移除成功' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async removePermissions(
    @Param('id') id: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    const role = await this.rolesService.removePermissions(id, permissionIds);
    return {
      success: true,
      data: role,
      message: '权限移除成功',
    };
  }
}
