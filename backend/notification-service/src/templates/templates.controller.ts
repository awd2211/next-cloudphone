import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto, QueryTemplateDto, RenderTemplateDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

// 🔒 整个控制器需要 JWT 认证
@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * 创建模板
   * POST /templates
   * 🔒 需要 admin 或 template-manager 角色
   */
  @Post()
  @Roles('admin', 'template-manager')
  create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templatesService.create(createTemplateDto);
  }

  /**
   * 查询模板列表
   * GET /templates?type=system&language=zh-CN&page=1&limit=10
   * 🔒 需要认证（任何登录用户都可以查看）
   */
  @Get()
  findAll(@Query() query: QueryTemplateDto) {
    return this.templatesService.findAll(query);
  }

  /**
   * 根据 ID 查找模板
   * GET /templates/:id
   * 🔒 需要认证（任何登录用户都可以查看）
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  /**
   * 更新模板
   * PATCH /templates/:id
   * 🔒 需要 admin 或 template-manager 角色
   */
  @Patch(':id')
  @Roles('admin', 'template-manager')
  update(@Param('id') id: string, @Body() updateTemplateDto: UpdateTemplateDto) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  /**
   * 删除模板
   * DELETE /templates/:id
   * 🔒 需要 admin 或 template-manager 角色
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'template-manager')
  async remove(@Param('id') id: string) {
    await this.templatesService.remove(id);
  }

  /**
   * 激活/停用模板
   * PATCH /templates/:id/toggle
   * 🔒 需要 admin 或 template-manager 角色
   */
  @Patch(':id/toggle')
  @Roles('admin', 'template-manager')
  toggleActive(@Param('id') id: string) {
    return this.templatesService.toggleActive(id);
  }

  /**
   * 根据 code 查找模板
   * GET /templates/by-code/:code
   * 🔒 需要认证（任何登录用户都可以查看）
   */
  @Get('by-code/:code')
  findByCode(@Param('code') code: string, @Query('language') language?: string) {
    return this.templatesService.findByCode(code, language);
  }

  /**
   * 渲染模板
   * POST /templates/render
   * 🔒 需要认证（任何登录用户都可以渲染）
   */
  @Post('render')
  async render(@Body() renderDto: RenderTemplateDto) {
    return this.templatesService.render(renderDto.templateCode, renderDto.data, renderDto.language);
  }

  /**
   * 验证模板语法
   * POST /templates/validate
   * 🔒 需要 admin 或 template-manager 角色
   */
  @Post('validate')
  @Roles('admin', 'template-manager')
  async validate(@Body('template') template: string) {
    return this.templatesService.validateTemplate(template);
  }

  /**
   * 批量创建模板
   * POST /templates/bulk
   * 🔒 需要 admin 或 template-manager 角色
   */
  @Post('bulk')
  @Roles('admin', 'template-manager')
  async bulkCreate(@Body('templates') templates: CreateTemplateDto[]) {
    return this.templatesService.bulkCreate(templates);
  }

  /**
   * 清除模板缓存
   * POST /templates/clear-cache
   * 🔒 需要 admin 角色
   */
  @Post('clear-cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  clearCache() {
    this.templatesService.clearCache();
  }
}
