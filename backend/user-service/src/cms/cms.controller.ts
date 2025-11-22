import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CmsService } from './cms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SettingCategory } from './entities/site-setting.entity';
import { LegalDocumentType } from './entities/legal-document.entity';
import {
  UpdateSiteSettingDto,
  BatchUpdateSettingsDto,
  CreateCmsContentDto,
  UpdateCmsContentDto,
  CreateJobPositionDto,
  UpdateJobPositionDto,
  UpdateLegalDocumentDto,
  CreateCaseStudyDto,
  UpdateCaseStudyDto,
  CreatePricingPlanDto,
  UpdatePricingPlanDto,
} from './dto';

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // ==================== Site Settings ====================

  /**
   * 获取所有网站设置（公开接口，供前端官网使用）
   */
  @Public()
  @Get('settings')
  async getSettings() {
    return this.cmsService.getFormattedSettings();
  }

  /**
   * 获取所有设置（管理接口）
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('settings/all')
  async getAllSettings() {
    return this.cmsService.getAllSettings();
  }

  /**
   * 按分类获取设置
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('settings/category/:category')
  async getSettingsByCategory(@Param('category') category: SettingCategory) {
    return this.cmsService.getSettingsByCategory(category);
  }

  /**
   * 更新单个设置
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Put('settings/:key')
  async updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSiteSettingDto,
  ) {
    return this.cmsService.updateSetting(key, dto);
  }

  /**
   * 批量更新设置
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Put('settings')
  async batchUpdateSettings(@Body() dto: BatchUpdateSettingsDto) {
    return this.cmsService.batchUpdateSettings(dto.settings);
  }

  // ==================== CMS Content ====================

  /**
   * 获取页面内容（公开接口）
   */
  @Public()
  @Get('contents')
  async getContents(
    @Query('page') page?: string,
    @Query('section') section?: string,
  ) {
    return this.cmsService.getContents(page, section);
  }

  /**
   * 获取所有内容（管理接口）
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('contents/all')
  async getAllContents() {
    return this.cmsService.getAllContents();
  }

  /**
   * 获取单个内容
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('contents/:id')
  async getContentById(@Param('id') id: string) {
    return this.cmsService.getContentById(id);
  }

  /**
   * 创建内容
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Post('contents')
  async createContent(@Body() dto: CreateCmsContentDto) {
    return this.cmsService.createContent(dto);
  }

  /**
   * 更新内容
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Put('contents/:id')
  async updateContent(
    @Param('id') id: string,
    @Body() dto: UpdateCmsContentDto,
  ) {
    return this.cmsService.updateContent(id, dto);
  }

  /**
   * 删除内容
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Delete('contents/:id')
  async deleteContent(@Param('id') id: string) {
    await this.cmsService.deleteContent(id);
    return { success: true };
  }

  // ==================== Job Positions ====================

  /**
   * 获取招聘职位（公开接口）
   */
  @Public()
  @Get('jobs')
  async getJobPositions() {
    return this.cmsService.getJobPositions(true);
  }

  /**
   * 获取所有职位（管理接口）
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('jobs/all')
  async getAllJobPositions() {
    return this.cmsService.getJobPositions(false);
  }

  /**
   * 获取单个职位
   */
  @Get('jobs/:id')
  async getJobPositionById(@Param('id') id: string) {
    return this.cmsService.getJobPositionById(id);
  }

  /**
   * 创建职位
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Post('jobs')
  async createJobPosition(@Body() dto: CreateJobPositionDto) {
    return this.cmsService.createJobPosition(dto);
  }

  /**
   * 更新职位
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Put('jobs/:id')
  async updateJobPosition(
    @Param('id') id: string,
    @Body() dto: UpdateJobPositionDto,
  ) {
    return this.cmsService.updateJobPosition(id, dto);
  }

  /**
   * 删除职位
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Delete('jobs/:id')
  async deleteJobPosition(@Param('id') id: string) {
    await this.cmsService.deleteJobPosition(id);
    return { success: true };
  }

  // ==================== Legal Documents ====================

  /**
   * 获取所有法律文档（公开接口）
   */
  @Public()
  @Get('legal')
  async getLegalDocuments() {
    return this.cmsService.getLegalDocuments();
  }

  /**
   * 获取指定类型的法律文档（公开接口）
   */
  @Public()
  @Get('legal/:type')
  async getLegalDocumentByType(@Param('type') type: LegalDocumentType) {
    return this.cmsService.getLegalDocumentByType(type);
  }

  /**
   * 更新法律文档
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Put('legal/:type')
  async updateLegalDocument(
    @Param('type') type: LegalDocumentType,
    @Body() dto: UpdateLegalDocumentDto,
  ) {
    return this.cmsService.updateLegalDocument(type, dto);
  }

  // ==================== Case Studies ====================

  /**
   * 获取客户案例（公开接口）
   */
  @Public()
  @Get('cases')
  async getCaseStudies(@Query('featured') featured?: string) {
    if (featured === 'true') {
      return this.cmsService.getFeaturedCaseStudies();
    }
    return this.cmsService.getCaseStudies(true);
  }

  /**
   * 获取所有案例（管理接口）
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('cases/all')
  async getAllCaseStudies() {
    return this.cmsService.getCaseStudies(false);
  }

  /**
   * 获取单个案例
   */
  @Get('cases/:id')
  async getCaseStudyById(@Param('id') id: string) {
    return this.cmsService.getCaseStudyById(id);
  }

  /**
   * 创建案例
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Post('cases')
  async createCaseStudy(@Body() dto: CreateCaseStudyDto) {
    return this.cmsService.createCaseStudy(dto);
  }

  /**
   * 更新案例
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Put('cases/:id')
  async updateCaseStudy(
    @Param('id') id: string,
    @Body() dto: UpdateCaseStudyDto,
  ) {
    return this.cmsService.updateCaseStudy(id, dto);
  }

  /**
   * 删除案例
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Delete('cases/:id')
  async deleteCaseStudy(@Param('id') id: string) {
    await this.cmsService.deleteCaseStudy(id);
    return { success: true };
  }

  // ==================== Pricing Plans ====================

  /**
   * 获取定价方案（公开接口）
   */
  @Public()
  @Get('pricing')
  async getPricingPlans() {
    return this.cmsService.getPricingPlans(true);
  }

  /**
   * 获取所有定价方案（管理接口）
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Get('pricing/all')
  async getAllPricingPlans() {
    return this.cmsService.getPricingPlans(false);
  }

  /**
   * 获取单个定价方案
   */
  @Get('pricing/:id')
  async getPricingPlanById(@Param('id') id: string) {
    return this.cmsService.getPricingPlanById(id);
  }

  /**
   * 创建定价方案
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Post('pricing')
  async createPricingPlan(@Body() dto: CreatePricingPlanDto) {
    return this.cmsService.createPricingPlan(dto);
  }

  /**
   * 更新定价方案
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Put('pricing/:id')
  async updatePricingPlan(
    @Param('id') id: string,
    @Body() dto: UpdatePricingPlanDto,
  ) {
    return this.cmsService.updatePricingPlan(id, dto);
  }

  /**
   * 删除定价方案
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  @Delete('pricing/:id')
  async deletePricingPlan(@Param('id') id: string) {
    await this.cmsService.deletePricingPlan(id);
    return { success: true };
  }
}
