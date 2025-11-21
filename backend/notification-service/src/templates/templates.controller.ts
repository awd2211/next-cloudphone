import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto, QueryTemplateDto, RenderTemplateDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '@cloudphone/shared';
import { Public } from '../auth/decorators/public.decorator';

/**
 * 通知模板管理控制器
 *
 * 使用双层守卫：
 * 1. JwtAuthGuard - 验证 JWT token，设置 request.user
 * 2. PermissionsGuard - 检查用户权限
 */
@ApiTags('Notification Templates')
@Controller('templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * 创建模板
   * POST /templates
   * 🔒 需要 notification.template-create 权限
   */
  @Post()
  @RequirePermission('notification.template-create')
  create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templatesService.create(createTemplateDto);
  }

  /**
   * 查询模板列表
   * GET /templates?type=system&language=zh-CN&page=1&limit=10
   * 🔒 需要 notification.template-read 权限
   */
  @Get()
  @RequirePermission('notification.template-read')
  findAll(@Query() query: QueryTemplateDto) {
    return this.templatesService.findAll(query);
  }

  /**
   * 根据 ID 查找模板
   * GET /templates/:id
   * 🔒 需要 notification.template-read 权限
   */
  @Get(':id')
  @RequirePermission('notification.template-read')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  /**
   * 获取模板版本历史
   * GET /templates/:id/versions
   * 🔒 需要 notification.template-read 权限
   */
  @Get(':id/versions')
  @RequirePermission('notification.template-read')
  async getVersions(@Param('id') id: string) {
    // TODO: 实现完整的版本管理功能,需要创建 TemplateVersion 实体和表
    // 目前返回空数组,表示功能端点已存在但未完全实现
    await this.templatesService.findOne(id); // 验证模板存在
    return {
      success: true,
      data: [],
      message: '版本历史功能待实现 - 需要 TemplateVersion 实体',
    };
  }

  /**
   * 更新模板
   * PATCH /templates/:id
   * 🔒 需要 notification.template-update 权限
   */
  @Patch(':id')
  @RequirePermission('notification.template-update')
  update(@Param('id') id: string, @Body() updateTemplateDto: UpdateTemplateDto) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  /**
   * 更新模板 (PUT 别名)
   * PUT /templates/:id
   * 🔒 需要 notification.template-update 权限
   * 为了兼容前端 PUT 请求,添加此别名端点
   */
  @Put(':id')
  @RequirePermission('notification.template-update')
  updateViaPut(@Param('id') id: string, @Body() updateTemplateDto: UpdateTemplateDto) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  /**
   * 删除模板
   * DELETE /templates/:id
   * 🔒 需要 notification.template-delete 权限
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('notification.template-delete')
  async remove(@Param('id') id: string) {
    await this.templatesService.remove(id);
  }

  /**
   * 激活/停用模板
   * PATCH /templates/:id/toggle
   * 🔒 需要 notification.template-toggle 权限
   */
  @Patch(':id/toggle')
  @RequirePermission('notification.template-toggle')
  toggleActive(@Param('id') id: string) {
    return this.templatesService.toggleActive(id);
  }

  /**
   * 根据 code 查找模板
   * GET /templates/by-code/:code
   * 🔒 需要 notification.template-read 权限
   */
  @Get('by-code/:code')
  @RequirePermission('notification.template-read')
  findByCode(@Param('code') code: string, @Query('language') language?: string) {
    return this.templatesService.findByCode(code, language);
  }

  /**
   * 渲染模板
   * POST /templates/render
   * 🔒 需要 notification.template-render 权限
   */
  @Post('render')
  @RequirePermission('notification.template-render')
  async render(@Body() renderDto: RenderTemplateDto) {
    return this.templatesService.render(renderDto.templateCode, renderDto.data, renderDto.language);
  }

  /**
   * 验证模板语法
   * POST /templates/validate
   * 🔒 需要 notification.template-update 权限
   */
  @Post('validate')
  @RequirePermission('notification.template-update')
  async validate(@Body('template') template: string) {
    return this.templatesService.validateTemplate(template);
  }

  /**
   * 批量创建模板
   * POST /templates/bulk
   * 🔒 需要 notification.template-create 权限
   */
  @Post('bulk')
  @RequirePermission('notification.template-create')
  async bulkCreate(@Body('templates') templates: CreateTemplateDto[]) {
    return this.templatesService.bulkCreate(templates);
  }

  /**
   * 清除模板缓存
   * POST /templates/clear-cache
   * 🔒 需要 notification.template-update 权限（管理员操作）
   */
  @Post('clear-cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('notification.template-update')
  clearCache() {
    this.templatesService.clearCache();
  }
}
