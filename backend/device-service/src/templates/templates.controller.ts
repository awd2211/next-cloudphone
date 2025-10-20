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
  Logger,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import {
  CreateDeviceFromTemplateDto,
  BatchCreateFromTemplateDto,
} from './dto/create-from-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TemplateCategory } from '../entities/device-template.entity';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  private readonly logger = new Logger(TemplatesController.name);

  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * 创建设备模板
   * POST /templates
   */
  @Post()
  async create(@Body() createTemplateDto: CreateTemplateDto, @Request() req) {
    const userId = req.user?.userId || req.user?.sub;
    this.logger.log(`User ${userId} creating template: ${createTemplateDto.name}`);
    return await this.templatesService.create(createTemplateDto, userId);
  }

  /**
   * 获取所有模板（支持过滤）
   * GET /templates?category=gaming&isPublic=true
   */
  @Get()
  async findAll(
    @Query('category') category?: TemplateCategory,
    @Query('isPublic') isPublic?: string,
    @Request() req?,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    const isPublicBool = isPublic === 'true' ? true : isPublic === 'false' ? false : undefined;

    return await this.templatesService.findAll(category, isPublicBool, userId);
  }

  /**
   * 获取热门模板
   * GET /templates/popular?limit=10
   */
  @Get('popular')
  async getPopular(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return await this.templatesService.getPopularTemplates(limitNum);
  }

  /**
   * 搜索模板
   * GET /templates/search?q=游戏
   */
  @Get('search')
  async search(@Query('q') query: string, @Request() req) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.templatesService.searchTemplates(query, userId);
  }

  /**
   * 获取单个模板
   * GET /templates/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.templatesService.findOne(id, userId);
  }

  /**
   * 更新模板
   * PATCH /templates/:id
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
    @Request() req,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.templatesService.update(id, updateTemplateDto, userId);
  }

  /**
   * 删除模板
   * DELETE /templates/:id
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.sub;
    await this.templatesService.remove(id, userId);
    return { message: 'Template deleted successfully' };
  }

  /**
   * 从模板创建单个设备
   * POST /templates/:id/create-device
   */
  @Post(':id/create-device')
  async createDevice(
    @Param('id') id: string,
    @Body() dto: CreateDeviceFromTemplateDto,
    @Request() req,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    this.logger.log(`User ${userId} creating device from template ${id}`);
    return await this.templatesService.createDeviceFromTemplate(id, dto, userId);
  }

  /**
   * 从模板批量创建设备
   * POST /templates/:id/batch-create
   */
  @Post(':id/batch-create')
  async batchCreate(
    @Param('id') id: string,
    @Body() dto: BatchCreateFromTemplateDto,
    @Request() req,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    this.logger.log(
      `User ${userId} batch creating ${dto.count} devices from template ${id}`,
    );
    return await this.templatesService.batchCreateFromTemplate(id, dto, userId);
  }
}
