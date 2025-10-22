import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as Handlebars from 'handlebars';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { CreateTemplateDto, UpdateTemplateDto, QueryTemplateDto, RenderTemplateDto } from './dto';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
  ) {
    this.registerHelpers();
  }

  /**
   * 注册 Handlebars 辅助函数
   */
  private registerHelpers() {
    // 格式化日期
    Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) return '';
      const d = new Date(date);
      // 简单的日期格式化,可以使用 date-fns 等库增强
      return d.toLocaleDateString('zh-CN');
    });

    // 条件判断
    Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    // 数字格式化
    Handlebars.registerHelper('formatNumber', (number: number) => {
      return new Intl.NumberFormat('zh-CN').format(number);
    });

    // 货币格式化
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
      }).format(amount);
    });

    this.logger.log('Handlebars helpers registered');
  }

  /**
   * 创建模板
   */
  async create(createTemplateDto: CreateTemplateDto): Promise<NotificationTemplate> {
    // 检查 code 是否已存在
    const existing = await this.templateRepository.findOne({
      where: { code: createTemplateDto.code },
    });

    if (existing) {
      throw new ConflictException(`Template with code "${createTemplateDto.code}" already exists`);
    }

    const template = this.templateRepository.create({
      ...createTemplateDto,
      language: createTemplateDto.language || 'zh-CN',
      isActive: createTemplateDto.isActive !== false,
    });

    const saved = await this.templateRepository.save(template);
    this.logger.log(`Template created: ${saved.code}`);

    return saved;
  }

  /**
   * 查询模板列表（分页）
   */
  async findAll(query: QueryTemplateDto) {
    const { type, language, isActive, search, page = 1, limit = 10 } = query;

    const queryBuilder = this.templateRepository.createQueryBuilder('template');

    // 过滤条件
    if (type) {
      queryBuilder.andWhere('template.type = :type', { type });
    }

    if (language) {
      queryBuilder.andWhere('template.language = :language', { language });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('template.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere(
        '(template.name LIKE :search OR template.code LIKE :search OR template.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 排序
    queryBuilder.orderBy('template.createdAt', 'DESC');

    // 分页
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 根据 ID 查找模板
   */
  async findOne(id: string): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });

    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }

    return template;
  }

  /**
   * 根据 code 查找模板
   */
  async findByCode(code: string, language?: string): Promise<NotificationTemplate> {
    const where: any = { code, isActive: true };
    if (language) {
      where.language = language;
    }

    const template = await this.templateRepository.findOne({ where });

    if (!template) {
      throw new NotFoundException(`Template with code "${code}" not found`);
    }

    return template;
  }

  /**
   * 更新模板
   */
  async update(id: string, updateTemplateDto: UpdateTemplateDto): Promise<NotificationTemplate> {
    const template = await this.findOne(id);

    // 如果更新 code,检查是否与其他模板冲突
    if (updateTemplateDto.code && updateTemplateDto.code !== template.code) {
      const existing = await this.templateRepository.findOne({
        where: { code: updateTemplateDto.code },
      });

      if (existing) {
        throw new ConflictException(`Template with code "${updateTemplateDto.code}" already exists`);
      }
    }

    Object.assign(template, updateTemplateDto);
    const saved = await this.templateRepository.save(template);

    // 清除已编译的模板缓存
    const cacheKey = `${template.code}:${template.language}`;
    this.compiledTemplates.delete(cacheKey);

    this.logger.log(`Template updated: ${saved.code}`);

    return saved;
  }

  /**
   * 删除模板
   */
  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepository.remove(template);

    // 清除已编译的模板缓存
    const cacheKey = `${template.code}:${template.language}`;
    this.compiledTemplates.delete(cacheKey);

    this.logger.log(`Template deleted: ${template.code}`);
  }

  /**
   * 激活/停用模板
   */
  async toggleActive(id: string): Promise<NotificationTemplate> {
    const template = await this.findOne(id);
    template.isActive = !template.isActive;
    return this.templateRepository.save(template);
  }

  /**
   * 渲染模板
   */
  async render(templateCode: string, data: Record<string, any>, language?: string): Promise<{
    title: string;
    body: string;
    emailHtml?: string;
    smsText?: string;
  }> {
    const template = await this.findByCode(templateCode, language);

    // 合并默认数据和传入数据
    const mergedData = {
      ...template.defaultData,
      ...data,
    };

    try {
      // 渲染标题
      const title = this.compileAndRender(
        template.title,
        mergedData,
        `${templateCode}:title:${language}`,
      );

      // 渲染内容
      const body = this.compileAndRender(
        template.body,
        mergedData,
        `${templateCode}:body:${language}`,
      );

      // 渲染邮件模板（如果有）
      let emailHtml: string | undefined;
      if (template.emailTemplate) {
        emailHtml = this.compileAndRender(
          template.emailTemplate,
          mergedData,
          `${templateCode}:email:${language}`,
        );
      }

      // 渲染短信模板（如果有）
      let smsText: string | undefined;
      if (template.smsTemplate) {
        smsText = this.compileAndRender(
          template.smsTemplate,
          mergedData,
          `${templateCode}:sms:${language}`,
        );
      }

      this.logger.log(`Template rendered: ${templateCode}`);

      return {
        title,
        body,
        emailHtml,
        smsText,
      };
    } catch (error) {
      this.logger.error(`Failed to render template ${templateCode}:`, error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * 编译并渲染模板字符串
   */
  private compileAndRender(
    templateString: string,
    data: Record<string, any>,
    cacheKey: string,
  ): string {
    // 尝试从缓存获取已编译的模板
    let compiled = this.compiledTemplates.get(cacheKey);

    if (!compiled) {
      // 编译模板并缓存
      compiled = Handlebars.compile(templateString);
      this.compiledTemplates.set(cacheKey, compiled);
    }

    // 渲染模板
    return compiled(data);
  }

  /**
   * 验证模板语法
   */
  async validateTemplate(templateString: string): Promise<{ valid: boolean; error?: string }> {
    try {
      Handlebars.compile(templateString);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * 批量创建模板
   */
  async bulkCreate(templates: CreateTemplateDto[]): Promise<NotificationTemplate[]> {
    const results: NotificationTemplate[] = [];

    for (const dto of templates) {
      try {
        const template = await this.create(dto);
        results.push(template);
      } catch (error) {
        this.logger.warn(`Failed to create template ${dto.code}: ${error.message}`);
        // 继续处理其他模板
      }
    }

    this.logger.log(`Bulk created ${results.length} templates`);
    return results;
  }

  /**
   * 清除编译缓存
   */
  clearCache() {
    this.compiledTemplates.clear();
    this.logger.log('Template compilation cache cleared');
  }
}
