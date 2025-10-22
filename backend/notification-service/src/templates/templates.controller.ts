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

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * 创建模板
   * POST /templates
   */
  @Post()
  create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templatesService.create(createTemplateDto);
  }

  /**
   * 查询模板列表
   * GET /templates?type=system&language=zh-CN&page=1&limit=10
   */
  @Get()
  findAll(@Query() query: QueryTemplateDto) {
    return this.templatesService.findAll(query);
  }

  /**
   * 根据 ID 查找模板
   * GET /templates/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  /**
   * 更新模板
   * PATCH /templates/:id
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTemplateDto: UpdateTemplateDto) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  /**
   * 删除模板
   * DELETE /templates/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.templatesService.remove(id);
  }

  /**
   * 激活/停用模板
   * PATCH /templates/:id/toggle
   */
  @Patch(':id/toggle')
  toggleActive(@Param('id') id: string) {
    return this.templatesService.toggleActive(id);
  }

  /**
   * 根据 code 查找模板
   * GET /templates/by-code/:code
   */
  @Get('by-code/:code')
  findByCode(
    @Param('code') code: string,
    @Query('language') language?: string,
  ) {
    return this.templatesService.findByCode(code, language);
  }

  /**
   * 渲染模板
   * POST /templates/render
   */
  @Post('render')
  async render(@Body() renderDto: RenderTemplateDto) {
    return this.templatesService.render(
      renderDto.templateCode,
      renderDto.data,
      renderDto.language,
    );
  }

  /**
   * 验证模板语法
   * POST /templates/validate
   */
  @Post('validate')
  async validate(@Body('template') template: string) {
    return this.templatesService.validateTemplate(template);
  }

  /**
   * 批量创建模板
   * POST /templates/bulk
   */
  @Post('bulk')
  async bulkCreate(@Body('templates') templates: CreateTemplateDto[]) {
    return this.templatesService.bulkCreate(templates);
  }

  /**
   * 清除模板缓存
   * POST /templates/clear-cache
   */
  @Post('clear-cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearCache() {
    this.templatesService.clearCache();
  }
}
