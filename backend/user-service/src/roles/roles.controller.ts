import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  async create(@Body() createRoleDto: CreateRoleDto) {
    const role = await this.rolesService.create(createRoleDto);
    return {
      success: true,
      data: role,
      message: '角色创建成功',
    };
  }

  @Get()
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
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.findOne(id);
    return {
      success: true,
      data: role,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    const role = await this.rolesService.update(id, updateRoleDto);
    return {
      success: true,
      data: role,
      message: '角色更新成功',
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
    return {
      success: true,
      message: '角色删除成功',
    };
  }

  @Post(':id/permissions')
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
