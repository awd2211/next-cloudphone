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
import { Request as ExpressRequest } from 'express';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import {
  CreateDeviceFromTemplateDto,
  BatchCreateFromTemplateDto,
} from './dto/create-from-template.dto';
import {
  QuickListQueryDto,
  QuickListResponseDto,
} from './dto/quick-list.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TemplateCategory } from '../entities/device-template.entity';

interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    userId?: string;
    sub?: string;
  };
}

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
  async create(@Body() createTemplateDto: CreateTemplateDto, @Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.sub;

    // ✅ 验证 userId 必须存在
    if (!userId) {
      throw new Error('User authentication required');
    }

    this.logger.log(`User ${userId} creating template: ${createTemplateDto.name}`);
    return await this.templatesService.create(createTemplateDto, userId);
  }

  /**
   * 获取所有模板（支持过滤和分页）
   * GET /templates?category=gaming&isPublic=true&page=1&pageSize=20&search=关键词
   */
  @Get()
  async findAll(
    @Query('category') category?: TemplateCategory,
    @Query('isPublic') isPublic?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Request() req?: AuthenticatedRequest
  ) {
    // ✅ req 可选链处理
    const userId = req?.user?.userId || req?.user?.sub;
    const isPublicBool = isPublic === 'true' ? true : isPublic === 'false' ? false : undefined;

    // 转换分页参数（page/pageSize -> limit/offset）
    const currentPage = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limit = pageSize ? Math.max(1, Math.min(100, parseInt(pageSize, 10))) : 20;
    const offset = (currentPage - 1) * limit;

    const { templates, total } = await this.templatesService.findAll(
      category,
      isPublicBool,
      userId,
      search,
      limit,
      offset
    );

    return {
      items: templates,
      total,
      page: currentPage,
      pageSize: limit,
    };
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
   * 获取模板统计信息
   * GET /templates/stats
   */
  @Get('stats')
  async getStats() {
    return await this.templatesService.getTemplateStats();
  }

  /**
   * 搜索模板
   * GET /templates/search?q=游戏
   */
  @Get('search')
  async search(@Query('q') query: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.sub;

    // ✅ 验证 userId（搜索操作需要用户上下文）
    if (!userId) {
      throw new Error('User authentication required');
    }

    return await this.templatesService.searchTemplates(query, userId);
  }

  /**
   * 获取模板快速列表（用于下拉框等UI组件）
   * GET /templates/quick-list?status=gaming&limit=10
   */
  @Get('quick-list')
  async getQuickList(@Query() query: QuickListQueryDto) {
    const result = await this.templatesService.getQuickList(query);
    return {
      ...result,
      message: '模板快速列表获取成功',
    };
  }

  /**
   * 获取单个模板
   * GET /templates/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.sub;

    // ✅ userId 可选（findOne 支持可选 userId）
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
    @Request() req: AuthenticatedRequest
  ) {
    const userId = req.user?.userId || req.user?.sub;

    // ✅ 验证 userId 必须存在
    if (!userId) {
      throw new Error('User authentication required');
    }

    return await this.templatesService.update(id, updateTemplateDto, userId);
  }

  /**
   * 删除模板
   * DELETE /templates/:id
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.sub;

    // ✅ 验证 userId 必须存在
    if (!userId) {
      throw new Error('User authentication required');
    }

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
    @Request() req: AuthenticatedRequest
  ) {
    const userId = req.user?.userId || req.user?.sub;

    // ✅ 验证 userId 必须存在
    if (!userId) {
      throw new Error('User authentication required');
    }

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
    @Request() req: AuthenticatedRequest
  ) {
    const userId = req.user?.userId || req.user?.sub;

    // ✅ 验证 userId 必须存在
    if (!userId) {
      throw new Error('User authentication required');
    }

    this.logger.log(`User ${userId} batch creating ${dto.count} devices from template ${id}`);
    return await this.templatesService.batchCreateFromTemplate(id, dto, userId);
  }
}
