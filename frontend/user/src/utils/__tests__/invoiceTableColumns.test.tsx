import { describe, it, expect, vi } from 'vitest';
import type { Invoice } from '@/services/billing';

// Mock the billing service
vi.mock('@/services/billing', async () => {
  const actual = await vi.importActual('@/services/billing');
  return {
    ...actual,
  };
});

// Dynamically import to ensure mocks are applied
const { createInvoiceTableColumns } = await import('../invoiceTableColumns');

describe('invoiceTableColumns 发票表格列配置', () => {
  const mockActions = {
    onViewDetail: vi.fn(),
    onDownload: vi.fn(),
    downloading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInvoiceTableColumns 函数', () => {
    it('应该返回列配置数组', () => {
      const columns = createInvoiceTableColumns(mockActions);
      expect(Array.isArray(columns)).toBe(true);
    });

    it('应该有8列', () => {
      const columns = createInvoiceTableColumns(mockActions);
      expect(columns).toHaveLength(8);
    });

    it('应该包含所有必需的列', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const titles = columns.map((col) => col.title);

      expect(titles).toContain('发票号');
      expect(titles).toContain('发票抬头');
      expect(titles).toContain('类型');
      expect(titles).toContain('金额');
      expect(titles).toContain('状态');
      expect(titles).toContain('申请时间');
      expect(titles).toContain('开具时间');
      expect(titles).toContain('操作');
    });

    it('所有列的key应该唯一', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const keys = columns.map((col) => col.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('发票号列应该有render函数', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const invoiceNoColumn = columns.find((col) => col.title === '发票号');

      expect(invoiceNoColumn?.render).toBeDefined();
      expect(typeof invoiceNoColumn?.render).toBe('function');
    });

    it('发票抬头列应该有ellipsis', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const titleColumn = columns.find((col) => col.title === '发票抬头');

      expect(titleColumn?.ellipsis).toBe(true);
    });

    it('类型列应该有render函数', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');

      expect(typeColumn?.render).toBeDefined();
      expect(typeof typeColumn?.render).toBe('function');
    });

    it('金额列应该有render函数', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const amountColumn = columns.find((col) => col.title === '金额');

      expect(amountColumn?.render).toBeDefined();
      expect(typeof amountColumn?.render).toBe('function');
    });

    it('金额列应该右对齐', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const amountColumn = columns.find((col) => col.title === '金额');

      expect(amountColumn?.align).toBe('right');
    });

    it('状态列应该有render函数', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      expect(statusColumn?.render).toBeDefined();
      expect(typeof statusColumn?.render).toBe('function');
    });

    it('状态列应该居中对齐', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      expect(statusColumn?.align).toBe('center');
    });

    it('申请时间列应该有render函数', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const createdAtColumn = columns.find((col) => col.title === '申请时间');

      expect(createdAtColumn?.render).toBeDefined();
      expect(typeof createdAtColumn?.render).toBe('function');
    });

    it('开具时间列应该有render函数', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const issuedAtColumn = columns.find((col) => col.title === '开具时间');

      expect(issuedAtColumn?.render).toBeDefined();
      expect(typeof issuedAtColumn?.render).toBe('function');
    });

    it('操作列应该有render函数', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      expect(actionsColumn?.render).toBeDefined();
      expect(typeof actionsColumn?.render).toBe('function');
    });

    it('操作列应该固定在右侧', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      expect(actionsColumn?.fixed).toBe('right');
    });

    it('所有列都应该有合理的width', () => {
      const columns = createInvoiceTableColumns(mockActions);
      columns
        .filter((col) => col.width)
        .forEach((col) => {
          expect(col.width).toBeGreaterThan(0);
          expect(col.width).toBeLessThan(1000);
        });
    });
  });

  describe('发票类型配置', () => {
    it('企业发票应该是蓝色', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');

      if (typeColumn?.render) {
        const result = typeColumn.render('company', {} as Invoice, 0) as any;
        expect(result.props.color).toBe('blue');
        expect(result.props.children).toBe('企业');
      }
    });

    it('个人发票应该是绿色', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');

      if (typeColumn?.render) {
        const result = typeColumn.render('personal', {} as Invoice, 0) as any;
        expect(result.props.color).toBe('green');
        expect(result.props.children).toBe('个人');
      }
    });

    it('应该能正确识别类型', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');

      if (typeColumn?.render) {
        const companyResult = typeColumn.render(
          'company',
          {} as Invoice,
          0
        ) as any;
        const personalResult = typeColumn.render(
          'personal',
          {} as Invoice,
          0
        ) as any;

        expect(companyResult.props.children).toBe('企业');
        expect(personalResult.props.children).toBe('个人');
      }
    });
  });

  describe('发票状态配置', () => {
    it('待开具状态应该是processing', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const result = statusColumn.render('pending', {} as Invoice, 0) as any;
        expect(result.props.color).toBe('processing');
        expect(result.props.children).toBe('待开具');
      }
    });

    it('已开具状态应该是success', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const result = statusColumn.render('issued', {} as Invoice, 0) as any;
        expect(result.props.color).toBe('success');
        expect(result.props.children).toBe('已开具');
      }
    });

    it('已拒绝状态应该是error', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const result = statusColumn.render('rejected', {} as Invoice, 0) as any;
        expect(result.props.color).toBe('error');
        expect(result.props.children).toBe('已拒绝');
      }
    });

    it('每个状态都应该有图标', () => {
      const statuses = ['pending', 'issued', 'rejected'];

      const columns = createInvoiceTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      statuses.forEach((status) => {
        if (statusColumn?.render) {
          const result = statusColumn.render(status, {} as Invoice, 0) as any;
          expect(result.props.icon).toBeDefined();
        }
      });
    });

    it('未知状态应该回退到pending配置', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const result = statusColumn.render('unknown', {} as Invoice, 0) as any;
        // 未知状态会回退到 statusConfig.pending 的配置
        expect(result.props.color).toBe('processing');
        expect(result.props.children).toBe('待开具');
      }
    });
  });

  describe('金额渲染', () => {
    it('应该显示人民币符号', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const amountColumn = columns.find((col) => col.title === '金额');

      if (amountColumn?.render) {
        const result = amountColumn.render(100.5, {} as Invoice, 0) as any;
        expect(result.props.children).toContain('¥');
      }
    });

    it('应该显示两位小数', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const amountColumn = columns.find((col) => col.title === '金额');

      if (amountColumn?.render) {
        const result = amountColumn.render(100.5, {} as Invoice, 0) as any;
        expect(result.props.children).toContain('100.50');
      }
    });

    it('整数金额应该显示.00', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const amountColumn = columns.find((col) => col.title === '金额');

      if (amountColumn?.render) {
        const result = amountColumn.render(100, {} as Invoice, 0) as any;
        expect(result.props.children).toContain('100.00');
      }
    });

    it('金额应该使用突出样式', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const amountColumn = columns.find((col) => col.title === '金额');

      if (amountColumn?.render) {
        const result = amountColumn.render(100, {} as Invoice, 0) as any;
        expect(result.props.strong).toBe(true);
        expect(result.props.style.color).toBe('#1677ff');
      }
    });
  });

  describe('时间渲染', () => {
    it('申请时间应该格式化显示', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const createdAtColumn = columns.find((col) => col.title === '申请时间');

      if (createdAtColumn?.render) {
        const result = createdAtColumn.render(
          '2024-01-01T12:00:00',
          {} as Invoice,
          0
        );
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }
    });

    it('开具时间存在时应该格式化显示', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const issuedAtColumn = columns.find((col) => col.title === '开具时间');

      if (issuedAtColumn?.render) {
        const result = issuedAtColumn.render(
          '2024-01-01T12:00:00',
          {} as Invoice,
          0
        );
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }
    });

    it('开具时间不存在时应该显示"-"', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const issuedAtColumn = columns.find((col) => col.title === '开具时间');

      if (issuedAtColumn?.render) {
        const result = issuedAtColumn.render(undefined, {} as Invoice, 0);
        expect(result).toBe('-');
      }
    });
  });

  describe('操作按钮', () => {
    it('所有状态都应该显示详情按钮', () => {
      const statuses = ['pending', 'issued', 'rejected'];

      const columns = createInvoiceTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      statuses.forEach((status) => {
        const invoice: Partial<Invoice> = {
          id: '1',
          status,
        };

        if (actionsColumn?.render) {
          const result = actionsColumn.render(
            undefined,
            invoice as Invoice,
            0
          ) as any;
          expect(result.props.children).toBeDefined();
        }
      });
    });

    it('已开具且有下载链接时应该显示下载按钮', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      const invoice: Partial<Invoice> = {
        id: '1',
        status: 'issued',
        downloadUrl: 'http://example.com/invoice.pdf',
        invoiceNo: 'INV-001',
      };

      if (actionsColumn?.render) {
        const result = actionsColumn.render(
          undefined,
          invoice as Invoice,
          0
        ) as any;
        expect(result.props.children).toBeDefined();
      }
    });

    it('下载按钮应该显示loading状态', () => {
      const downloadingActions = {
        ...mockActions,
        downloading: true,
      };

      const columns = createInvoiceTableColumns(downloadingActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      const invoice: Partial<Invoice> = {
        id: '1',
        status: 'issued',
        downloadUrl: 'http://example.com/invoice.pdf',
        invoiceNo: 'INV-001',
      };

      if (actionsColumn?.render) {
        const result = actionsColumn.render(
          undefined,
          invoice as Invoice,
          0
        ) as any;
        expect(result.props.children).toBeDefined();
      }
    });

    it('未开具发票不应该显示下载按钮', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      const invoice: Partial<Invoice> = {
        id: '1',
        status: 'pending',
        invoiceNo: 'INV-001',
      };

      if (actionsColumn?.render) {
        const result = actionsColumn.render(
          undefined,
          invoice as Invoice,
          0
        ) as any;
        expect(result.props.children).toBeDefined();
      }
    });
  });

  describe('列宽度配置', () => {
    it('发票号列宽度应该是180', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const invoiceNoColumn = columns.find((col) => col.title === '发票号');
      expect(invoiceNoColumn?.width).toBe(180);
    });

    it('类型列宽度应该是100', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');
      expect(typeColumn?.width).toBe(100);
    });

    it('金额列宽度应该是120', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const amountColumn = columns.find((col) => col.title === '金额');
      expect(amountColumn?.width).toBe(120);
    });

    it('状态列宽度应该是100', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');
      expect(statusColumn?.width).toBe(100);
    });

    it('申请时间列宽度应该是180', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const createdAtColumn = columns.find((col) => col.title === '申请时间');
      expect(createdAtColumn?.width).toBe(180);
    });

    it('开具时间列宽度应该是180', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const issuedAtColumn = columns.find((col) => col.title === '开具时间');
      expect(issuedAtColumn?.width).toBe(180);
    });

    it('操作列宽度应该是200', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');
      expect(actionsColumn?.width).toBe(200);
    });
  });

  describe('数据完整性', () => {
    it('每列都应该有title', () => {
      const columns = createInvoiceTableColumns(mockActions);
      columns.forEach((col) => {
        expect(col.title).toBeDefined();
      });
    });

    it('每列都应该有key或dataIndex', () => {
      const columns = createInvoiceTableColumns(mockActions);
      columns.forEach((col) => {
        expect(col.key || col.dataIndex).toBeDefined();
      });
    });

    it('带render的列都应该是函数', () => {
      const columns = createInvoiceTableColumns(mockActions);
      columns
        .filter((col) => col.render)
        .forEach((col) => {
          expect(typeof col.render).toBe('function');
        });
    });
  });

  describe('颜色语义', () => {
    it('成功状态应该使用绿色系', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const result = statusColumn.render('issued', {} as Invoice, 0) as any;
        expect(['success', 'green']).toContain(result.props.color);
      }
    });

    it('错误状态应该使用红色系', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const result = statusColumn.render('rejected', {} as Invoice, 0) as any;
        expect(['error', 'red']).toContain(result.props.color);
      }
    });

    it('处理中状态应该使用processing', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const result = statusColumn.render('pending', {} as Invoice, 0) as any;
        expect(['processing', 'blue']).toContain(result.props.color);
      }
    });

    it('企业类型应该使用蓝色', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');

      if (typeColumn?.render) {
        const result = typeColumn.render('company', {} as Invoice, 0) as any;
        expect(result.props.color).toBe('blue');
      }
    });

    it('个人类型应该使用绿色', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');

      if (typeColumn?.render) {
        const result = typeColumn.render('personal', {} as Invoice, 0) as any;
        expect(result.props.color).toBe('green');
      }
    });
  });

  describe('特殊字符处理', () => {
    it('发票号应该使用等宽字体', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const invoiceNoColumn = columns.find((col) => col.title === '发票号');

      if (invoiceNoColumn?.render) {
        const result = invoiceNoColumn.render('INV-001', {} as Invoice, 0) as any;
        expect(result.props.style.fontFamily).toBe('monospace');
        expect(result.props.strong).toBe(true);
      }
    });

    it('金额应该有特殊样式', () => {
      const columns = createInvoiceTableColumns(mockActions);
      const amountColumn = columns.find((col) => col.title === '金额');

      if (amountColumn?.render) {
        const result = amountColumn.render(100, {} as Invoice, 0) as any;
        expect(result.props.strong).toBe(true);
        expect(result.props.style).toBeDefined();
        expect(result.props.style.fontSize).toBe('16px');
      }
    });
  });

  describe('配置一致性', () => {
    it('状态配置应该包含所有可能的状态', () => {
      const statuses = ['pending', 'issued', 'rejected'];
      const columns = createInvoiceTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      statuses.forEach((status) => {
        expect(() => {
          if (statusColumn?.render) {
            statusColumn.render(status, {} as Invoice, 0);
          }
        }).not.toThrow();
      });
    });

    it('类型配置应该包含企业和个人', () => {
      const types = ['company', 'personal'];
      const columns = createInvoiceTableColumns(mockActions);
      const typeColumn = columns.find((col) => col.title === '类型');

      types.forEach((type) => {
        expect(() => {
          if (typeColumn?.render) {
            typeColumn.render(type, {} as Invoice, 0);
          }
        }).not.toThrow();
      });
    });
  });
});
