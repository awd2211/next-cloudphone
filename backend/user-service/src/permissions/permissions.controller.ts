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
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
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
  @ApiOperation({ summary: '创建权限', description: '创建新权限' })
  @ApiResponse({ status: 201, description: '权限创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async create(@Body() createPermissionDto: CreatePermissionDto) {
    const permission = await this.permissionsService.create(
      createPermissionDto,
    );
    return {
      success: true,
      data: permission,
      message: '权限创建成功',
    };
  }

  @Post('bulk')
  @RequirePermission('permission.create')
  @ApiOperation({ summary: '批量创建权限', description: '批量创建多个权限' })
  @ApiResponse({ status: 201, description: '批量创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async bulkCreate(@Body() createPermissionDtos: CreatePermissionDto[]) {
    const permissions = await this.permissionsService.bulkCreate(
      createPermissionDtos,
    );
    return {
      success: true,
      data: permissions,
      message: `成功创建 ${permissions.length} 个权限`,
    };
  }

  @Get()
  @RequirePermission('permission.read')
  @ApiOperation({ summary: '获取权限列表', description: '分页获取权限列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'resource', required: false, description: '资源类型筛选' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('resource') resource?: string,
  ) {
    const result = await this.permissionsService.findAll(
      parseInt(page),
      parseInt(limit),
      resource,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get('resource/:resource')
  @RequirePermission('permission.read')
  @ApiOperation({ summary: '按资源获取权限', description: '根据资源类型获取相关权限' })
  @ApiParam({ name: 'resource', description: '资源类型' })
  @ApiResponse({ status: 200, description: '获取成功' })
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
  @ApiOperation({ summary: '获取权限详情', description: '根据 ID 获取权限详细信息' })
  @ApiParam({ name: 'id', description: '权限 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
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
  @ApiOperation({ summary: '更新权限', description: '更新权限信息' })
  @ApiParam({ name: 'id', description: '权限 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '权限不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    const permission = await this.permissionsService.update(
      id,
      updatePermissionDto,
    );
    return {
      success: true,
      data: permission,
      message: '权限更新成功',
    };
  }

  @Delete(':id')
  @RequirePermission('permission.delete')
  @ApiOperation({ summary: '删除权限', description: '删除权限' })
  @ApiParam({ name: 'id', description: '权限 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
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
