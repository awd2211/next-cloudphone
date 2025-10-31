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

  async listRules(resourceType?: ResourceType): Promise<BillingRule[]> {
    const where = resourceType ? { resourceType, isActive: true } : { isActive: true };
    return await this.ruleRepository.find({
      where,
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
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
}
