import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as Handlebars from 'handlebars';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { CreateTemplateDto, UpdateTemplateDto, QueryTemplateDto, RenderTemplateDto } from './dto';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTTL } from '../cache/cache-keys';

/**
 * 允许的模板变量白名单
 * 只允许访问这些预定义的字段
 */
const ALLOWED_TEMPLATE_VARIABLES = [
  'userName',
  'userEmail',
  'userId',
  'deviceName',
  'deviceId',
  'deviceStatus',
  'deviceType',
  'deviceUrl',
  'providerType',
  'providerDisplayName',
  'tenantId',
  'cpuCores',
  'memoryMB',
  'diskSizeGB',
  'spec',
  'onlineDevices',
  'todayCreated',
  'totalDevices',
  'systemStats',
  'tenantStats',
  'adminDashboardUrl',
  'tenantDashboardUrl',
  'createdAt',
  'appName',
  'appVersion',
  'amount',
  'planName',
  'expireDate',
  'orderNo',
  'title',
  'content',
  'link',
  'time',
  'date',
  'verificationCode',
  'code',
  'message',
  'quotaUsed',
  'quotaTotal',
  'quotaPercent',
] as const;

/**
 * 危险的 Handlebars 表达式模式
 * 这些模式可能导致 SSTI 攻击
 */
