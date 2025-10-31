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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RolesService } from '../roles/roles.service';
import { CursorPaginationDto, DataScopeGuard, DataScope, DataScopeType } from '@cloudphone/shared';
import {
  CreateUserCommand,
  UpdateUserCommand,
  ChangePasswordCommand,
  DeleteUserCommand,
} from './commands/impl';
import { GetUserQuery, GetUsersQuery, GetUserStatsQuery } from './queries/impl';
import { SkipMask } from '../common/decorators/skip-mask.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionsGuard, DataScopeGuard)
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly rolesService: RolesService,
    private readonly usersService: UsersService
  ) {}

  @Post()
  @RequirePermission('user.create')
  @ApiOperation({ summary: '创建用户', description: '创建新用户账号' })
  @ApiResponse({ status: 201, description: '用户创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.commandBus.execute(new CreateUserCommand(createUserDto));
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
    @Query('tenantId') tenantId?: string
  ) {
    const itemsPerPage = pageSize || limit || '100';
    const result = await this.rolesService.findAll(
      parseInt(page),
      parseInt(itemsPerPage),
      tenantId
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
    const stats = await this.queryBus.execute(new GetUserStatsQuery(tenantId));
    return {
      success: true,
      data: stats,
      message: '用户统计获取成功',
    };
  }

  @Get('filter')
  @RequirePermission('user.read')
  @ApiOperation({
    summary: '高级过滤用户列表',
    description: '支持搜索、排序和多条件过滤的用户列表查询',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findAllWithFilters(@Query() filters: any) {
    // 使用 FilterUsersDto 进行验证
    const result = await this.usersService.findAll(
      filters.page || 1,
      filters.limit || 10,
      undefined,
      { includeRoles: filters.includeRoles === 'true', filters }
    );

    return {
      success: true,
      ...result,
      totalPages: Math.ceil(result.total / result.limit),
      hasMore: result.page < Math.ceil(result.total / result.limit),
    };
  }

  @Get()
  @RequirePermission('user.read')
  @SkipMask('email') // 管理员可以看到完整邮箱
  @ApiOperation({ summary: '获取用户列表', description: '分页获取用户列表 (基础版)' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('tenantId') tenantId?: string
  ) {
    const result = await this.queryBus.execute(
      new GetUsersQuery(parseInt(page), parseInt(limit), tenantId)
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get('cursor')
  @RequirePermission('user.read')
  @ApiOperation({
    summary: '获取用户列表 (游标分页)',
    description: '使用游标分页获取用户列表，性能优化版本',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: '游标（base64编码的时间戳）',
    example: 'MTY5ODc2NTQzMjAwMA==',
  })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量 (1-100)', example: 20 })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID' })
  @ApiQuery({
    name: 'includeRoles',
    required: false,
    description: '是否包含角色信息',
    example: 'true',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        success: true,
        data: [],
        nextCursor: 'MTY5ODc2NTQzMjAwMA==',
        hasMore: true,
        count: 20,
      },
    },
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findAllCursor(
    @Query() paginationDto: CursorPaginationDto,
    @Query('tenantId') tenantId?: string,
    @Query('includeRoles') includeRoles?: string
  ) {
    const result = await this.usersService.findAllCursor(paginationDto, tenantId, {
      includeRoles: includeRoles === 'true',
    });
    return {
      success: true,
      ...result,
    };
  }

  @Get('me')
  @ApiOperation({ summary: '获取当前登录用户信息', description: '获取当前登录用户的详细信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMe(@Request() req: any) {
    const user = await this.queryBus.execute(new GetUserQuery(req.user.id));
    return {
      success: true,
      data: user,
    };
  }

  @Get(':id')
  @RequirePermission('user.read')
  @DataScope(DataScopeType.SELF) // 管理员可查看所有，用户只能查看自己
  @ApiOperation({ summary: '获取用户详情', description: '根据 ID 获取用户详细信息' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findOne(@Param('id') id: string) {
    const user = await this.queryBus.execute(new GetUserQuery(id));
    return {
      success: true,
      data: user,
    };
  }

  @Patch(':id')
  @RequirePermission('user.update')
  @DataScope(DataScopeType.SELF) // 管理员可更新所有，用户只能更新自己
  @ApiOperation({ summary: '更新用户', description: '更新用户信息' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.commandBus.execute(new UpdateUserCommand(id, updateUserDto));
    const { password, ...userWithoutPassword } = user;
    return {
      success: true,
      data: userWithoutPassword,
      message: '用户更新成功',
    };
  }

  @Post(':id/change-password')
  @RequirePermission('user.update')
  @DataScope(DataScopeType.SELF) // 用户只能修改自己的密码
  @ApiOperation({ summary: '修改密码', description: '修改用户密码' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @ApiResponse({ status: 400, description: '原密码错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async changePassword(@Param('id') id: string, @Body() changePasswordDto: ChangePasswordDto) {
    await this.commandBus.execute(new ChangePasswordCommand(id, changePasswordDto));
    return {
      success: true,
      message: '密码修改成功',
    };
  }

  @Patch(':id/preferences')
  @RequirePermission('user.update')
  @DataScope(DataScopeType.SELF) // 用户只能修改自己的偏好设置
  @ApiOperation({ summary: '更新偏好设置', description: '更新用户的语言和主题偏好设置' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '偏好设置更新成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async updatePreferences(
    @Param('id') id: string,
    @Body() updatePreferencesDto: UpdatePreferencesDto
  ) {
    const user = await this.usersService.updatePreferences(id, updatePreferencesDto);
    const { password, ...userWithoutPassword } = user;
    return {
      success: true,
      data: userWithoutPassword,
      message: '偏好设置更新成功',
    };
  }

  @Delete(':id')
  @RequirePermission('user.delete')
  @DataScope(DataScopeType.ALL) // 只有管理员可以删除用户
  @ApiOperation({ summary: '删除用户', description: '删除用户账号' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async remove(@Param('id') id: string) {
    await this.commandBus.execute(new DeleteUserCommand(id));
    return {
      success: true,
      message: '用户删除成功',
    };
  }
}
