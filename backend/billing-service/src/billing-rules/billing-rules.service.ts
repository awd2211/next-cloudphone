import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingRule, RuleType, ResourceType, BillingUnit } from './entities/billing-rule.entity';

export interface CreateBillingRuleDto {
  name: string;
  description?: string;
  ruleType: RuleType;
  resourceType: ResourceType;
  billingUnit: BillingUnit;
  fixedPrice?: number;
  unitPrice?: number;
  tiers?: any[];
  timeBasedPricing?: any[];
  priority?: number;
  validFrom?: Date;
  validUntil?: Date;
  conditions?: Record<string, any>;
}

@Injectable()
export class BillingRulesService {
  private readonly logger = new Logger(BillingRulesService.name);

  constructor(
    @InjectRepository(BillingRule)
    private ruleRepository: Repository<BillingRule>
  ) {}

  async createRule(dto: CreateBillingRuleDto): Promise<BillingRule> {
    const existing = await this.ruleRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('计费规则名称已存在');
    }

    const rule = this.ruleRepository.create(dto);
    const savedRule = await this.ruleRepository.save(rule);

    this.logger.log(`计费规则已创建 - ${dto.name}`);
    return savedRule;
  }

  async getRule(id: string): Promise<BillingRule> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`计费规则 ${id} 未找到`);
    }
    return rule;
  }

  async listRules(
    page: number,
    limit: number,
    resourceType?: ResourceType,
    isActive?: boolean
  ): Promise<{ data: BillingRule[]; total: number; page: number; limit: number }> {
    // 使用 QueryBuilder 支持动态筛选
    const queryBuilder = this.ruleRepository.createQueryBuilder('rule');

    // 资源类型筛选
    if (resourceType) {
      queryBuilder.andWhere('rule.resourceType = :resourceType', { resourceType });
    }

    // 活跃状态筛选
    if (isActive !== undefined) {
      queryBuilder.andWhere('rule.isActive = :isActive', { isActive });
    }

    // 分页
    queryBuilder.skip((page - 1) * limit).take(limit);

    // 排序
    queryBuilder.orderBy('rule.priority', 'DESC').addOrderBy('rule.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async updateRule(id: string, updates: Partial<BillingRule>): Promise<BillingRule> {
    const rule = await this.getRule(id);
    Object.assign(rule, updates);
    return await this.ruleRepository.save(rule);
  }

  async deleteRule(id: string): Promise<void> {
    const rule = await this.getRule(id);
    rule.isActive = false;
    await this.ruleRepository.save(rule);
    this.logger.log(`计费规则已删除 - ID: ${id}`);
  }

  async calculatePrice(
    resourceType: ResourceType,
    quantity: number,
    context?: any
  ): Promise<{ rule: BillingRule; price: number }> {
    const rules = await this.ruleRepository.find({
      where: { resourceType, isActive: true },
      order: { priority: 'DESC' },
    });

    for (const rule of rules) {
      if (rule.isValid()) {
        try {
          const price = rule.calculatePrice(quantity, context);
          return { rule, price };
        } catch (error) {
          this.logger.warn(`规则 ${rule.name} 计算失败: ${error.message}`);
          continue;
        }
      }
    }

    throw new NotFoundException(`未找到适用于 ${resourceType} 的计费规则`);
  }

  /**
   * 启用/禁用计费规则
   */
  async toggleRule(id: string, isActive: boolean): Promise<BillingRule> {
    const rule = await this.getRule(id);
    rule.isActive = isActive;
    const updatedRule = await this.ruleRepository.save(rule);
    this.logger.log(`计费规则状态已切换 - ID: ${id}, isActive: ${isActive}`);
    return updatedRule;
  }

  /**
   * 测试计费规则
   */
  async testRule(id: string, testData: any): Promise<{
    rule: BillingRule;
    testInput: any;
    result: {
      price: number;
      breakdown?: any;
      valid: boolean;
      errors?: string[];
    };
  }> {
    const rule = await this.getRule(id);

    const errors: string[] = [];
    let price = 0;
    let valid = true;

    try {
      // 验证测试数据
      if (!testData.quantity || testData.quantity <= 0) {
        errors.push('quantity 必须大于 0');
        valid = false;
      }

      // 检查规则是否有效
      if (!rule.isValid()) {
        errors.push('规则未在有效期内');
        valid = false;
      }

      // 如果通过验证,计算价格
      if (valid) {
        price = rule.calculatePrice(testData.quantity, testData.context);
      }
    } catch (error) {
      errors.push(error.message || '计算失败');
      valid = false;
    }

    return {
      rule,
      testInput: testData,
      result: {
        price,
        valid,
        errors: errors.length > 0 ? errors : undefined,
        breakdown: {
          ruleType: rule.ruleType,
          resourceType: rule.resourceType,
          billingUnit: rule.billingUnit,
          quantity: testData.quantity,
          unitPrice: rule.unitPrice,
          fixedPrice: rule.fixedPrice,
        },
      },
    };
  }

  /**
   * 获取计费规则模板
   */
  async getRuleTemplates(): Promise<any[]> {
    return [
      {
        id: 'fixed-device',
        name: '固定价格 - 设备租赁',
        description: '每台设备固定价格',
        ruleType: RuleType.FIXED,
        resourceType: ResourceType.DEVICE,
        billingUnit: BillingUnit.UNIT,
        fixedPrice: 100,
        unitPrice: null,
        priority: 1,
      },
      {
        id: 'hourly-device',
        name: '按小时计费 - 设备租赁',
        description: '按设备使用小时数计费',
        ruleType: RuleType.PAY_PER_USE,
        resourceType: ResourceType.DEVICE,
        billingUnit: BillingUnit.HOUR,
        fixedPrice: null,
        unitPrice: 10,
        priority: 2,
      },
      {
        id: 'tiered-device',
        name: '阶梯价格 - 设备租赁',
        description: '根据使用量阶梯定价',
        ruleType: RuleType.TIERED,
        resourceType: ResourceType.DEVICE,
        billingUnit: BillingUnit.HOUR,
        fixedPrice: null,
        unitPrice: null,
        tiers: [
          { minQuantity: 0, maxQuantity: 100, price: 10 },
          { minQuantity: 101, maxQuantity: 500, price: 8 },
          { minQuantity: 501, maxQuantity: null, price: 6 },
        ],
        priority: 3,
      },
      {
        id: 'bandwidth-usage',
        name: '按流量计费',
        description: '按网络流量计费',
        ruleType: RuleType.PAY_PER_USE,
        resourceType: ResourceType.BANDWIDTH,
        billingUnit: BillingUnit.GB,
        fixedPrice: null,
        unitPrice: 0.5,
        priority: 1,
      },
      {
        id: 'storage-usage',
        name: '按存储计费',
        description: '按存储空间计费',
        ruleType: RuleType.PAY_PER_USE,
        resourceType: ResourceType.STORAGE,
        billingUnit: BillingUnit.GB,
        fixedPrice: null,
        unitPrice: 1,
        priority: 1,
      },
    ];
  }
}