const DANGEROUS_PATTERNS = [
  /{{[^}]*constructor[^}]*}}/gi, // 访问 constructor
  /{{[^}]*prototype[^}]*}}/gi, // 访问 prototype
  /{{[^}]*__proto__[^}]*}}/gi, // 访问 __proto__
  /{{[^}]*\[\s*["']/gi, // 方括号访问属性
  /{{[^}]*process[^}]*}}/gi, // 访问 process 对象
  /{{[^}]*require[^}]*}}/gi, // require 函数
  /{{[^}]*import[^}]*}}/gi, // import 语句
  /{{[^}]*eval[^}]*}}/gi, // eval 函数
  /{{[^}]*Function[^}]*}}/gi, // Function 构造函数
  /{{[^}]*globalThis[^}]*}}/gi, // globalThis
  /{{[^}]*global[^}]*}}/gi, // global 对象
  /{{[^}]*this\.constructor[^}]*}}/gi, // this.constructor
] as const;

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private sandboxedHandlebars: typeof Handlebars;

  constructor(
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
    private cacheService: CacheService
  ) {
    // 🔒 安全初始化：创建独立的沙箱 Handlebars 实例
    this.sandboxedHandlebars = Handlebars.create();
    this.registerHelpers();
    this.configureSecurity();
  }

  /**
   * 🔒 配置 Handlebars 安全策略
   */
  private configureSecurity() {
    // 注意：使用独立的 Handlebars 实例已经提供了基本的隔离
    // 额外的安全措施在 compileAndRender 中实施：
    // - 数据白名单过滤
    // - 模板验证
    // - 严格模式编译

    this.logger.log('Handlebars security configured: sandboxed instance created with strict mode');
  }

  /**
   * 注册 Handlebars 辅助函数（使用沙箱实例）
   */
  private registerHelpers() {
    // 🔒 使用沙箱实例注册 helpers
    // 格式化日期
    this.sandboxedHandlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) return '';
      const d = new Date(date);
      // 简单的日期格式化,可以使用 date-fns 等库增强
      return d.toLocaleDateString('zh-CN');
    });

    // 条件判断
    this.sandboxedHandlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    // 数字格式化
    this.sandboxedHandlebars.registerHelper('formatNumber', (number: number) => {
      return new Intl.NumberFormat('zh-CN').format(number);
    });

    // 货币格式化
    this.sandboxedHandlebars.registerHelper('formatCurrency', (amount: number) => {
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
      }).format(amount);
    });

    this.logger.log('Handlebars helpers registered on sandboxed instance');
  }

  /**
   * 🔒 验证模板安全性
   * 检测是否包含危险的表达式
   */
  private validateTemplateSecurity(templateString: string): void {
    // 检查危险模式
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(templateString)) {
        this.logger.error(`Template contains dangerous pattern: ${pattern.source}`);
        throw new BadRequestException(`模板包含不安全的表达式，请检查后重试`);
      }
    }

    // 提取模板中使用的变量
    const variablePattern = /{{([^{}]+)}}/g;
    const matches = templateString.matchAll(variablePattern);

    for (const match of matches) {
      const expr = match[1].trim();

      // 跳过 helpers（以 # 或 / 开头）
      if (expr.startsWith('#') || expr.startsWith('/')) {
        continue;
      }

      // 提取变量名（去除 helper 调用）
      const varName = expr.split(/[\s()]/)[0];

      // 检查是否在白名单中（允许内置 helpers）
      const builtInHelpers = [
        'formatDate',
        'ifEquals',
        'formatNumber',
        'formatCurrency',
        'if',
        'unless',
        'each',
        'with',
      ];
      const isAllowed =
        ALLOWED_TEMPLATE_VARIABLES.includes(varName as any) || builtInHelpers.includes(varName);

      if (!isAllowed && !varName.includes('.')) {
        this.logger.warn(`Template uses non-whitelisted variable: ${varName}`);
        // 警告但不阻止，给予一定灵活性
      }
    }
  }

  /**
   * 🔒 清理渲染数据
   * 只允许白名单中的字段
   */
  private sanitizeRenderData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    // 只复制白名单中的字段
    for (const key of ALLOWED_TEMPLATE_VARIABLES) {
      if (data[key] !== undefined) {
        // 深度清理：移除危险属性
        const value = data[key];
        if (typeof value === 'object' && value !== null) {
          // 移除 constructor, prototype, __proto__
          const cleaned = JSON.parse(JSON.stringify(value));
          sanitized[key] = cleaned;
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  /**
   * 创建模板
   *
   * ⚠️ SECURITY: 验证模板安全性
   */
  async create(createTemplateDto: CreateTemplateDto): Promise<NotificationTemplate> {
    // 🔒 安全验证：检查模板内容安全性
    this.validateTemplateSecurity(createTemplateDto.title);
    this.validateTemplateSecurity(createTemplateDto.body);
    if (createTemplateDto.emailTemplate) {
      this.validateTemplateSecurity(createTemplateDto.emailTemplate);
    }
    if (createTemplateDto.smsTemplate) {
      this.validateTemplateSecurity(createTemplateDto.smsTemplate);
    }

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

    // ✅ 清除列表缓存（新模板会影响列表查询结果）
    await this.invalidateListCache();

    return saved;
  }

  /**
   * 查询模板列表（分页）
   * ✅ 使用缓存优化查询性能
   */
  async findAll(query: QueryTemplateDto) {
    const { type, language, isActive, search, page = 1, limit = 10 } = query;

    // 生成缓存键（包含所有查询参数）
    const cacheKey = `${CacheKeys.templateList(type)}:${language || 'all'}:${isActive ?? 'all'}:${search || 'none'}:${page}:${limit}`;

    return this.cacheService.wrap(
      cacheKey,
      async () => {
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
            { search: `%${search}%` }
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
      },
      CacheTTL.TEMPLATE_LIST // 30 minutes
    );
  }

  /**
   * 根据 ID 查找模板
   * ✅ 使用缓存优化查询性能
   */
  async findOne(id: string): Promise<NotificationTemplate> {
    return this.cacheService.wrap(
      CacheKeys.template(id),
      async () => {
        const template = await this.templateRepository.findOne({ where: { id } });

        if (!template) {
          throw new NotFoundException(`Template with ID "${id}" not found`);
        }

        return template;
      },
      CacheTTL.TEMPLATE // 1 hour
    );
  }

  /**
   * 根据 code 查找模板
   * ✅ 使用缓存优化查询性能
   */
  async findByCode(code: string, language?: string): Promise<NotificationTemplate> {
    // 使用 code + language 组合作为缓存键
    const cacheKey = CacheKeys.template(`code:${code}:${language || 'default'}`);

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        const where: any = { code, isActive: true };
        if (language) {
          where.language = language;
        }

        const template = await this.templateRepository.findOne({ where });

        if (!template) {
          throw new NotFoundException(`Template with code "${code}" not found`);
        }

        return template;
      },
      CacheTTL.TEMPLATE // 1 hour
    );
  }

  /**
   * 根据通知类型和用户角色查找模板
   *
   * 🎯 角色化通知核心方法
   *
   * 匹配逻辑：
   * 1. 首先排除 excludeRoles 中包含的角色
   * 2. 然后匹配 targetRoles（空数组表示匹配所有角色）
   * 3. 按照 priority 降序排序，返回优先级最高的模板
   *
   * @param type 通知类型
   * @param userRole 用户角色
   * @param language 语言（可选）
   * @returns 匹配的模板，如果没有找到则返回 null
   */
  async getTemplateByRole(
    type: string,
    userRole: string,
    language?: string,
  ): Promise<NotificationTemplate | null> {
    // 生成缓存键（包含角色信息）
    const cacheKey = CacheKeys.template(
      `type:${type}:role:${userRole}:${language || 'default'}`
    );

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        // 查询该类型的所有激活模板，按优先级降序排序
        const templates = await this.templateRepository.find({
          where: { type: type as any, isActive: true },
          order: { priority: 'DESC' },
        });

        if (templates.length === 0) {
          this.logger.warn(`No active templates found for type: ${type}`);
          return null;
        }

        // 过滤出匹配当前角色的模板
        const matchedTemplates = templates.filter((template) => {
          // 1. 检查是否在排除列表中
          if (
            template.excludeRoles &&
            template.excludeRoles.length > 0 &&
            template.excludeRoles.includes(userRole)
          ) {
            this.logger.debug(
              `Template ${template.code} excluded for role ${userRole}`
            );
            return false;
          }

          // 2. 检查是否在目标列表中
          // 如果 targetRoles 为空或空数组，表示匹配所有角色
          if (
            !template.targetRoles ||
            template.targetRoles.length === 0
          ) {
            this.logger.debug(
              `Template ${template.code} matches all roles (empty targetRoles)`
            );
            return true;
          }

          // 3. 检查角色是否在目标列表中
          const isMatched = template.targetRoles.includes(userRole);
          this.logger.debug(
            `Template ${template.code} ${isMatched ? 'matched' : 'not matched'} for role ${userRole}`
          );
          return isMatched;
        });

        // 如果有多个匹配的模板，返回优先级最高的（已经按 priority 降序排序）
        if (matchedTemplates.length > 0) {
          const selected = matchedTemplates[0];
          this.logger.log(
            `Selected template ${selected.code} (priority: ${selected.priority}) for role ${userRole}`
          );
          return selected;
        }

        // 如果没有匹配的模板，返回 null
        this.logger.warn(
          `No template matched for type ${type} and role ${userRole}`
        );
        return null;
      },
      CacheTTL.TEMPLATE // 1 hour
    );
  }

  /**
   * 根据角色渲染模板
   *
   * 🎯 角色化通知核心方法
   *
   * 功能：
   * 1. 根据用户角色查找匹配的模板
   * 2. 合并模板的 roleSpecificData 到渲染数据
   * 3. 渲染模板
   *
   * @param templateCode 模板代码（可以是基础代码，如 'device.created'）
   * @param userRole 用户角色
   * @param data 渲染数据
   * @param language 语言（可选）
   * @returns 渲染结果
   */
  async renderWithRole(
    templateCode: string,
    userRole: string,
    data: Record<string, any>,
    language?: string,
  ): Promise<{
    title: string;
    body: string;
    emailHtml?: string;
    smsText?: string;
  }> {
    // 尝试查找角色专属模板（如 device.created.super_admin）
    const roleSpecificCode = `${templateCode}.${userRole}`;

    let template: NotificationTemplate | null = null;

    try {
      // 首先尝试查找角色专属模板
      template = await this.findByCode(roleSpecificCode, language);
      this.logger.log(`Using role-specific template: ${roleSpecificCode}`);
    } catch (error) {
      // 如果没有角色专属模板，使用基础模板
      this.logger.debug(`Role-specific template ${roleSpecificCode} not found, using base template`);

      // 查找基础模板
      try {
        template = await this.findByCode(templateCode, language);
      } catch (baseError) {
        // 如果基础模板也不存在，抛出错误
        throw new NotFoundException(
          `Template "${templateCode}" not found for role "${userRole}"`
        );
      }
    }

    // 合并角色专属数据
    let mergedData = {
      ...template.defaultData,
      ...data,
    };

    // 如果模板有角色专属数据，合并到渲染数据中
    if (template.roleSpecificData && template.roleSpecificData[userRole]) {
      mergedData = {
        ...mergedData,
        ...template.roleSpecificData[userRole],
      };
      this.logger.debug(
        `Merged role-specific data for role ${userRole} from template ${template.code}`
      );
    }

    try {
      // 渲染标题
      const title = this.compileAndRender(
        template.title,
        mergedData,
        `${template.code}:${userRole}:title:${language}`
      );

      // 渲染内容
      const body = this.compileAndRender(
        template.body,
        mergedData,
        `${template.code}:${userRole}:body:${language}`
      );

      // 渲染邮件模板（如果有）
      let emailHtml: string | undefined;
      if (template.emailTemplate) {
        emailHtml = this.compileAndRender(
          template.emailTemplate,
          mergedData,
          `${template.code}:${userRole}:email:${language}`
        );
      }

      // 渲染短信模板（如果有）
      let smsText: string | undefined;
      if (template.smsTemplate) {
        smsText = this.compileAndRender(
          template.smsTemplate,
          mergedData,
          `${template.code}:${userRole}:sms:${language}`
        );
      }

      this.logger.log(
        `Template rendered with role: ${template.code} for ${userRole}`
      );

      return {
        title,
        body,
        emailHtml,
        smsText,
      };
    } catch (error) {
      this.logger.error(
        `Failed to render template ${template.code} for role ${userRole}:`,
        error
      );
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * 更新模板
   *
   * ⚠️ SECURITY: 验证模板安全性
   */
  async update(id: string, updateTemplateDto: UpdateTemplateDto): Promise<NotificationTemplate> {
    // 🔒 安全验证：检查更新的模板内容安全性
    if (updateTemplateDto.title) {
      this.validateTemplateSecurity(updateTemplateDto.title);
    }
    if (updateTemplateDto.body) {
      this.validateTemplateSecurity(updateTemplateDto.body);
    }
    if (updateTemplateDto.emailTemplate) {
      this.validateTemplateSecurity(updateTemplateDto.emailTemplate);
    }
    if (updateTemplateDto.smsTemplate) {
      this.validateTemplateSecurity(updateTemplateDto.smsTemplate);
    }

    const template = await this.findOne(id);

    // 如果更新 code,检查是否与其他模板冲突
    if (updateTemplateDto.code && updateTemplateDto.code !== template.code) {
      const existing = await this.templateRepository.findOne({
        where: { code: updateTemplateDto.code },
      });

      if (existing) {
        throw new ConflictException(
          `Template with code "${updateTemplateDto.code}" already exists`
        );
      }
    }

    Object.assign(template, updateTemplateDto);
    const saved = await this.templateRepository.save(template);

    // 清除已编译的模板缓存
    const cacheKey = `${template.code}:${template.language}`;
    this.compiledTemplates.delete(cacheKey);

    // ✅ 清除模板相关的所有缓存
    await this.invalidateTemplateCache(saved);

    this.logger.log(`Template updated: ${saved.code}`);

    return saved;
  }

  /**
   * 删除模板
   */
  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);

    // 清除已编译的模板缓存
    const cacheKey = `${template.code}:${template.language}`;
    this.compiledTemplates.delete(cacheKey);

    // ✅ 清除模板相关的所有缓存（在删除之前）
    await this.invalidateTemplateCache(template);

    await this.templateRepository.remove(template);

    this.logger.log(`Template deleted: ${template.code}`);
  }

  /**
   * 激活/停用模板
   */
  async toggleActive(id: string): Promise<NotificationTemplate> {
    const template = await this.findOne(id);
    template.isActive = !template.isActive;
    const saved = await this.templateRepository.save(template);

    // ✅ 清除模板相关的所有缓存
    await this.invalidateTemplateCache(saved);

    return saved;
  }

  /**
   * 渲染模板
   */
  async render(
    templateCode: string,
    data: Record<string, any>,
    language?: string
  ): Promise<{
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
        `${templateCode}:title:${language}`
      );

      // 渲染内容
      const body = this.compileAndRender(
        template.body,
        mergedData,
        `${templateCode}:body:${language}`
      );

      // 渲染邮件模板（如果有）
      let emailHtml: string | undefined;
      if (template.emailTemplate) {
        emailHtml = this.compileAndRender(
          template.emailTemplate,
          mergedData,
          `${templateCode}:email:${language}`
        );
      }

      // 渲染短信模板（如果有）
      let smsText: string | undefined;
      if (template.smsTemplate) {
        smsText = this.compileAndRender(
          template.smsTemplate,
          mergedData,
          `${templateCode}:sms:${language}`
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
   *
   * ⚠️ SECURITY FIX: 使用沙箱实例和数据清理
   */
  private compileAndRender(
    templateString: string,
    data: Record<string, any>,
    cacheKey: string
  ): string {
    // 🔒 安全验证：检查模板安全性
    this.validateTemplateSecurity(templateString);

    // 尝试从缓存获取已编译的模板
    let compiled = this.compiledTemplates.get(cacheKey);

    if (!compiled) {
      // 🔒 使用沙箱实例编译模板
      compiled = this.sandboxedHandlebars.compile(templateString, {
        noEscape: false, // 启用自动转义
        strict: true, // 严格模式：undefined 变量会抛出错误
        preventIndent: true, // 防止缩进注入
      });
      this.compiledTemplates.set(cacheKey, compiled);
    }

    // 🔒 清理渲染数据：只保留白名单字段
    const sanitizedData = this.sanitizeRenderData(data);

    // 渲染模板
    try {
      return compiled(sanitizedData);
    } catch (error) {
      this.logger.error(`Template rendering error: ${error.message}`, error);
      throw new BadRequestException(`模板渲染失败: ${error.message}`);
    }
  }

  /**
   * 验证模板语法
   *
   * ⚠️ SECURITY: 使用沙箱实例和安全验证
   */
  async validateTemplate(templateString: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // 🔒 先验证模板安全性
      this.validateTemplateSecurity(templateString);

      // 🔒 使用沙箱实例编译测试
      this.sandboxedHandlebars.compile(templateString, {
        noEscape: false,
        strict: true,
        preventIndent: true,
      });

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

  /**
   * ✅ 清除特定模板的所有缓存
   * @param template 模板实体
   */
  private async invalidateTemplateCache(template: NotificationTemplate): Promise<void> {
    // 清除 ID 缓存
    await this.cacheService.del(CacheKeys.template(template.id));

    // 清除 code 缓存
    const codeCacheKey = CacheKeys.template(`code:${template.code}:${template.language}`);
    await this.cacheService.del(codeCacheKey);

    // 清除角色相关的缓存（使用模式匹配）
    // 格式: notification:template:type:{type}:role:*
    const rolePatternKey = CacheKeys.template(`type:${template.type}:role:*`);
    await this.cacheService.delPattern(rolePatternKey);

    // 清除所有列表缓存
    await this.invalidateListCache();

    this.logger.debug(
      `Template cache invalidated: ${template.code} (ID: ${template.id}, type: ${template.type})`
    );
  }

  /**
   * ✅ 清除所有模板列表缓存
   */
  private async invalidateListCache(): Promise<void> {
    // 使用模式匹配清除所有列表缓存
    await this.cacheService.delPattern(CacheKeys.templatePattern());
    this.logger.debug('Template list cache invalidated');
  }
}
