import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SiteSetting,
  SettingCategory,
} from './entities/site-setting.entity';
import { CmsContent } from './entities/cms-content.entity';
import { JobPosition } from './entities/job-position.entity';
import { LegalDocument, LegalDocumentType } from './entities/legal-document.entity';
import { CaseStudy } from './entities/case-study.entity';
import { PricingPlan } from './entities/pricing-plan.entity';
import {
  UpdateSiteSettingDto,
  CreateCmsContentDto,
  UpdateCmsContentDto,
  CreateJobPositionDto,
  UpdateJobPositionDto,
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
  CreateCaseStudyDto,
  UpdateCaseStudyDto,
  CreatePricingPlanDto,
  UpdatePricingPlanDto,
} from './dto';

@Injectable()
export class CmsService {
  private readonly logger = new Logger(CmsService.name);

  constructor(
    @InjectRepository(SiteSetting)
    private siteSettingRepo: Repository<SiteSetting>,
    @InjectRepository(CmsContent)
    private cmsContentRepo: Repository<CmsContent>,
    @InjectRepository(JobPosition)
    private jobPositionRepo: Repository<JobPosition>,
    @InjectRepository(LegalDocument)
    private legalDocumentRepo: Repository<LegalDocument>,
    @InjectRepository(CaseStudy)
    private caseStudyRepo: Repository<CaseStudy>,
    @InjectRepository(PricingPlan)
    private pricingPlanRepo: Repository<PricingPlan>,
  ) {}

  // ==================== Site Settings ====================

  async getAllSettings(): Promise<SiteSetting[]> {
    return this.siteSettingRepo.find({ order: { category: 'ASC', key: 'ASC' } });
  }

  async getSettingsByCategory(category: SettingCategory): Promise<SiteSetting[]> {
    return this.siteSettingRepo.find({
      where: { category },
      order: { key: 'ASC' },
    });
  }

