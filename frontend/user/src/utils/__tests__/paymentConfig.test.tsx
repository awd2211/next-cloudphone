import { describe, it, expect, vi } from 'vitest';
import {
  paymentTypeConfig,
  paymentTypeOptions,
  securityAlertConfig,
  usageGuideItems,
  getPaymentIcon,
  getPaymentTypeName,
  getPaymentColor,
  formatPaymentDisplay,
  maskAccount,
  maskCardNumber,
  getDefaultTag,
  getFormFieldsByType,
  formFieldsByType,
  validatePaymentForm,
} from '../paymentConfig';
import type { PaymentMethod, PaymentType } from '../paymentConfig';

describe('paymentConfig 工具函数', () => {
  describe('支付方式类型配置', () => {
    it('应该包含所有支付方式类型', () => {
      expect(paymentTypeConfig.alipay).toBeDefined();
      expect(paymentTypeConfig.wechat).toBeDefined();
      expect(paymentTypeConfig.bank_card).toBeDefined();
      expect(paymentTypeConfig.credit_card).toBeDefined();
    });

    it('支付宝配置应该正确', () => {
      const config = paymentTypeConfig.alipay;
      expect(config.displayName).toBe('支付宝');
      expect(config.color).toBe('#1677ff');
      expect(config.icon).toBeDefined();
    });

    it('微信支付配置应该正确', () => {
      const config = paymentTypeConfig.wechat;
      expect(config.displayName).toBe('微信支付');
      expect(config.color).toBe('#07c160');
      expect(config.icon).toBeDefined();
    });

    it('银行卡配置应该正确', () => {
      const config = paymentTypeConfig.bank_card;
      expect(config.displayName).toBe('银行卡');
      expect(config.color).toBe('#faad14');
      expect(config.icon).toBeDefined();
    });

    it('信用卡配置应该正确', () => {
      const config = paymentTypeConfig.credit_card;
      expect(config.displayName).toBe('信用卡');
      expect(config.color).toBe('#722ed1');
      expect(config.icon).toBeDefined();
    });
  });

  describe('支付方式选项配置', () => {
    it('应该包含所有支付选项', () => {
      expect(paymentTypeOptions).toHaveLength(4);
    });

    it('选项格式应该正确', () => {
      paymentTypeOptions.forEach((option) => {
        expect(option.label).toBeDefined();
        expect(option.value).toBeDefined();
        expect(typeof option.label).toBe('string');
        expect(typeof option.value).toBe('string');
      });
    });
  });

  describe('安全提示配置', () => {
    it('应该有完整的安全提示配置', () => {
      expect(securityAlertConfig.message).toBe('支付信息安全保护');
      expect(securityAlertConfig.description).toBeTruthy();
      expect(securityAlertConfig.type).toBe('info');
      expect(securityAlertConfig.showIcon).toBe(true);
    });
  });

  describe('使用指南配置', () => {
    it('应该有多条使用指南', () => {
      expect(Array.isArray(usageGuideItems)).toBe(true);
      expect(usageGuideItems.length).toBeGreaterThan(0);
    });

    it('每条指南都是字符串', () => {
      usageGuideItems.forEach((item) => {
        expect(typeof item).toBe('string');
        expect(item.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getPaymentIcon', () => {
    it('应该返回支付宝图标', () => {
      const icon = getPaymentIcon('alipay');
      expect(icon).toBeDefined();
    });

    it('应该返回微信图标', () => {
      const icon = getPaymentIcon('wechat');
      expect(icon).toBeDefined();
    });

    it('应该返回银行卡图标', () => {
      const icon = getPaymentIcon('bank_card');
      expect(icon).toBeDefined();
    });

    it('应该返回信用卡图标', () => {
      const icon = getPaymentIcon('credit_card');
      expect(icon).toBeDefined();
    });

    it('无效类型应该返回默认图标', () => {
      const icon = getPaymentIcon('invalid' as PaymentType);
      expect(icon).toBeDefined();
    });
  });

  describe('getPaymentTypeName', () => {
    it('应该返回正确的支付方式名称', () => {
      expect(getPaymentTypeName('alipay')).toBe('支付宝');
      expect(getPaymentTypeName('wechat')).toBe('微信支付');
      expect(getPaymentTypeName('bank_card')).toBe('银行卡');
      expect(getPaymentTypeName('credit_card')).toBe('信用卡');
    });

    it('无效类型应该返回默认文本', () => {
      expect(getPaymentTypeName('invalid' as PaymentType)).toBe('未知支付方式');
    });
  });

  describe('getPaymentColor', () => {
    it('应该返回正确的支付方式颜色', () => {
      expect(getPaymentColor('alipay')).toBe('#1677ff');
      expect(getPaymentColor('wechat')).toBe('#07c160');
      expect(getPaymentColor('bank_card')).toBe('#faad14');
      expect(getPaymentColor('credit_card')).toBe('#722ed1');
    });

    it('无效类型应该返回默认颜色', () => {
      expect(getPaymentColor('invalid' as PaymentType)).toBe('#000000');
    });
  });

  describe('maskAccount', () => {
    it('应该正确遮罩账号', () => {
      expect(maskAccount('13812345678')).toBe('138****5678');
      expect(maskAccount('user@example.com')).toBe('use****.com');
    });

    it('短账号不应遮罩', () => {
      expect(maskAccount('1234567')).toBe('1234567');
      expect(maskAccount('abc')).toBe('abc');
    });

    it('应该处理空字符串', () => {
      expect(maskAccount('')).toBe('');
    });
  });

  describe('maskCardNumber', () => {
    it('应该正确遮罩卡号', () => {
      expect(maskCardNumber('6222021234567890')).toBe('**** **** **** 7890');
      expect(maskCardNumber('1234567890123456')).toBe('**** **** **** 3456');
    });

    it('短卡号不应遮罩', () => {
      expect(maskCardNumber('1234')).toBe('1234');
      expect(maskCardNumber('123')).toBe('123');
    });

    it('应该处理空字符串', () => {
      expect(maskCardNumber('')).toBe('');
    });
  });

  describe('formatPaymentDisplay', () => {
    it('应该正确格式化支付宝显示', () => {
      const payment: PaymentMethod = {
        id: '1',
        type: 'alipay',
        account: '13812345678',
        isDefault: false,
        createdAt: '2024-01-01',
      };

      expect(formatPaymentDisplay(payment)).toBe('支付宝 (138****5678)');
    });

    it('应该正确格式化微信支付显示', () => {
      const payment: PaymentMethod = {
        id: '2',
        type: 'wechat',
        isDefault: false,
        createdAt: '2024-01-01',
      };

      expect(formatPaymentDisplay(payment)).toBe('微信支付');
    });

    it('应该正确格式化银行卡显示', () => {
      const payment: PaymentMethod = {
        id: '3',
        type: 'bank_card',
        cardNumber: '6222021234567890',
        cardHolder: '张三',
        bankName: 'ICBC',
        isDefault: false,
        createdAt: '2024-01-01',
      };

      expect(formatPaymentDisplay(payment)).toBe('银行卡 (**** **** **** 7890)');
    });

    it('应该正确格式化信用卡显示', () => {
      const payment: PaymentMethod = {
        id: '4',
        type: 'credit_card',
        cardNumber: '1234567890123456',
        cardHolder: '李四',
        isDefault: false,
        createdAt: '2024-01-01',
      };

      expect(formatPaymentDisplay(payment)).toBe('信用卡 (**** **** **** 3456)');
    });

    it('应该处理缺失账号/卡号的情况', () => {
      const payment1: PaymentMethod = {
        id: '1',
        type: 'alipay',
        isDefault: false,
        createdAt: '2024-01-01',
      };

      const payment2: PaymentMethod = {
        id: '2',
        type: 'bank_card',
        isDefault: false,
        createdAt: '2024-01-01',
      };

      expect(formatPaymentDisplay(payment1)).toBe('支付宝 ()');
      expect(formatPaymentDisplay(payment2)).toBe('银行卡 ()');
    });
  });

  describe('getDefaultTag', () => {
    it('默认支付方式应该返回标签配置', () => {
      const tag = getDefaultTag(true);
      expect(tag).toBeDefined();
      expect(tag?.color).toBe('green');
      expect(tag?.text).toBe('默认');
    });

    it('非默认支付方式应该返回 undefined', () => {
      const tag = getDefaultTag(false);
      expect(tag).toBeUndefined();
    });
  });

  describe('getFormFieldsByType', () => {
    it('支付宝应该有1个表单字段', () => {
      const fields = getFormFieldsByType('alipay');
      expect(fields).toHaveLength(1);
      expect(fields[0].name).toBe('account');
    });

    it('微信应该有1个表单字段（提示）', () => {
      const fields = getFormFieldsByType('wechat');
      expect(fields).toHaveLength(1);
      expect(fields[0].inputType).toBe('alert');
    });

    it('银行卡应该有3个表单字段', () => {
      const fields = getFormFieldsByType('bank_card');
      expect(fields).toHaveLength(3);
      expect(fields[0].name).toBe('cardNumber');
      expect(fields[1].name).toBe('cardHolder');
      expect(fields[2].name).toBe('bankName');
    });

    it('信用卡应该有4个表单字段', () => {
      const fields = getFormFieldsByType('credit_card');
      expect(fields).toHaveLength(4);
      expect(fields[0].name).toBe('cardNumber');
      expect(fields[1].name).toBe('cardHolder');
      expect(fields[2].name).toBe('cvv');
      expect(fields[3].name).toBe('expiryDate');
    });

    it('undefined 类型应该返回空数组', () => {
      const fields = getFormFieldsByType(undefined);
      expect(fields).toEqual([]);
    });

    it('无效类型应该返回空数组', () => {
      const fields = getFormFieldsByType('invalid' as PaymentType);
      expect(fields).toEqual([]);
    });
  });

  describe('表单字段配置验证', () => {
    it('支付宝字段应该有必需验证', () => {
      const fields = formFieldsByType.alipay;
      const accountField = fields[0];
      expect(accountField.rules?.some((r) => r.required)).toBe(true);
    });

    it('银行卡号应该有格式验证', () => {
      const fields = formFieldsByType.bank_card;
      const cardField = fields[0];
      expect(cardField.rules?.some((r) => r.pattern)).toBe(true);
    });

    it('信用卡CVV应该有3位验证', () => {
      const fields = formFieldsByType.credit_card;
      const cvvField = fields[2];
      expect(cvvField.rules?.some((r) => r.pattern?.toString().includes('3'))).toBe(true);
    });

    it('信用卡有效期应该有格式验证', () => {
      const fields = formFieldsByType.credit_card;
      const expiryField = fields[3];
      expect(expiryField.placeholder).toBe('MM/YY');
      expect(expiryField.rules?.some((r) => r.pattern)).toBe(true);
    });

    it('银行卡应该有银行选项', () => {
      const fields = formFieldsByType.bank_card;
      const bankField = fields[2];
      expect(bankField.inputType).toBe('select');
      expect(bankField.options).toBeDefined();
      expect(bankField.options?.length).toBeGreaterThan(0);
    });
  });

  describe('validatePaymentForm', () => {
    it('表单验证通过应该返回 true', async () => {
      const mockForm: any = {
        validateFields: vi.fn().mockResolvedValue({}),
      };

      const result = await validatePaymentForm(mockForm, 'alipay');
      expect(result).toBe(true);
    });

    it('表单验证失败应该返回 false', async () => {
      const mockForm: any = {
        validateFields: vi.fn().mockRejectedValue(new Error('验证失败')),
      };

      const result = await validatePaymentForm(mockForm, 'alipay');
      expect(result).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('应该处理极长的账号', () => {
      const longAccount = 'a'.repeat(100);
      const masked = maskAccount(longAccount);
      expect(masked).toContain('****');
      expect(masked.length).toBeLessThan(longAccount.length);
    });

    it('应该处理极长的卡号', () => {
      const longCard = '1'.repeat(20);
      const masked = maskCardNumber(longCard);
      expect(masked).toContain('****');
    });

    it('表单字段应该都有 name 属性', () => {
      Object.values(formFieldsByType).forEach((fields) => {
        fields.forEach((field) => {
          expect(field.name).toBeDefined();
          expect(typeof field.name).toBe('string');
        });
      });
    });
  });
});
