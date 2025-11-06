import { describe, it, expect, vi } from 'vitest';
import {
  statusConfig,
  getStatusTag,
  formatSize,
  createSnapshotColumns,
  createSnapshotWarning,
  restoreSnapshotWarning,
  usageGuideItems,
  type Snapshot,
} from '../snapshotConfig';

describe('snapshotConfig 快照配置', () => {
  describe('statusConfig 状态配置', () => {
    it('应该包含所有快照状态', () => {
      const statuses = ['active', 'creating', 'restoring', 'failed'];

      statuses.forEach((status) => {
        expect(statusConfig[status]).toBeDefined();
      });
    });

    it('每个状态都应该有 color 和 text', () => {
      Object.values(statusConfig).forEach((config) => {
        expect(config.color).toBeDefined();
        expect(config.text).toBeDefined();
        expect(typeof config.color).toBe('string');
        expect(typeof config.text).toBe('string');
      });
    });

    it('应该有4个状态配置', () => {
      expect(Object.keys(statusConfig)).toHaveLength(4);
    });

    it('active状态应该是绿色', () => {
      expect(statusConfig.active.color).toBe('green');
      expect(statusConfig.active.text).toBe('可用');
    });

    it('creating状态应该是蓝色', () => {
      expect(statusConfig.creating.color).toBe('blue');
      expect(statusConfig.creating.text).toBe('创建中');
    });

    it('restoring状态应该是橙色', () => {
      expect(statusConfig.restoring.color).toBe('orange');
      expect(statusConfig.restoring.text).toBe('恢复中');
    });

    it('failed状态应该是红色', () => {
      expect(statusConfig.failed.color).toBe('red');
      expect(statusConfig.failed.text).toBe('失败');
    });

    it('所有text应该唯一', () => {
      const texts = Object.values(statusConfig).map((c) => c.text);
      const uniqueTexts = new Set(texts);
      expect(uniqueTexts.size).toBe(texts.length);
    });
  });

  describe('getStatusTag 函数', () => {
    it('已知状态应该返回Tag组件', () => {
      const tag = getStatusTag('active');
      expect(tag).toBeDefined();
      expect(tag.type).toBeDefined();
    });

    it('未知状态应该返回默认Tag', () => {
      const tag = getStatusTag('unknown');
      expect(tag).toBeDefined();
      expect(tag.props.color).toBe('default');
      expect(tag.props.children).toBe('unknown');
    });

    it('不同状态应该返回不同颜色的Tag', () => {
      const activeTag = getStatusTag('active');
      const failedTag = getStatusTag('failed');

      expect(activeTag.props.color).toBe('green');
      expect(failedTag.props.color).toBe('red');
    });

    it('应该显示正确的状态文本', () => {
      const tag = getStatusTag('creating');
      expect(tag.props.children).toBe('创建中');
    });
  });

  describe('formatSize 函数', () => {
    it('0字节应该显示为 "0 B"', () => {
      expect(formatSize(0)).toBe('0 B');
    });

    it('小于1KB的大小应该显示为字节', () => {
      expect(formatSize(500)).toBe('500 B');
    });

    it('应该正确转换KB', () => {
      expect(formatSize(1024)).toBe('1 KB');
      expect(formatSize(2048)).toBe('2 KB');
    });

    it('应该正确转换MB', () => {
      expect(formatSize(1024 * 1024)).toBe('1 MB');
      expect(formatSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });

    it('应该正确转换GB', () => {
      expect(formatSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatSize(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
    });

    it('应该保留两位小数', () => {
      const result = formatSize(1536); // 1.5 KB
      expect(result).toBe('1.5 KB');
    });

    it('应该处理大数值', () => {
      const result = formatSize(10 * 1024 * 1024 * 1024); // 10 GB
      expect(result).toBe('10 GB');
    });

    it('应该四舍五入', () => {
      const result = formatSize(1536.7); // ~1.5 KB
      expect(result).toMatch(/1\.5\d* KB/);
    });
  });

  describe('createSnapshotColumns 函数', () => {
    const mockOnRestore = vi.fn();
    const mockOnDelete = vi.fn();

    it('应该返回列配置数组', () => {
      const columns = createSnapshotColumns(mockOnRestore, mockOnDelete);
      expect(Array.isArray(columns)).toBe(true);
    });

    it('应该有6列', () => {
      const columns = createSnapshotColumns(mockOnRestore, mockOnDelete);
      expect(columns).toHaveLength(6);
    });

    it('应该包含所有必需的列', () => {
      const columns = createSnapshotColumns(mockOnRestore, mockOnDelete);
      const titles = columns.map((col) => col.title);

      expect(titles).toContain('快照名称');
      expect(titles).toContain('描述');
      expect(titles).toContain('大小');
      expect(titles).toContain('状态');
      expect(titles).toContain('创建时间');
      expect(titles).toContain('操作');
    });

    it('大小列应该有render函数', () => {
      const columns = createSnapshotColumns(mockOnRestore, mockOnDelete);
      const sizeColumn = columns.find((col) => col.title === '大小');

      expect(sizeColumn?.render).toBeDefined();
      expect(typeof sizeColumn?.render).toBe('function');
    });

    it('状态列应该有render函数', () => {
      const columns = createSnapshotColumns(mockOnRestore, mockOnDelete);
      const statusColumn = columns.find((col) => col.title === '状态');

      expect(statusColumn?.render).toBeDefined();
      expect(typeof statusColumn?.render).toBe('function');
    });

    it('创建时间列应该有render函数', () => {
      const columns = createSnapshotColumns(mockOnRestore, mockOnDelete);
      const timeColumn = columns.find((col) => col.title === '创建时间');

      expect(timeColumn?.render).toBeDefined();
      expect(typeof timeColumn?.render).toBe('function');
    });

    it('操作列应该有render函数', () => {
      const columns = createSnapshotColumns(mockOnRestore, mockOnDelete);
      const actionsColumn = columns.find((col) => col.title === '操作');

      expect(actionsColumn?.render).toBeDefined();
      expect(typeof actionsColumn?.render).toBe('function');
    });

    it('操作列应该固定在右侧', () => {
      const columns = createSnapshotColumns(mockOnRestore, mockOnDelete);
      const actionsColumn = columns.find((col) => col.title === '操作');

      expect(actionsColumn?.fixed).toBe('right');
    });

    it('所有列的key应该唯一', () => {
      const columns = createSnapshotColumns(mockOnRestore, mockOnDelete);
      const keys = columns.map((col) => col.key);
      const uniqueKeys = new Set(keys);

      expect(uniqueKeys.size).toBe(keys.length);
    });
  });

  describe('createSnapshotWarning 警告配置', () => {
    it('应该有message和description', () => {
      expect(createSnapshotWarning.message).toBeDefined();
      expect(createSnapshotWarning.description).toBeDefined();
    });

    it('类型应该是warning', () => {
      expect(createSnapshotWarning.type).toBe('warning');
    });

    it('message应该是"注意"', () => {
      expect(createSnapshotWarning.message).toBe('注意');
    });

    it('description应该包含关键信息', () => {
      expect(createSnapshotWarning.description).toContain('暂停设备');
      expect(createSnapshotWarning.description).toContain('自动恢复');
    });
  });

  describe('restoreSnapshotWarning 警告配置', () => {
    it('应该有message和description', () => {
      expect(restoreSnapshotWarning.message).toBeDefined();
      expect(restoreSnapshotWarning.description).toBeDefined();
    });

    it('类型应该是error', () => {
      expect(restoreSnapshotWarning.type).toBe('error');
    });

    it('message应该是"警告"', () => {
      expect(restoreSnapshotWarning.message).toBe('警告');
    });

    it('description应该是React元素', () => {
      expect(typeof restoreSnapshotWarning.description).toBe('object');
    });

    it('应该比创建警告更严重', () => {
      expect(restoreSnapshotWarning.type).toBe('error');
      expect(createSnapshotWarning.type).toBe('warning');
    });
  });

  describe('usageGuideItems 使用说明', () => {
    it('应该是数组', () => {
      expect(Array.isArray(usageGuideItems)).toBe(true);
    });

    it('应该有5条说明', () => {
      expect(usageGuideItems).toHaveLength(5);
    });

    it('每条说明都应该是字符串', () => {
      usageGuideItems.forEach((item) => {
        expect(typeof item).toBe('string');
        expect(item.length).toBeGreaterThan(0);
      });
    });

    it('应该包含关键操作说明', () => {
      const allText = usageGuideItems.join(' ');
      expect(allText).toContain('快照');
      expect(allText).toContain('创建');
      expect(allText).toContain('恢复');
    });

    it('应该提醒用户注意事项', () => {
      const allText = usageGuideItems.join(' ');
      expect(allText).toContain('覆盖');
      expect(allText).toContain('谨慎');
    });

    it('应该提供最佳实践建议', () => {
      const allText = usageGuideItems.join(' ');
      expect(allText).toContain('建议');
    });

    it('所有说明都不应该为空', () => {
      usageGuideItems.forEach((item) => {
        expect(item.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('数据一致性', () => {
    it('状态配置的color应该与getStatusTag返回的color一致', () => {
      Object.keys(statusConfig).forEach((status) => {
        const tag = getStatusTag(status);
        expect(tag.props.color).toBe(statusConfig[status].color);
      });
    });

    it('所有配置都应该可序列化（排除React元素）', () => {
      expect(() => {
        JSON.stringify({
          statusConfig,
          createSnapshotWarning: {
            message: createSnapshotWarning.message,
            type: createSnapshotWarning.type,
          },
          usageGuideItems,
        });
      }).not.toThrow();
    });
  });

  describe('颜色语义', () => {
    it('成功状态应该使用绿色', () => {
      expect(statusConfig.active.color).toBe('green');
    });

    it('进行中状态应该使用蓝色', () => {
      expect(statusConfig.creating.color).toBe('blue');
    });

    it('失败状态应该使用红色', () => {
      expect(statusConfig.failed.color).toBe('red');
    });

    it('警告状态应该使用橙色', () => {
      expect(statusConfig.restoring.color).toBe('orange');
    });
  });
});
