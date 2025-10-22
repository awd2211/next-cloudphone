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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RolesService } from '../roles/roles.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  @Post()
  @RequirePermission('user.create')
  @ApiOperation({ summary: '创建用户', description: '创建新用户账号' })
  @ApiResponse({ status: 201, description: '用户创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const { password, ...userWithoutPassword } = user;
    return {
      success: true,
      data: userWithoutPassword,
      message: '用户创建成功',
    };
  }

  @Get('roles')
  @RequirePermission('role.read')
  @ApiOperation({ summary: '获取角色列表', description: '获取所有角色列表（用于用户管理）' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', example: 100 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量（兼容参数）', example: 100 })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getRoles(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const itemsPerPage = pageSize || limit || '100';
    const result = await this.rolesService.findAll(
      parseInt(page),
      parseInt(itemsPerPage),
      tenantId,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get('stats')
  @RequirePermission('user.read')
  @ApiOperation({ summary: '获取用户统计', description: '获取用户数量统计信息' })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getStats(@Query('tenantId') tenantId?: string) {
    const stats = await this.usersService.getStats(tenantId);
    return {
      success: true,
      data: stats,
      message: '用户统计获取成功',
    };
  }

  @Get()
  @RequirePermission('user.read')
  @ApiOperation({ summary: '获取用户列表', description: '分页获取用户列表' })
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
    const result = await this.usersService.findAll(
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
  @RequirePermission('user.read')
  @ApiOperation({ summary: '获取用户详情', description: '根据 ID 获取用户详细信息' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return {
      success: true,
      data: user,
    };
  }

  @Patch(':id')
  @RequirePermission('user.update')
  @ApiOperation({ summary: '更新用户', description: '更新用户信息' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    const { password, ...userWithoutPassword } = user;
    return {
      success: true,
      data: userWithoutPassword,
      message: '用户更新成功',
    };
  }

  @Post(':id/change-password')
  @RequirePermission('user.update')
  @ApiOperation({ summary: '修改密码', description: '修改用户密码' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @ApiResponse({ status: 400, description: '原密码错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(id, changePasswordDto);
    return {
      success: true,
      message: '密码修改成功',
    };
  }

  @Delete(':id')
  @RequirePermission('user.delete')
  @ApiOperation({ summary: '删除用户', description: '删除用户账号' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return {
      success: true,
      message: '用户删除成功',
    };
  }
}
