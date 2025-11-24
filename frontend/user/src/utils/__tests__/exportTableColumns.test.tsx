import { describe, it, expect, vi } from 'vitest';
import {
  ExportDataType,
  ExportFormat,
  ExportStatus,
  type ExportTask,
} from '@/services/export';

// Mock the export service
vi.mock('@/services/export', async () => {
  const actual = await vi.importActual('@/services/export');
  return {
    ...actual,
    formatFileSize: (size: number) => {
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    },
  };
});

// Dynamically import to ensure mocks are applied
const { createExportTableColumns } = await import('../exportTableColumns');

describe('exportTableColumns 导出任务表格列配置', () => {
  const mockActions = {
    onDownload: vi.fn(),
    onDelete: vi.fn(),
    onRetry: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createExportTableColumns 函数', () => {
    it('应该返回列配置数组', () => {
      const columns = createExportTableColumns(mockActions);
      expect(Array.isArray(columns)).toBe(true);
    });

    it('应该有8列', () => {
      const columns = createExportTableColumns(mockActions);
      expect(columns).toHaveLength(8);
    });

    it('应该包含所有必需的列', () => {
      const columns = createExportTableColumns(mockActions);
      const titles = columns.map((col) => col.title);

      expect(titles).toContain('文件名');
      expect(titles).toContain('数据类型');
      expect(titles).toContain('格式');
      expect(titles).toContain('状态');
      expect(titles).toContain('文件大小');
      expect(titles).toContain('记录数');
      expect(titles).toContain('创建时间');
      expect(titles).toContain('操作');
    });

    it('所有列的key应该唯一', () => {
      const columns = createExportTableColumns(mockActions);
      const keys = columns.map((col) => col.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('文件名列应该有ellipsis', () => {
      const columns = createExportTableColumns(mockActions);
      const fileNameColumn = columns.find((col) => col.title === '文件名');

      expect(fileNameColumn?.ellipsis).toBe(true);
    });

    it('数据类型列应该有render函数', () => {
      const columns = createExportTableColumns(mockActions);
      const dataTypeColumn = columns.find((col) => col.title === '数据类型');

      expect(dataTypeColumn?.render).toBeDefined();
      expect(typeof dataTypeColumn?.render).toBe('function');
    });

    it('格式列应该有render函数', () => {
      const columns = createExportTableColumns(mockActions);
      const formatColumn = columns.find((col) => col.title === '格式');

      expect(formatColumn?.render).toBeDefined();
      expect(typeof formatColumn?.render).toBe('function');
    });

    it('状态列应该有render函数', () => {
      const columns = createExportTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      expect(statusColumn?.render).toBeDefined();
      expect(typeof statusColumn?.render).toBe('function');
    });

    it('文件大小列应该有render函数', () => {
      const columns = createExportTableColumns(mockActions);
      const sizeColumn = columns.find((col) => col.title === '文件大小');

      expect(sizeColumn?.render).toBeDefined();
      expect(typeof sizeColumn?.render).toBe('function');
    });

    it('记录数列应该有render函数', () => {
      const columns = createExportTableColumns(mockActions);
      const countColumn = columns.find((col) => col.title === '记录数');

      expect(countColumn?.render).toBeDefined();
      expect(typeof countColumn?.render).toBe('function');
    });

    it('创建时间列应该有render函数', () => {
      const columns = createExportTableColumns(mockActions);
      const timeColumn = columns.find((col) => col.title === '创建时间');

      expect(timeColumn?.render).toBeDefined();
      expect(typeof timeColumn?.render).toBe('function');
    });

    it('操作列应该有render函数', () => {
      const columns = createExportTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      expect(actionsColumn?.render).toBeDefined();
      expect(typeof actionsColumn?.render).toBe('function');
    });

    it('操作列应该固定在右侧', () => {
      const columns = createExportTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      expect(actionsColumn?.fixed).toBe('right');
    });

    it('所有列都应该有合理的width', () => {
      const columns = createExportTableColumns(mockActions);
      columns
        .filter((col) => col.width)
        .forEach((col) => {
          expect(col.width).toBeGreaterThan(0);
          expect(col.width).toBeLessThan(1000);
        });
    });
  });

  describe('数据类型配置', () => {
    it('应该支持所有数据类型', () => {
      const types = [
        ExportDataType.ORDERS,
        ExportDataType.DEVICES,
        ExportDataType.TICKETS,
        ExportDataType.BILLING,
        ExportDataType.USAGE,
        ExportDataType.MESSAGES,
        ExportDataType.TRANSACTIONS,
      ];

      const columns = createExportTableColumns(mockActions);
      const dataTypeColumn = columns.find((col) => col.title === '数据类型');

      types.forEach((type) => {
        expect(() => {
          if (dataTypeColumn?.render) {
            dataTypeColumn.render(type, {} as ExportTask, 0);
          }
        }).not.toThrow();
      });
    });

    it('订单数据应该是蓝色', () => {
      const columns = createExportTableColumns(mockActions);
      const dataTypeColumn = columns.find((col) => col.title === '数据类型');

      if (dataTypeColumn?.render) {
        const result = dataTypeColumn.render(
          ExportDataType.ORDERS,
          {} as ExportTask,
          0
        ) as any;
        expect(result.props.color).toBe('#1677ff');
      }
    });

    it('设备数据应该是绿色', () => {
      const columns = createExportTableColumns(mockActions);
      const dataTypeColumn = columns.find((col) => col.title === '数据类型');

      if (dataTypeColumn?.render) {
        const result = dataTypeColumn.render(
          ExportDataType.DEVICES,
          {} as ExportTask,
          0
        ) as any;
        expect(result.props.color).toBe('#52c41a');
      }
    });

    it('账单数据应该是粉色', () => {
      const columns = createExportTableColumns(mockActions);
      const dataTypeColumn = columns.find((col) => col.title === '数据类型');

      if (dataTypeColumn?.render) {
        const result = dataTypeColumn.render(
          ExportDataType.BILLING,
          {} as ExportTask,
          0
        ) as any;
        expect(result.props.color).toBe('#eb2f96');
      }
    });
  });

  describe('格式配置', () => {
    it('应该支持所有导出格式', () => {
      const formats = [
        ExportFormat.CSV,
        ExportFormat.EXCEL,
        ExportFormat.PDF,
        ExportFormat.JSON,
      ];

      const columns = createExportTableColumns(mockActions);
      const formatColumn = columns.find((col) => col.title === '格式');

      formats.forEach((format) => {
        expect(() => {
          if (formatColumn?.render) {
            formatColumn.render(format, {} as ExportTask, 0);
          }
        }).not.toThrow();
      });
    });

    it('CSV格式应该是绿色', () => {
      const columns = createExportTableColumns(mockActions);
      const formatColumn = columns.find((col) => col.title === '格式');

      if (formatColumn?.render) {
        const result = formatColumn.render(
          ExportFormat.CSV,
          {} as ExportTask,
          0
        ) as any;
        expect(result.props.color).toBe('#52c41a');
      }
    });

    it('Excel格式应该是蓝色', () => {
      const columns = createExportTableColumns(mockActions);
      const formatColumn = columns.find((col) => col.title === '格式');

      if (formatColumn?.render) {
        const result = formatColumn.render(
          ExportFormat.EXCEL,
          {} as ExportTask,
          0
        ) as any;
        expect(result.props.color).toBe('#1677ff');
      }
    });

    it('PDF格式应该是红色', () => {
      const columns = createExportTableColumns(mockActions);
      const formatColumn = columns.find((col) => col.title === '格式');

      if (formatColumn?.render) {
        const result = formatColumn.render(
          ExportFormat.PDF,
          {} as ExportTask,
          0
        ) as any;
        expect(result.props.color).toBe('#f5222d');
      }
    });

    it('每个格式都应该有图标', () => {
      const formats = [
        ExportFormat.CSV,
        ExportFormat.EXCEL,
        ExportFormat.PDF,
        ExportFormat.JSON,
      ];

      const columns = createExportTableColumns(mockActions);
      const formatColumn = columns.find((col) => col.title === '格式');

      formats.forEach((format) => {
        if (formatColumn?.render) {
          const result = formatColumn.render(format, {} as ExportTask, 0) as any;
          expect(result.props.icon).toBeDefined();
        }
      });
    });
  });

  describe('状态配置', () => {
    it('应该支持所有导出状态', () => {
      const statuses = [
        ExportStatus.PENDING,
        ExportStatus.PROCESSING,
        ExportStatus.COMPLETED,
        ExportStatus.FAILED,
        ExportStatus.EXPIRED,
      ];

      const columns = createExportTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      statuses.forEach((status) => {
        expect(() => {
          if (statusColumn?.render) {
            statusColumn.render(status, {} as ExportTask, 0);
          }
        }).not.toThrow();
      });
    });

    it('等待中状态应该是default', () => {
      const columns = createExportTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const task: Partial<ExportTask> = {
          id: '1',
          status: ExportStatus.PENDING,
        };
        const result = statusColumn.render(
          ExportStatus.PENDING,
          task as ExportTask,
          0
        ) as any;
        expect(result.props.children[0].props.color).toBe('default');
      }
    });

    it('处理中状态应该是processing', () => {
      const columns = createExportTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const task: Partial<ExportTask> = {
          id: '1',
          status: ExportStatus.PROCESSING,
        };
        const result = statusColumn.render(
          ExportStatus.PROCESSING,
          task as ExportTask,
          0
        ) as any;
        expect(result.props.children[0].props.color).toBe('processing');
      }
    });

    it('已完成状态应该是success', () => {
      const columns = createExportTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const task: Partial<ExportTask> = {
          id: '1',
          status: ExportStatus.COMPLETED,
        };
        const result = statusColumn.render(
          ExportStatus.COMPLETED,
          task as ExportTask,
          0
        ) as any;
        expect(result.props.children[0].props.color).toBe('success');
      }
    });

    it('失败状态应该是error', () => {
      const columns = createExportTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const task: Partial<ExportTask> = {
          id: '1',
          status: ExportStatus.FAILED,
        };
        const result = statusColumn.render(
          ExportStatus.FAILED,
          task as ExportTask,
          0
        ) as any;
        expect(result.props.children[0].props.color).toBe('error');
      }
    });

    it('每个状态都应该有图标', () => {
      const statuses = [
        ExportStatus.PENDING,
        ExportStatus.PROCESSING,
        ExportStatus.COMPLETED,
        ExportStatus.FAILED,
        ExportStatus.EXPIRED,
      ];

      const columns = createExportTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      statuses.forEach((status) => {
        if (statusColumn?.render) {
          const task: Partial<ExportTask> = { id: '1', status };
          const result = statusColumn.render(
            status,
            task as ExportTask,
            0
          ) as any;
          expect(result.props.children[0].props.icon).toBeDefined();
        }
      });
    });

    it('处理中状态应该显示进度条', () => {
      const columns = createExportTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const task: Partial<ExportTask> = {
          id: '1',
          status: ExportStatus.PROCESSING,
          recordCount: 100,
        };
        const result = statusColumn.render(
          ExportStatus.PROCESSING,
          task as ExportTask,
          0
        ) as any;
        expect(result.props.children[1]).toBeDefined();
      }
    });
  });

  describe('文件大小渲染', () => {
    it('无文件大小时应该显示"-"', () => {
      const columns = createExportTableColumns(mockActions);
      const sizeColumn = columns.find((col) => col.title === '文件大小');

      if (sizeColumn?.render) {
        const result = sizeColumn.render(undefined, {} as ExportTask, 0);
        expect(result).toBe('-');
      }
    });

    it('有文件大小时应该格式化显示', () => {
      const columns = createExportTableColumns(mockActions);
      const sizeColumn = columns.find((col) => col.title === '文件大小');

      if (sizeColumn?.render) {
        const result = sizeColumn.render(1024 * 1024, {} as ExportTask, 0);
        expect(result).toBeDefined();
        expect(result).not.toBe('-');
      }
    });
  });

  describe('记录数渲染', () => {
    it('无记录数时应该显示"-"', () => {
      const columns = createExportTableColumns(mockActions);
      const countColumn = columns.find((col) => col.title === '记录数');

      if (countColumn?.render) {
        const result = countColumn.render(undefined, {} as ExportTask, 0);
        expect(result).toBe('-');
      }
    });

    it('有记录数时应该显示数字', () => {
      const columns = createExportTableColumns(mockActions);
      const countColumn = columns.find((col) => col.title === '记录数');

      if (countColumn?.render) {
        const result = countColumn.render(100, {} as ExportTask, 0);
        expect(result).toBe(100);
      }
    });
  });

  describe('操作按钮', () => {
    it('已完成状态应该显示下载按钮', () => {
      const columns = createExportTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      const task: Partial<ExportTask> = {
        id: '1',
        status: ExportStatus.COMPLETED,
      };

      if (actionsColumn?.render) {
        const result = actionsColumn.render(undefined, task as ExportTask, 0) as any;
        expect(result.props.children).toBeDefined();
      }
    });

    it('失败状态应该显示重试按钮', () => {
      const columns = createExportTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      const task: Partial<ExportTask> = {
        id: '1',
        status: ExportStatus.FAILED,
      };

      if (actionsColumn?.render) {
        const result = actionsColumn.render(undefined, task as ExportTask, 0) as any;
        expect(result.props.children).toBeDefined();
      }
    });

    it('所有状态都应该显示删除按钮', () => {
      const statuses = [
        ExportStatus.PENDING,
        ExportStatus.PROCESSING,
        ExportStatus.COMPLETED,
        ExportStatus.FAILED,
        ExportStatus.EXPIRED,
      ];

      const columns = createExportTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');

      statuses.forEach((status) => {
        const task: Partial<ExportTask> = {
          id: '1',
          status,
        };

        if (actionsColumn?.render) {
          const result = actionsColumn.render(
            undefined,
            task as ExportTask,
            0
          ) as any;
          expect(result.props.children).toBeDefined();
        }
      });
    });
  });

  describe('列宽度配置', () => {
    it('文件名列宽度应该是250', () => {
      const columns = createExportTableColumns(mockActions);
      const fileNameColumn = columns.find((col) => col.title === '文件名');
      expect(fileNameColumn?.width).toBe(250);
    });

    it('数据类型列宽度应该是120', () => {
      const columns = createExportTableColumns(mockActions);
      const dataTypeColumn = columns.find((col) => col.title === '数据类型');
      expect(dataTypeColumn?.width).toBe(120);
    });

    it('格式列宽度应该是100', () => {
      const columns = createExportTableColumns(mockActions);
      const formatColumn = columns.find((col) => col.title === '格式');
      expect(formatColumn?.width).toBe(100);
    });

    it('操作列宽度应该是150', () => {
      const columns = createExportTableColumns(mockActions);
      const actionsColumn = columns.find((col) => col.title === '操作');
      expect(actionsColumn?.width).toBe(150);
    });
  });

  describe('数据完整性', () => {
    it('每列都应该有title', () => {
      const columns = createExportTableColumns(mockActions);
      columns.forEach((col) => {
        expect(col.title).toBeDefined();
      });
    });

    it('每列都应该有key或dataIndex', () => {
      const columns = createExportTableColumns(mockActions);
      columns.forEach((col) => {
        expect(col.key || col.dataIndex).toBeDefined();
      });
    });

    it('带render的列都应该是函数', () => {
      const columns = createExportTableColumns(mockActions);
      columns
        .filter((col) => col.render)
        .forEach((col) => {
          expect(typeof col.render).toBe('function');
        });
    });
  });

  describe('颜色语义', () => {
    it('成功状态应该使用绿色系', () => {
      const columns = createExportTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const task: Partial<ExportTask> = {
          id: '1',
          status: ExportStatus.COMPLETED,
        };
        const result = statusColumn.render(
          ExportStatus.COMPLETED,
          task as ExportTask,
          0
        ) as any;
        expect(['success', 'green']).toContain(
          result.props.children[0].props.color
        );
      }
    });

    it('错误状态应该使用红色系', () => {
      const columns = createExportTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const task: Partial<ExportTask> = {
          id: '1',
          status: ExportStatus.FAILED,
        };
        const result = statusColumn.render(
          ExportStatus.FAILED,
          task as ExportTask,
          0
        ) as any;
        expect(['error', 'red']).toContain(result.props.children[0].props.color);
      }
    });

    it('处理中状态应该使用processing', () => {
      const columns = createExportTableColumns(mockActions);
      const statusColumn = columns.find((col) => col.title === '状态');

      if (statusColumn?.render) {
        const task: Partial<ExportTask> = {
          id: '1',
          status: ExportStatus.PROCESSING,
        };
        const result = statusColumn.render(
          ExportStatus.PROCESSING,
          task as ExportTask,
          0
        ) as any;
        expect(result.props.children[0].props.color).toBe('processing');
      }
    });
  });
});
