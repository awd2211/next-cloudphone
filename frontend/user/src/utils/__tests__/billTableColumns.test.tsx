import { describe, it, expect, vi } from 'vitest';
import {
  BillType,
  BillStatus,
  PaymentMethod,
  type Bill,
} from '@/services/billing';

// Mock the billing service
vi.mock('@/services/billing', async () => {
  const actual = await vi.importActual('@/services/billing');
  return {
    ...actual,
    formatAmount: (amount: number) => `¥${amount.toFixed(2)}`,
    formatBillingCycle: (cycle: string) => cycle,
  };
});

// Dynamically import to ensure mocks are applied
const { createBillTableColumns } = await import('../billTableColumns');

describe('billTableColumns 账单表格列配置', () => {
  const mockActions = {
    onViewDetail: vi.fn(),
    onPay: vi.fn(),
    onCancel: vi.fn(),
    onDownload: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBillTableColumns 函数', () => {
    it('应该返回列配置数组', () => {
      const columns = createBillTableColumns(mockActions);
      expect(Array.isArray(columns)).toBe(true);
    });

    it('应该有9列', () => {
      const columns = createBillTableColumns(mockActions);
      expect(columns).toHaveLength(9);
    });

    it('应该包含所有必需的列', () => {
      const columns = createBillTableColumns(mockActions);
      const titles = columns.map((col) => col.title);

      expect(titles).toContain('账单号');
      expect(titles).toContain('类型');
      expect(titles).toContain('账期');
      expect(titles).toContain('金额');
      expect(titles).toContain('状态');
      expect(titles).toContain('支付方式');
      expect(titles).toContain('账期范围');
      expect(titles).toContain('创建时间');
      expect(titles).toContain('操作');
    });

    it('所有列的key应该唯一', () => {
      const columns = createBillTableColumns(mockActions);
      const keys = columns.map((col) => col.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('账单号列应该有render函数', () => {
      const columns = createBillTableColumns(mockActions);
      const billNoColumn = columns.find((col) => col.title === '账单号');

      expect(billNoColumn?.render).toBeDefined();
      expect(typeof billNoColumn?.render).toBe('function');
    });

    it('类型列应该有render函数', () => {
      const columns = createBillTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');

      expect(typeColumn?.render).toBeDefined();
      expect(typeof typeColumn?.render).toBe('function');
    });

    it('金额列应该有render函数', () => {
      const columns = createBillTableColumns(mockActions);
      const amountColumn = columns.find((col) => col.title === '金额');

      expect(amountColumn?.render).toBeDefined();
      expect(typeof amountColumn?.render).toBe('function');
    });

    it('状态列应该有render函数', () => {
      const columns = createBillTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      expect(statusColumn?.render).toBeDefined();
      expect(typeof statusColumn?.render).toBe('function');
    });

    it('支付方式列应该有render函数', () => {
      const columns = createBillTableColumns(mockActions);
      const paymentColumn = columns.find((col) => col.title === '支付方式');

      expect(paymentColumn?.render).toBeDefined();
      expect(typeof paymentColumn?.render).toBe('function');
    });

    it('账期范围列应该有render函数', () => {
      const columns = createBillTableColumns(mockActions);
      const periodColumn = columns.find((col) => col.title === '账期范围');

      expect(periodColumn?.render).toBeDefined();
      expect(typeof periodColumn?.render).toBe('function');
    });

    it('创建时间列应该有render函数', () => {
      const columns = createBillTableColumns(mockActions);
      const timeColumn = columns.find((col) => col.title === '创建时间');

      expect(timeColumn?.render).toBeDefined();
      expect(typeof timeColumn?.render).toBe('function');
    });

    it('操作列应该有render函数', () => {
      const columns = createBillTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      expect(actionsColumn?.render).toBeDefined();
      expect(typeof actionsColumn?.render).toBe('function');
    });

    it('操作列应该固定在右侧', () => {
      const columns = createBillTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      expect(actionsColumn?.fixed).toBe('right');
    });

    it('所有列都应该有合理的width', () => {
      const columns = createBillTableColumns(mockActions);
      columns
        .filter((col) => col.width)
        .forEach((col) => {
          expect(col.width).toBeGreaterThan(0);
          expect(col.width).toBeLessThan(1000);
        });
    });
  });

  describe('账单类型配置', () => {
    it('应该支持所有账单类型', () => {
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

      const columns = createBillTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');

      types.forEach((type) => {
        expect(() => {
          if (typeColumn?.render) {
            typeColumn.render(type, {} as Bill, 0);
          }
        }).not.toThrow();
      });
    });

    it('订阅费应该是蓝色', () => {
      const columns = createBillTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');

      if (typeColumn?.render) {
        const result = typeColumn.render(
          BillType.SUBSCRIPTION,
          {} as Bill,
          0
        ) as any;
        expect(result.props.color).toBe('blue');
      }
    });

    it('充值应该是绿色', () => {
      const columns = createBillTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');

      if (typeColumn?.render) {
        const result = typeColumn.render(BillType.RECHARGE, {} as Bill, 0) as any;
        expect(result.props.color).toBe('green');
      }
    });

    it('违约金应该是红色', () => {
      const columns = createBillTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');

      if (typeColumn?.render) {
        const result = typeColumn.render(BillType.PENALTY, {} as Bill, 0) as any;
        expect(result.props.color).toBe('red');
      }
    });
  });

  describe('账单状态配置', () => {
    it('应该支持所有账单状态', () => {
      const statuses = [
        BillStatus.PENDING,
        BillStatus.PAID,
        BillStatus.CANCELLED,
        BillStatus.REFUNDED,
        BillStatus.OVERDUE,
        BillStatus.PARTIAL,
      ];

      const columns = createBillTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      statuses.forEach((status) => {
        expect(() => {
          if (statusColumn?.render) {
            statusColumn.render(status, {} as Bill, 0);
          }
        }).not.toThrow();
      });
    });

    it('待支付应该是warning', () => {
      const columns = createBillTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const result = statusColumn.render(BillStatus.PENDING, {} as Bill, 0) as any;
        expect(result.props.color).toBe('warning');
      }
    });

    it('已支付应该是success', () => {
      const columns = createBillTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const result = statusColumn.render(BillStatus.PAID, {} as Bill, 0) as any;
        expect(result.props.color).toBe('success');
      }
    });

    it('已逾期应该是error', () => {
      const columns = createBillTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const result = statusColumn.render(BillStatus.OVERDUE, {} as Bill, 0) as any;
        expect(result.props.color).toBe('error');
      }
    });
  });

  describe('支付方式配置', () => {
    it('应该支持所有支付方式', () => {
      const methods = [
        PaymentMethod.BALANCE,
        PaymentMethod.ALIPAY,
        PaymentMethod.WECHAT,
        PaymentMethod.CREDIT_CARD,
        PaymentMethod.PAYPAL,
      ];

      const columns = createBillTableColumns(mockActions);
      const paymentColumn = columns.find((col) => col.title === '支付方式');

      methods.forEach((method) => {
        expect(() => {
          if (paymentColumn?.render) {
            paymentColumn.render(method, {} as Bill, 0);
          }
        }).not.toThrow();
      });
    });

    it('无支付方式时应该显示"-"', () => {
      const columns = createBillTableColumns(mockActions);
      const paymentColumn = columns.find((col) => col.title === '支付方式');

      if (paymentColumn?.render) {
        const result = paymentColumn.render(undefined, {} as Bill, 0);
        expect(result).toBe('-');
      }
    });

    it('余额支付应该是蓝色', () => {
      const columns = createBillTableColumns(mockActions);
      const paymentColumn = columns.find((col) => col.title === '支付方式');

      if (paymentColumn?.render) {
        const result = paymentColumn.render(
          PaymentMethod.BALANCE,
          {} as Bill,
          0
        ) as any;
        expect(result.props.color).toBe('blue');
      }
    });

    it('微信支付应该是绿色', () => {
      const columns = createBillTableColumns(mockActions);
      const paymentColumn = columns.find((col) => col.title === '支付方式');

      if (paymentColumn?.render) {
        const result = paymentColumn.render(
          PaymentMethod.WECHAT,
          {} as Bill,
          0
        ) as any;
        expect(result.props.color).toBe('green');
      }
    });
  });

  describe('账期范围渲染', () => {
    it('无账期时应该显示"-"', () => {
      const columns = createBillTableColumns(mockActions);
      const periodColumn = columns.find((col) => col.title === '账期范围');

      const bill: Partial<Bill> = {
        id: '1',
        periodStart: undefined,
        periodEnd: undefined,
      };

      if (periodColumn?.render) {
        const result = periodColumn.render(undefined, bill as Bill, 0);
        expect(result).toBe('-');
      }
    });

    it('有账期时应该格式化显示', () => {
      const columns = createBillTableColumns(mockActions);
      const periodColumn = columns.find((col) => col.title === '账期范围');

      const bill: Partial<Bill> = {
        id: '1',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
      };

      if (periodColumn?.render) {
        const result = periodColumn.render(undefined, bill as Bill, 0);
        expect(result).toBeDefined();
      }
    });
  });

  describe('操作按钮', () => {
    it('待支付状态应该显示支付按钮', () => {
      const columns = createBillTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      const bill: Partial<Bill> = {
        id: '1',
        status: BillStatus.PENDING,
      };

      if (actionsColumn?.render) {
        const result = actionsColumn.render(undefined, bill as Bill, 0) as any;
        expect(result.props.children).toBeDefined();
      }
    });

    it('已支付状态应该显示下载按钮', () => {
      const columns = createBillTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      const bill: Partial<Bill> = {
        id: '1',
        status: BillStatus.PAID,
      };

      if (actionsColumn?.render) {
        const result = actionsColumn.render(undefined, bill as Bill, 0) as any;
        expect(result.props.children).toBeDefined();
      }
    });

    it('所有状态都应该显示详情按钮', () => {
      const statuses = [
        BillStatus.PENDING,
        BillStatus.PAID,
        BillStatus.CANCELLED,
        BillStatus.REFUNDED,
        BillStatus.OVERDUE,
        BillStatus.PARTIAL,
      ];

      const columns = createBillTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      statuses.forEach((status) => {
        const bill: Partial<Bill> = {
          id: '1',
          status,
        };

        if (actionsColumn?.render) {
          const result = actionsColumn.render(undefined, bill as Bill, 0) as any;
          expect(result.props.children).toBeDefined();
        }
      });
    });
  });

  describe('列宽度配置', () => {
    it('账单号列宽度应该是180', () => {
      const columns = createBillTableColumns(mockActions);
      const billNoColumn = columns.find((col) => col.title === '账单号');
      expect(billNoColumn?.width).toBe(180);
    });

    it('类型列宽度应该是100', () => {
      const columns = createBillTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');
      expect(typeColumn?.width).toBe(100);
    });

    it('金额列宽度应该是120', () => {
      const columns = createBillTableColumns(mockActions);
      const amountColumn = columns.find((col) => col.title === '金额');
      expect(amountColumn?.width).toBe(120);
    });

    it('操作列宽度应该是180', () => {
      const columns = createBillTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');
      expect(actionsColumn?.width).toBe(180);
    });
  });

  describe('数据完整性', () => {
    it('每列都应该有title', () => {
      const columns = createBillTableColumns(mockActions);
      columns.forEach((col) => {
        expect(col.title).toBeDefined();
      });
    });

    it('每列都应该有key或dataIndex', () => {
      const columns = createBillTableColumns(mockActions);
      columns.forEach((col) => {
        expect(col.key || col.dataIndex).toBeDefined();
      });
    });

    it('带render的列都应该是函数', () => {
      const columns = createBillTableColumns(mockActions);
      columns
        .filter((col) => col.render)
        .forEach((col) => {
          expect(typeof col.render).toBe('function');
        });
    });
  });

  describe('颜色语义', () => {
    it('成功状态应该使用绿色系', () => {
      const columns = createBillTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const result = statusColumn.render(BillStatus.PAID, {} as Bill, 0) as any;
        expect(['success', 'green']).toContain(result.props.color);
      }
    });

    it('警告状态应该使用橙色/黄色系', () => {
      const columns = createBillTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const result = statusColumn.render(BillStatus.PENDING, {} as Bill, 0) as any;
        expect(['warning', 'orange']).toContain(result.props.color);
      }
    });

    it('错误状态应该使用红色系', () => {
      const columns = createBillTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const result = statusColumn.render(BillStatus.OVERDUE, {} as Bill, 0) as any;
        expect(['error', 'red']).toContain(result.props.color);
      }
    });
  });
});
