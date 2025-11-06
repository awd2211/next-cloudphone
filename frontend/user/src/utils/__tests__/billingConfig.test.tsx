import { describe, it, expect } from 'vitest';
import {
  billTypeConfig,
  statusConfig,
  paymentMethodConfig,
  getStatusStep,
} from '../billingConfig';
import { BillType, BillStatus, PaymentMethod } from '@/services/billing';

describe('billingConfig 账单配置', () => {
  describe('billTypeConfig 账单类型配置', () => {
    it('应该包含所有账单类型', () => {
      const types = [
        BillType.SUBSCRIPTION,
        BillType.USAGE,
        BillType.RECHARGE,
        BillType.REFUND,
        BillType.PENALTY,
        BillType.DISCOUNT,
        BillType.COUPON,
        BillType.COMMISSION,
      ];

      types.forEach((type) => {
        expect(billTypeConfig[type]).toBeDefined();
      });
    });

    it('每个账单类型都应该有label和color', () => {
      Object.values(billTypeConfig).forEach((config) => {
        expect(config.label).toBeDefined();
        expect(config.color).toBeDefined();
        expect(typeof config.label).toBe('string');
        expect(typeof config.color).toBe('string');
      });
    });

    it('应该有8个账单类型', () => {
      expect(Object.keys(billTypeConfig)).toHaveLength(8);
    });

    it('订阅费配置应该正确', () => {
      const config = billTypeConfig[BillType.SUBSCRIPTION];
      expect(config.label).toBe('订阅费');
      expect(config.color).toBe('blue');
    });

    it('充值配置应该是绿色', () => {
      const config = billTypeConfig[BillType.RECHARGE];
      expect(config.label).toBe('充值');
      expect(config.color).toBe('green');
    });

    it('退款配置应该是橙色', () => {
      const config = billTypeConfig[BillType.REFUND];
      expect(config.label).toBe('退款');
      expect(config.color).toBe('orange');
    });

    it('违约金配置应该是红色', () => {
      const config = billTypeConfig[BillType.PENALTY];
      expect(config.label).toBe('违约金');
      expect(config.color).toBe('red');
    });

    it('所有label都不应该为空', () => {
      Object.values(billTypeConfig).forEach((config) => {
        expect(config.label.length).toBeGreaterThan(0);
      });
    });

    it('所有color都应该是有效的Ant Design颜色值', () => {
      const validColors = [
        'blue',
        'cyan',
        'green',
        'orange',
        'red',
        'purple',
        'magenta',
        'gold',
        'lime',
        'volcano',
        'geekblue',
      ];

      Object.values(billTypeConfig).forEach((config) => {
        expect(validColors).toContain(config.color);
      });
    });
  });

  describe('statusConfig 状态配置', () => {
    it('应该包含所有账单状态', () => {
      const statuses = [
        BillStatus.PENDING,
        BillStatus.PAID,
        BillStatus.CANCELLED,
        BillStatus.REFUNDED,
        BillStatus.OVERDUE,
        BillStatus.PARTIAL,
      ];

      statuses.forEach((status) => {
        expect(statusConfig[status]).toBeDefined();
      });
    });

    it('每个状态都应该有label和color', () => {
      Object.values(statusConfig).forEach((config) => {
        expect(config.label).toBeDefined();
        expect(config.color).toBeDefined();
        expect(typeof config.label).toBe('string');
        expect(typeof config.color).toBe('string');
      });
    });

    it('应该有6个账单状态', () => {
      expect(Object.keys(statusConfig)).toHaveLength(6);
    });

    it('待支付状态应该是warning', () => {
      const config = statusConfig[BillStatus.PENDING];
      expect(config.label).toBe('待支付');
      expect(config.color).toBe('warning');
    });

    it('已支付状态应该是success', () => {
      const config = statusConfig[BillStatus.PAID];
      expect(config.label).toBe('已支付');
      expect(config.color).toBe('success');
    });

    it('已逾期状态应该是error', () => {
      const config = statusConfig[BillStatus.OVERDUE];
      expect(config.label).toBe('已逾期');
      expect(config.color).toBe('error');
    });

    it('已取消状态应该是default', () => {
      const config = statusConfig[BillStatus.CANCELLED];
      expect(config.label).toBe('已取消');
      expect(config.color).toBe('default');
    });

    it('所有color都应该是有效的Ant Design状态颜色', () => {
      const validColors = ['success', 'warning', 'error', 'default', 'processing'];

      Object.values(statusConfig).forEach((config) => {
        expect(validColors).toContain(config.color);
      });
    });
  });

  describe('paymentMethodConfig 支付方式配置', () => {
    it('应该包含所有支付方式', () => {
      const methods = [
        PaymentMethod.BALANCE,
        PaymentMethod.ALIPAY,
        PaymentMethod.WECHAT,
        PaymentMethod.CREDIT_CARD,
        PaymentMethod.PAYPAL,
      ];

      methods.forEach((method) => {
        expect(paymentMethodConfig[method]).toBeDefined();
      });
    });

    it('每个支付方式都应该有label和color', () => {
      Object.values(paymentMethodConfig).forEach((config) => {
        expect(config.label).toBeDefined();
        expect(config.color).toBeDefined();
        expect(typeof config.label).toBe('string');
        expect(typeof config.color).toBe('string');
      });
    });

    it('应该有5个支付方式', () => {
      expect(Object.keys(paymentMethodConfig)).toHaveLength(5);
    });

    it('余额支付配置应该正确', () => {
      const config = paymentMethodConfig[PaymentMethod.BALANCE];
      expect(config.label).toBe('余额支付');
      expect(config.color).toBe('blue');
    });

    it('支付宝配置应该正确', () => {
      const config = paymentMethodConfig[PaymentMethod.ALIPAY];
      expect(config.label).toBe('支付宝');
      expect(config.color).toBe('cyan');
    });

    it('微信配置应该是绿色', () => {
      const config = paymentMethodConfig[PaymentMethod.WECHAT];
      expect(config.label).toBe('微信支付');
      expect(config.color).toBe('green');
    });

    it('PayPal配置应该正确', () => {
      const config = paymentMethodConfig[PaymentMethod.PAYPAL];
      expect(config.label).toBe('PayPal');
      expect(config.color).toBe('geekblue');
    });

    it('所有color都应该是有效的Ant Design颜色值', () => {
      const validColors = [
        'blue',
        'cyan',
        'green',
        'gold',
        'geekblue',
        'red',
        'orange',
        'purple',
      ];

      Object.values(paymentMethodConfig).forEach((config) => {
        expect(validColors).toContain(config.color);
      });
    });
  });

  describe('getStatusStep 状态步骤函数', () => {
    it('待支付状态应该返回步骤0', () => {
      expect(getStatusStep(BillStatus.PENDING)).toBe(0);
    });

    it('已支付状态应该返回步骤1', () => {
      expect(getStatusStep(BillStatus.PAID)).toBe(1);
    });

    it('已退款状态应该返回步骤2', () => {
      expect(getStatusStep(BillStatus.REFUNDED)).toBe(2);
    });

    it('已取消状态应该返回0（负值会被转换）', () => {
      const step = getStatusStep(BillStatus.CANCELLED);
      expect(step).toBe(0);
    });

    it('已逾期状态应该返回步骤0', () => {
      expect(getStatusStep(BillStatus.OVERDUE)).toBe(0);
    });

    it('部分支付状态应该返回步骤0', () => {
      expect(getStatusStep(BillStatus.PARTIAL)).toBe(0);
    });

    it('所有状态都应该返回非负数', () => {
      const statuses = [
        BillStatus.PENDING,
        BillStatus.PAID,
        BillStatus.CANCELLED,
        BillStatus.REFUNDED,
        BillStatus.OVERDUE,
        BillStatus.PARTIAL,
      ];

      statuses.forEach((status) => {
        const step = getStatusStep(status);
        expect(step).toBeGreaterThanOrEqual(0);
      });
    });

    it('步骤应该按流程递增', () => {
      const pendingStep = getStatusStep(BillStatus.PENDING);
      const paidStep = getStatusStep(BillStatus.PAID);
      const refundedStep = getStatusStep(BillStatus.REFUNDED);

      expect(paidStep).toBeGreaterThan(pendingStep);
      expect(refundedStep).toBeGreaterThan(paidStep);
    });
  });

  describe('数据一致性', () => {
    it('账单类型的label应该唯一', () => {
      const labels = Object.values(billTypeConfig).map((c) => c.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('状态的label应该唯一', () => {
      const labels = Object.values(statusConfig).map((c) => c.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('支付方式的label应该唯一', () => {
      const labels = Object.values(paymentMethodConfig).map((c) => c.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('所有配置都应该可序列化', () => {
      expect(() => {
        JSON.stringify({
          billTypeConfig,
          statusConfig,
          paymentMethodConfig,
        });
      }).not.toThrow();
    });
  });

  describe('颜色语义一致性', () => {
    it('正向操作应该使用积极颜色', () => {
      // 充值、已支付等正向操作应该用绿色或蓝色
      expect(['green', 'blue']).toContain(billTypeConfig[BillType.RECHARGE].color);
      expect(['success']).toContain(statusConfig[BillStatus.PAID].color);
    });

    it('负向操作应该使用警示颜色', () => {
      // 违约金、已逾期等负向状态应该用红色或橙色
      expect(['red', 'orange']).toContain(billTypeConfig[BillType.PENALTY].color);
      expect(['error']).toContain(statusConfig[BillStatus.OVERDUE].color);
    });

    it('中性操作应该使用中性颜色', () => {
      // 已取消等中性状态应该用灰色或默认色
      expect(['default', 'processing']).toContain(
        statusConfig[BillStatus.CANCELLED].color
      );
    });
  });

  describe('枚举覆盖完整性', () => {
    it('billTypeConfig应该覆盖所有BillType枚举值', () => {
      const enumValues = Object.values(BillType);
      const configKeys = Object.keys(billTypeConfig);

      enumValues.forEach((value) => {
        expect(configKeys).toContain(value);
      });
    });

    it('statusConfig应该覆盖所有BillStatus枚举值', () => {
      const enumValues = Object.values(BillStatus);
      const configKeys = Object.keys(statusConfig);

      enumValues.forEach((value) => {
        expect(configKeys).toContain(value);
      });
    });

    it('paymentMethodConfig应该覆盖所有PaymentMethod枚举值', () => {
      const enumValues = Object.values(PaymentMethod);
      const configKeys = Object.keys(paymentMethodConfig);

      enumValues.forEach((value) => {
        expect(configKeys).toContain(value);
      });
    });
  });
});