  async getSetting(key: string): Promise<SiteSetting> {
    const setting = await this.siteSettingRepo.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }
    return setting;
  }

  async updateSetting(key: string, dto: UpdateSiteSettingDto): Promise<SiteSetting> {
    const setting = await this.getSetting(key);
    Object.assign(setting, dto);
    return this.siteSettingRepo.save(setting);
  }

  async batchUpdateSettings(settings: Record<string, string>): Promise<SiteSetting[]> {
    const results: SiteSetting[] = [];
    for (const [key, value] of Object.entries(settings)) {
      try {
        const setting = await this.siteSettingRepo.findOne({ where: { key } });
        if (setting) {
          setting.value = value;
          results.push(await this.siteSettingRepo.save(setting));
        }
      } catch (error) {
        this.logger.warn(`Failed to update setting ${key}: ${error.message}`);
      }
    }
    return results;
  }

  /**
   * 获取格式化的设置数据（供前端使用）
   * 将设置转换为嵌套对象结构
   */
  async getFormattedSettings(): Promise<Record<string, any>> {
    const settings = await this.getAllSettings();
    const result: Record<string, any> = {};

    for (const setting of settings) {
      const keys = setting.key.split('.');
      let current = result;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = setting.getParsedValue();
    }

    return result;
  }

  // ==================== CMS Content ====================

  async getContents(page?: string, section?: string): Promise<CmsContent[]> {
    const where: any = { isActive: true };
    if (page) where.page = page;
    if (section) where.section = section;

    return this.cmsContentRepo.find({
      where,
      order: { sortOrder: 'ASC' },
    });
  }

  async getAllContents(): Promise<CmsContent[]> {
    return this.cmsContentRepo.find({
      order: { page: 'ASC', section: 'ASC', sortOrder: 'ASC' },
    });
  }

  async getContentById(id: string): Promise<CmsContent> {
    const content = await this.cmsContentRepo.findOne({ where: { id } });
    if (!content) {
      throw new NotFoundException(`Content with id "${id}" not found`);
    }
    return content;
  }

  async createContent(dto: CreateCmsContentDto): Promise<CmsContent> {
    const content = this.cmsContentRepo.create(dto);
    return this.cmsContentRepo.save(content);
  }

  async updateContent(id: string, dto: UpdateCmsContentDto): Promise<CmsContent> {
    const content = await this.getContentById(id);
    Object.assign(content, dto);
    return this.cmsContentRepo.save(content);
  }

  async deleteContent(id: string): Promise<void> {
    const result = await this.cmsContentRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Content with id "${id}" not found`);
    }
  }

  // ==================== Job Positions ====================

  async getJobPositions(activeOnly = true): Promise<JobPosition[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.jobPositionRepo.find({
      where,
      order: { sortOrder: 'ASC' },
    });
  }

  async getJobPositionById(id: string): Promise<JobPosition> {
    const job = await this.jobPositionRepo.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job position with id "${id}" not found`);
    }
    return job;
  }

  async createJobPosition(dto: CreateJobPositionDto): Promise<JobPosition> {
    const job = this.jobPositionRepo.create(dto);
    return this.jobPositionRepo.save(job);
  }

  async updateJobPosition(id: string, dto: UpdateJobPositionDto): Promise<JobPosition> {
    const job = await this.getJobPositionById(id);
    Object.assign(job, dto);
    return this.jobPositionRepo.save(job);
  }

  async deleteJobPosition(id: string): Promise<void> {
    const result = await this.jobPositionRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Job position with id "${id}" not found`);
    }
  }

  // ==================== Legal Documents ====================

  async getLegalDocuments(): Promise<LegalDocument[]> {
    return this.legalDocumentRepo.find({ order: { type: 'ASC' } });
  }

  async getLegalDocumentByType(type: LegalDocumentType): Promise<LegalDocument> {
    const doc = await this.legalDocumentRepo.findOne({ where: { type } });
    if (!doc) {
      throw new NotFoundException(`Legal document of type "${type}" not found`);
    }
    return doc;
  }

  async createLegalDocument(dto: CreateLegalDocumentDto): Promise<LegalDocument> {
    const doc = this.legalDocumentRepo.create(dto);
    return this.legalDocumentRepo.save(doc);
  }

  async updateLegalDocument(type: LegalDocumentType, dto: UpdateLegalDocumentDto): Promise<LegalDocument> {
    const doc = await this.getLegalDocumentByType(type);
    Object.assign(doc, dto);
    return this.legalDocumentRepo.save(doc);
  }

  // ==================== Case Studies ====================

  async getCaseStudies(activeOnly = true): Promise<CaseStudy[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.caseStudyRepo.find({
      where,
      order: { sortOrder: 'ASC' },
    });
  }

  async getFeaturedCaseStudies(): Promise<CaseStudy[]> {
    return this.caseStudyRepo.find({
      where: { isActive: true, isFeatured: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async getCaseStudyById(id: string): Promise<CaseStudy> {
    const study = await this.caseStudyRepo.findOne({ where: { id } });
    if (!study) {
      throw new NotFoundException(`Case study with id "${id}" not found`);
    }
    return study;
  }

  async createCaseStudy(dto: CreateCaseStudyDto): Promise<CaseStudy> {
    const study = this.caseStudyRepo.create(dto);
    return this.caseStudyRepo.save(study);
  }

  async updateCaseStudy(id: string, dto: UpdateCaseStudyDto): Promise<CaseStudy> {
    const study = await this.getCaseStudyById(id);
    Object.assign(study, dto);
    return this.caseStudyRepo.save(study);
  }

  async deleteCaseStudy(id: string): Promise<void> {
    const result = await this.caseStudyRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Case study with id "${id}" not found`);
    }
  }

  // ==================== Pricing Plans ====================

  async getPricingPlans(activeOnly = true): Promise<PricingPlan[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.pricingPlanRepo.find({
      where,
      order: { sortOrder: 'ASC' },
    });
  }

  async getPricingPlanById(id: string): Promise<PricingPlan> {
    const plan = await this.pricingPlanRepo.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Pricing plan with id "${id}" not found`);
    }
    return plan;
  }

  async createPricingPlan(dto: CreatePricingPlanDto): Promise<PricingPlan> {
    const plan = this.pricingPlanRepo.create(dto);
    return this.pricingPlanRepo.save(plan);
  }

  async updatePricingPlan(id: string, dto: UpdatePricingPlanDto): Promise<PricingPlan> {
    const plan = await this.getPricingPlanById(id);
    Object.assign(plan, dto);
    return this.pricingPlanRepo.save(plan);
  }

  async deletePricingPlan(id: string): Promise<void> {
    const result = await this.pricingPlanRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Pricing plan with id "${id}" not found`);
    }
  }
}
