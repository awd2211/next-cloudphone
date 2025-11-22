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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RolesService } from '../roles/roles.service';
import {
  CursorPaginationDto,
  DataScopeGuard,
  DataScope,
  DataScopeType,
  ActionResult,
  BatchActionResult,
} from '@cloudphone/shared';
import {
  CreateUserCommand,
  UpdateUserCommand,
  ChangePasswordCommand,
  DeleteUserCommand,
} from './commands/impl';
import { GetUserQuery, GetUsersQuery, GetUserStatsQuery } from './queries/impl';
import { SkipMask } from '../common/decorators/skip-mask.decorator';
import { FilterMetadataQueryDto, UserFilterMetadataResponseDto } from './dto/filter-metadata.dto';
import { QuickListQueryDto, QuickListResponseDto } from './dto/quick-list.dto';

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
  async create(@Body() createUserDto: CreateUserDto): Promise<ActionResult<any>> {
    const user = await this.commandBus.execute(new CreateUserCommand(createUserDto));
    const { password, ...userWithoutPassword } = user;
    // TransformInterceptor 会自动包装为 { success: true, data: { data, message }, ... }
    return { data: userWithoutPassword, message: '用户创建成功' };
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
    // 直接返回 service 结果，TransformInterceptor 自动包装
    return this.rolesService.findAll(parseInt(page), parseInt(itemsPerPage), tenantId);
  }

  @Get('stats')
  @RequirePermission('user.read')
  @ApiOperation({ summary: '获取用户统计', description: '获取用户数量统计信息' })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getStats(@Query('tenantId') tenantId?: string) {
    // 直接返回统计数据
    return this.queryBus.execute(new GetUserStatsQuery(tenantId));
  }

  @Get('filters/metadata')
  @RequirePermission('user.read')
  @ApiOperation({
    summary: '用户筛选元数据',
    description: '获取用户列表页所有可用的筛选选项及统计信息（用于生成动态筛选表单）',
  })
  @ApiQuery({
    name: 'includeCount',
    required: false,
    description: '是否包含每个选项的记录数量',
    example: true,
  })
  @ApiQuery({
    name: 'onlyWithData',
    required: false,
    description: '是否只返回有数据的筛选选项',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: UserFilterMetadataResponseDto,
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getFiltersMetadata(@Query() query: FilterMetadataQueryDto) {
    return this.usersService.getFiltersMetadata(query);
  }

  @Get('quick-list')
  @RequirePermission('user.read')
  @ApiOperation({
    summary: '用户快速列表',
    description: '返回轻量级用户列表，用于下拉框等UI组件（带缓存优化）',
  })
  @ApiQuery({ name: 'status', required: false, description: '状态过滤', example: 'active' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词', example: 'admin' })
  @ApiQuery({ name: 'limit', required: false, description: '限制数量', example: 100 })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: QuickListResponseDto,
  })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getQuickList(@Query() query: QuickListQueryDto) {
    return this.usersService.getQuickList(query);
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
    const result = await this.usersService.findAll(
      filters.page || 1,
      filters.limit || 10,
      undefined,
      { includeRoles: filters.includeRoles === 'true', filters }
    );
    // 返回带分页元信息的结果
    return {
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
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量（兼容参数）', example: 10 })
  @ApiQuery({ name: 'tenantId', required: false, description: '租户 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string,
    @Query('tenantId') tenantId?: string
  ) {
    const itemsPerPage = pageSize || limit || '10';
    const result = await this.queryBus.execute(
      new GetUsersQuery(parseInt(page), parseInt(itemsPerPage), tenantId)
    );
    // 返回标准格式：将 limit 转换为 pageSize
    const { limit: _, ...rest } = result;
    return { ...rest, pageSize: result.limit };
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
    return this.usersService.findAllCursor(paginationDto, tenantId, {
      includeRoles: includeRoles === 'true',
    });
  }

  @Get('me')
  @ApiOperation({ summary: '获取当前登录用户信息', description: '获取当前登录用户的详细信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMe(@Request() req: any) {
    return this.queryBus.execute(new GetUserQuery(req.user.id));
  }

  @Get('batch')
  @RequirePermission('user.read')
  @ApiOperation({ summary: '批量获取用户信息', description: '根据 ID 列表批量获取用户基本信息（用于服务间调用）' })
  @ApiQuery({ name: 'ids', description: '用户 ID 列表（逗号分隔）', example: 'id1,id2,id3' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async batchFindUsers(@Query('ids') idsParam: string) {
    if (!idsParam) {
      return [];
    }

    const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) {
      return [];
    }

    // 批量查询用户（最多100个）
    const limitedIds = ids.slice(0, 100);
    const users = await this.usersService.findByIds(limitedIds);

    // 只返回基本信息（id, username, email）
    return users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
    }));
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
    return this.queryBus.execute(new GetUserQuery(id));
  }

  @Patch(':id')
  @RequirePermission('user.update')
  @DataScope(DataScopeType.SELF) // 管理员可更新所有，用户只能更新自己
  @ApiOperation({ summary: '更新用户', description: '更新用户信息' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<ActionResult<any>> {
    const user = await this.commandBus.execute(new UpdateUserCommand(id, updateUserDto));
    const { password, ...userWithoutPassword } = user;
    return { data: userWithoutPassword, message: '用户更新成功' };
  }

  @Post(':id/change-password')
  @RequirePermission('user.update')
  @DataScope(DataScopeType.SELF) // 用户只能修改自己的密码
  @ApiOperation({ summary: '修改密码', description: '修改用户密码' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @ApiResponse({ status: 400, description: '原密码错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async changePassword(@Param('id') id: string, @Body() changePasswordDto: ChangePasswordDto): Promise<ActionResult> {
    await this.commandBus.execute(new ChangePasswordCommand(id, changePasswordDto));
    return { message: '密码修改成功' };
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
  ): Promise<ActionResult<any>> {
    const user = await this.usersService.updatePreferences(id, updatePreferencesDto);
    const { password, ...userWithoutPassword } = user;
    return { data: userWithoutPassword, message: '偏好设置更新成功' };
  }

  @Delete(':id')
  @RequirePermission('user.delete')
  @DataScope(DataScopeType.ALL) // 只有管理员可以删除用户
  @ApiOperation({ summary: '删除用户', description: '删除用户账号' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async remove(@Param('id') id: string): Promise<ActionResult> {
    await this.commandBus.execute(new DeleteUserCommand(id));
    return { message: '用户删除成功' };
  }

  @Post('batch-delete')
  @RequirePermission('user.delete')
  @DataScope(DataScopeType.ALL) // 只有管理员可以批量删除用户
  @ApiOperation({ summary: '批量删除用户', description: '批量删除多个用户账号' })
  @ApiResponse({ status: 200, description: '批量删除成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async batchDelete(@Body() dto: { ids: string[] }): Promise<BatchActionResult<string>> {
    if (!dto.ids || !Array.isArray(dto.ids) || dto.ids.length === 0) {
      throw new BadRequestException('请提供要删除的用户 ID 列表');
    }

    const succeeded: string[] = [];
    const failed: Array<{ item: string; error: string }> = [];

    // 批量删除用户
    for (const id of dto.ids) {
      try {
        await this.commandBus.execute(new DeleteUserCommand(id));
        succeeded.push(id);
      } catch (error) {
        failed.push({ item: id, error: error.message || '删除失败' });
      }
    }

    return {
      succeeded,
      failed,
      message: `批量删除完成：成功 ${succeeded.length} 个，失败 ${failed.length} 个`,
    };
  }

  // ============================================================================
  // 支付方式管理接口
  // ============================================================================

  @Get('profile/payment-methods')
  @RequirePermission('user.read')
  @ApiOperation({ summary: '获取支付方式列表', description: '获取当前用户的所有支付方式' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getPaymentMethods(@Request() req: any) {
    return this.usersService.getPaymentMethods(req.user.id);
  }

  @Post('profile/payment-methods')
  @RequirePermission('user.update')
  @ApiOperation({ summary: '添加支付方式', description: '为当前用户添加新的支付方式' })
  @ApiResponse({ status: 201, description: '添加成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createPaymentMethod(
    @Request() req: any,
    @Body() createPaymentMethodDto: CreatePaymentMethodDto
  ): Promise<ActionResult<any>> {
    const paymentMethod = await this.usersService.createPaymentMethod(
      req.user.id,
      createPaymentMethodDto
    );
    return { data: paymentMethod, message: '支付方式添加成功' };
  }

  @Patch('profile/payment-methods/:id')
  @RequirePermission('user.update')
  @ApiOperation({ summary: '更新支付方式', description: '更新支付方式信息' })
  @ApiParam({ name: 'id', description: '支付方式 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '支付方式不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async updatePaymentMethod(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updatePaymentMethodDto: UpdatePaymentMethodDto
  ): Promise<ActionResult<any>> {
    const paymentMethod = await this.usersService.updatePaymentMethod(
      req.user.id,
      id,
      updatePaymentMethodDto
    );
    return { data: paymentMethod, message: '支付方式更新成功' };
  }

  @Delete('profile/payment-methods/:id')
  @RequirePermission('user.update')
  @ApiOperation({ summary: '删除支付方式', description: '删除指定的支付方式' })
  @ApiParam({ name: 'id', description: '支付方式 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '支付方式不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async deletePaymentMethod(@Request() req: any, @Param('id') id: string): Promise<ActionResult> {
    await this.usersService.deletePaymentMethod(req.user.id, id);
    return { message: '支付方式删除成功' };
  }

  /**
   * 管理员重置用户密码
   */
  @Post(':id/reset-password')
  @RequirePermission('user.update')
  @ApiOperation({ summary: '重置用户密码', description: '管理员为指定用户重置密码' })
  @ApiParam({ name: 'id', description: '用户 ID' })
  @ApiResponse({ status: 200, description: '密码重置成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async resetUserPassword(
    @Param('id') userId: string,
    @Body() body: { newPassword: string }
  ): Promise<ActionResult> {
    await this.usersService.resetUserPassword(userId, body.newPassword);
    return { message: '密码重置成功' };
  }
}
