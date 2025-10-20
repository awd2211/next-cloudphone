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
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
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
  async findByResource(@Param('resource') resource: string) {
    const permissions = await this.permissionsService.findByResource(resource);
    return {
      success: true,
      data: permissions,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const permission = await this.permissionsService.findOne(id);
    return {
      success: true,
      data: permission,
    };
  }

  @Patch(':id')
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
  async remove(@Param('id') id: string) {
    await this.permissionsService.remove(id);
    return {
      success: true,
      message: '权限删除成功',
    };
  }
}
