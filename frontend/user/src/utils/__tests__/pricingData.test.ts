import { describe, it, expect } from 'vitest';
import { plans, comparisonData, faqData } from '../pricingData';

describe('pricingData', () => {
  describe('plans', () => {
    it('应该导出plans数组', () => {
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
    });

    it('每个plan应该有必需的字段', () => {
      plans.forEach((plan) => {
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('key');
        expect(plan).toHaveProperty('tagline');
        expect(plan).toHaveProperty('features');
        expect(plan).toHaveProperty('highlighted');
      });
    });

    it('plan的features应该是数组', () => {
      plans.forEach((plan) => {
        expect(Array.isArray(plan.features)).toBe(true);
        expect(plan.features.length).toBeGreaterThan(0);
      });
    });

    it('每个feature应该有name和value', () => {
      plans.forEach((plan) => {
        plan.features.forEach((feature) => {
          expect(feature).toHaveProperty('name');
          expect(feature).toHaveProperty('value');
          expect(typeof feature.name).toBe('string');
          expect(typeof feature.value).toBe('string');
        });
      });
    });

    it('应该有基础版', () => {
      const basic = plans.find((p) => p.key === 'basic');
      expect(basic).toBeDefined();
      expect(basic?.name).toBe('基础版');
    });

    it('应该有标准版', () => {
      const standard = plans.find((p) => p.key === 'standard');
      expect(standard).toBeDefined();
      expect(standard?.name).toBe('标准版');
      expect(standard?.highlighted).toBe(true);
    });

    it('应该有专业版', () => {
      const professional = plans.find((p) => p.key === 'professional');
      expect(professional).toBeDefined();
      expect(professional?.name).toBe('专业版');
    });

    it('应该有企业版', () => {
      const enterprise = plans.find((p) => p.key === 'enterprise');
      expect(enterprise).toBeDefined();
      expect(enterprise?.name).toBe('企业版');
      expect(enterprise?.customPrice).toBe(true);
    });

    it('非企业版应该有价格', () => {
      const regularPlans = plans.filter((p) => p.key !== 'enterprise');
      regularPlans.forEach((plan) => {
        expect(typeof plan.monthlyPrice).toBe('number');
        expect(typeof plan.yearlyPrice).toBe('number');
        expect(plan.monthlyPrice).toBeGreaterThan(0);
        expect(plan.yearlyPrice).toBeGreaterThan(0);
      });
    });

    it('年付价格应该低于月付价格×12', () => {
      const regularPlans = plans.filter((p) => p.key !== 'enterprise');
      regularPlans.forEach((plan) => {
        if (plan.monthlyPrice && plan.yearlyPrice) {
          expect(plan.yearlyPrice).toBeLessThan(plan.monthlyPrice * 12);
        }
      });
    });
  });

  describe('comparisonData', () => {
    it('应该导出comparisonData数组', () => {
      expect(Array.isArray(comparisonData)).toBe(true);
      expect(comparisonData.length).toBeGreaterThan(0);
    });

    it('每个comparison应该有必需的字段', () => {
      comparisonData.forEach((item) => {
        expect(item).toHaveProperty('key');
        expect(item).toHaveProperty('feature');
        expect(item).toHaveProperty('basic');
        expect(item).toHaveProperty('standard');
        expect(item).toHaveProperty('professional');
        expect(item).toHaveProperty('enterprise');
      });
    });

    it('feature字段应该是字符串', () => {
      comparisonData.forEach((item) => {
        expect(typeof item.feature).toBe('string');
        expect(item.feature.length).toBeGreaterThan(0);
      });
    });

    it('应该有基础功能比较', () => {
      const basicFeature = comparisonData.find((item) => item.feature === '基础功能');
      expect(basicFeature).toBeDefined();
      expect(basicFeature?.basic).toBe(true);
      expect(basicFeature?.standard).toBe(true);
      expect(basicFeature?.professional).toBe(true);
      expect(basicFeature?.enterprise).toBe(true);
    });

    it('高级功能应该不在基础版中', () => {
      const advancedFeatures = comparisonData.filter(
        (item) =>
          item.feature === 'Webhook回调' ||
          item.feature === 'VPN专线接入' ||
          item.feature === '白标定制'
      );
      advancedFeatures.forEach((feature) => {
        expect(feature.basic).toBe(false);
      });
    });
  });

  describe('faqData', () => {
    it('应该导出faqData数组', () => {
      expect(Array.isArray(faqData)).toBe(true);
      expect(faqData.length).toBeGreaterThan(0);
    });

    it('每个FAQ应该有question和answer', () => {
      faqData.forEach((faq) => {
        expect(faq).toHaveProperty('question');
        expect(faq).toHaveProperty('answer');
        expect(typeof faq.question).toBe('string');
        expect(typeof faq.answer).toBe('string');
        expect(faq.question.length).toBeGreaterThan(0);
        expect(faq.answer.length).toBeGreaterThan(0);
      });
    });

    it('应该有关于套餐升级的FAQ', () => {
      const upgradeFaq = faqData.find((faq) =>
        faq.question.includes('升级')
      );
      expect(upgradeFaq).toBeDefined();
    });

    it('应该有关于支付方式的FAQ', () => {
      const paymentFaq = faqData.find((faq) =>
        faq.question.includes('支付')
      );
      expect(paymentFaq).toBeDefined();
    });

    it('应该有关于发票的FAQ', () => {
      const invoiceFaq = faqData.find((faq) =>
        faq.question.includes('发票')
      );
      expect(invoiceFaq).toBeDefined();
    });

    it('应该有关于退款的FAQ', () => {
      const refundFaq = faqData.find((faq) =>
        faq.question.includes('退款')
      );
      expect(refundFaq).toBeDefined();
    });
  });
});
