import { describe, it, expect, vi } from 'vitest';
import {
  androidVersionOptions,
  cpuCoresOptions,
  memoryConfig,
  diskConfig,
  resolutionOptions,
  dpiOptions,
  statsCardConfig,
  usageTipConfig,
  createTipConfig,
  formatMemoryMB,
  formatConfig,
  calculateStats,
  formatDate,
  formatDateTime,
  generateDeviceName,
  generateDefaultPrefix,
  createTemplateColumns,
  batchCreateConfig,
  mockTemplates,
  type DeviceTemplate,
} from '../templateConfig';

describe('templateConfig 设备模板配置', () => {
  describe('androidVersionOptions Android版本选项', () => {
    it('应该是数组', () => {
      expect(Array.isArray(androidVersionOptions)).toBe(true);
    });

    it('应该有5个Android版本', () => {
      expect(androidVersionOptions).toHaveLength(5);
    });

    it('每个选项都应该有label和value', () => {
      androidVersionOptions.forEach((option) => {
        expect(option.label).toBeDefined();
        expect(option.value).toBeDefined();
      });
    });

    it('版本号应该是字符串', () => {
      androidVersionOptions.forEach((option) => {
        expect(typeof option.value).toBe('string');
      });
    });

    it('label应该包含"Android"', () => {
      androidVersionOptions.forEach((option) => {
        expect(option.label).toContain('Android');
      });
    });

    it('版本应该是升序排列', () => {
      const versions = androidVersionOptions.map((opt) => parseFloat(opt.value));
      for (let i = 1; i < versions.length; i++) {
        expect(versions[i]).toBeGreaterThan(versions[i - 1]);
      }
    });
  });

  describe('cpuCoresOptions CPU核心选项', () => {
    it('应该是数组', () => {
      expect(Array.isArray(cpuCoresOptions)).toBe(true);
    });

    it('应该有6个选项', () => {
      expect(cpuCoresOptions).toHaveLength(6);
    });

    it('每个选项都应该有label和value', () => {
      cpuCoresOptions.forEach((option) => {
        expect(option.label).toBeDefined();
        expect(option.value).toBeDefined();
      });
    });

    it('value应该是数字', () => {
      cpuCoresOptions.forEach((option) => {
        expect(typeof option.value).toBe('number');
      });
    });

    it('label应该包含"核"', () => {
      cpuCoresOptions.forEach((option) => {
        expect(option.label).toContain('核');
      });
    });

    it('核心数应该是升序排列', () => {
      const cores = cpuCoresOptions.map((opt) => opt.value);
      for (let i = 1; i < cores.length; i++) {
        expect(cores[i]).toBeGreaterThan(cores[i - 1]);
      }
    });
  });

  describe('memoryConfig 内存配置', () => {
    it('应该有min、max和step', () => {
      expect(memoryConfig.min).toBeDefined();
      expect(memoryConfig.max).toBeDefined();
      expect(memoryConfig.step).toBeDefined();
    });

    it('min应该小于max', () => {
      expect(memoryConfig.min).toBeLessThan(memoryConfig.max);
    });

    it('step应该是1024', () => {
      expect(memoryConfig.step).toBe(1024);
    });

    it('min应该是1024 (1GB)', () => {
      expect(memoryConfig.min).toBe(1024);
    });

    it('max应该是16384 (16GB)', () => {
      expect(memoryConfig.max).toBe(16384);
    });
  });

  describe('diskConfig 存储配置', () => {
    it('应该有min、max和step', () => {
      expect(diskConfig.min).toBeDefined();
      expect(diskConfig.max).toBeDefined();
      expect(diskConfig.step).toBeDefined();
    });

    it('min应该小于max', () => {
      expect(diskConfig.min).toBeLessThan(diskConfig.max);
    });

    it('step应该是8', () => {
      expect(diskConfig.step).toBe(8);
    });

    it('min应该是8GB', () => {
      expect(diskConfig.min).toBe(8);
    });

    it('max应该是128GB', () => {
      expect(diskConfig.max).toBe(128);
    });
  });

  describe('resolutionOptions 分辨率选项', () => {
    it('应该是数组', () => {
      expect(Array.isArray(resolutionOptions)).toBe(true);
    });

    it('应该有5个分辨率', () => {
      expect(resolutionOptions).toHaveLength(5);
    });

    it('每个选项都应该有label和value', () => {
      resolutionOptions.forEach((option) => {
        expect(option.label).toBeDefined();
        expect(option.value).toBeDefined();
      });
    });

    it('value应该是"宽x高"格式', () => {
      resolutionOptions.forEach((option) => {
        expect(option.value).toMatch(/^\d+x\d+$/);
      });
    });

    it('label应该包含分辨率类型', () => {
      const allLabels = resolutionOptions.map((opt) => opt.label).join(' ');
      expect(allLabels).toContain('HD');
      expect(allLabels).toContain('FHD');
      expect(allLabels).toContain('2K');
    });
  });

  describe('dpiOptions DPI选项', () => {
    it('应该是数组', () => {
      expect(Array.isArray(dpiOptions)).toBe(true);
    });

    it('应该有4个DPI选项', () => {
      expect(dpiOptions).toHaveLength(4);
    });

    it('每个选项都应该有label和value', () => {
      dpiOptions.forEach((option) => {
        expect(option.label).toBeDefined();
        expect(option.value).toBeDefined();
      });
    });

    it('value应该是数字', () => {
      dpiOptions.forEach((option) => {
        expect(typeof option.value).toBe('number');
      });
    });

    it('DPI应该是升序排列', () => {
      const dpis = dpiOptions.map((opt) => opt.value);
      for (let i = 1; i < dpis.length; i++) {
        expect(dpis[i]).toBeGreaterThan(dpis[i - 1]);
      }
    });
  });

  describe('statsCardConfig 统计卡片配置', () => {
    it('应该是数组', () => {
      expect(Array.isArray(statsCardConfig)).toBe(true);
    });

    it('应该有4个统计卡片', () => {
      expect(statsCardConfig).toHaveLength(4);
    });

    it('每个卡片都应该有key、title、icon和color', () => {
      statsCardConfig.forEach((card) => {
        expect(card.key).toBeDefined();
        expect(card.title).toBeDefined();
        expect(card.icon).toBeDefined();
        expect(card.color).toBeDefined();
      });
    });

    it('所有key应该唯一', () => {
      const keys = statsCardConfig.map((card) => card.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('color应该是有效的十六进制颜色', () => {
      statsCardConfig.forEach((card) => {
        expect(card.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('应该包含全部模板统计', () => {
      const hasTotal = statsCardConfig.some((card) => card.key === 'total');
      expect(hasTotal).toBe(true);
    });
  });

  describe('usageTipConfig 使用提示配置', () => {
    it('应该有message和description', () => {
      expect(usageTipConfig.message).toBeDefined();
      expect(usageTipConfig.description).toBeDefined();
    });

    it('type应该是info', () => {
      expect(usageTipConfig.type).toBe('info');
    });

    it('message应该是"使用提示"', () => {
      expect(usageTipConfig.message).toBe('使用提示');
    });

    it('description应该包含关键信息', () => {
      expect(usageTipConfig.description).toContain('系统模板');
      expect(usageTipConfig.description).toContain('自定义模板');
    });
  });

  describe('createTipConfig 创建提示配置', () => {
    it('应该有message和description', () => {
      expect(createTipConfig.message).toBeDefined();
      expect(createTipConfig.description).toBeDefined();
    });

    it('type应该是warning', () => {
      expect(createTipConfig.type).toBe('warning');
    });

    it('message应该是"创建提示"', () => {
      expect(createTipConfig.message).toBe('创建提示');
    });

    it('description应该包含批量创建提示', () => {
      expect(createTipConfig.description).toContain('批量创建');
      expect(createTipConfig.description).toContain('我的设备');
    });
  });

  describe('formatMemoryMB 函数', () => {
    it('应该同时显示MB和GB', () => {
      const result = formatMemoryMB(4096);
      expect(result).toContain('MB');
      expect(result).toContain('GB');
    });

    it('1024MB应该是1.0GB', () => {
      const result = formatMemoryMB(1024);
      expect(result).toBe('1024MB (1.0GB)');
    });

    it('2048MB应该是2.0GB', () => {
      const result = formatMemoryMB(2048);
      expect(result).toBe('2048MB (2.0GB)');
    });

    it('4096MB应该是4.0GB', () => {
      const result = formatMemoryMB(4096);
      expect(result).toBe('4096MB (4.0GB)');
    });

    it('应该保留一位小数', () => {
      const result = formatMemoryMB(1536); // 1.5GB
      expect(result).toBe('1536MB (1.5GB)');
    });
  });

  describe('formatConfig 函数', () => {
    const mockTemplate: DeviceTemplate = {
      id: '1',
      name: 'Test',
      androidVersion: '11.0',
      cpuCores: 4,
      memoryMB: 8192,
      diskGB: 64,
      resolution: '1080x1920',
      dpi: 480,
      isSystem: true,
      isFavorite: false,
      usageCount: 0,
      createdAt: '2024-01-01',
    };

    it('应该返回配置简要信息', () => {
      const result = formatConfig(mockTemplate);
      expect(result).toContain('4核CPU');
      expect(result).toContain('8192MB内存');
      expect(result).toContain('64GB存储');
    });

    it('应该包含所有关键信息', () => {
      const result = formatConfig(mockTemplate);
      expect(result).toContain('核CPU');
      expect(result).toContain('MB内存');
      expect(result).toContain('GB存储');
    });

    it('应该使用斜杠分隔', () => {
      const result = formatConfig(mockTemplate);
      expect(result.match(/\//g)?.length).toBe(2);
    });
  });

  describe('calculateStats 函数', () => {
    it('应该正确计算总数', () => {
      const stats = calculateStats(mockTemplates);
      expect(stats.total).toBe(5);
    });

    it('应该正确计算系统模板数量', () => {
      const stats = calculateStats(mockTemplates);
      expect(stats.system).toBe(3);
    });

    it('应该正确计算自定义模板数量', () => {
      const stats = calculateStats(mockTemplates);
      expect(stats.custom).toBe(2);
    });

    it('应该正确计算收藏数量', () => {
      const stats = calculateStats(mockTemplates);
      expect(stats.favorite).toBe(2);
    });

    it('空数组应该返回全0', () => {
      const stats = calculateStats([]);
      expect(stats.total).toBe(0);
      expect(stats.system).toBe(0);
      expect(stats.custom).toBe(0);
      expect(stats.favorite).toBe(0);
    });

    it('system + custom应该等于total', () => {
      const stats = calculateStats(mockTemplates);
      expect(stats.system + stats.custom).toBe(stats.total);
    });
  });

  describe('formatDate 函数', () => {
    it('应该格式化为YYYY-MM-DD', () => {
      const result = formatDate('2024-01-15T10:30:00');
      expect(result).toBe('2024-01-15');
    });

    it('不同日期应该有不同结果', () => {
      const result1 = formatDate('2024-01-01');
      const result2 = formatDate('2024-12-31');
      expect(result1).not.toBe(result2);
    });
  });

  describe('formatDateTime 函数', () => {
    it('应该格式化为YYYY-MM-DD HH:mm:ss', () => {
      const result = formatDateTime('2024-01-15T10:30:45');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('应该包含日期和时间', () => {
      const result = formatDateTime('2024-01-15T10:30:45');
      expect(result).toContain('2024-01-15');
      expect(result).toContain(':');
    });
  });

  describe('generateDeviceName 函数', () => {
    it('应该生成带前缀的名称', () => {
      const result = generateDeviceName('Test', 1);
      expect(result).toBe('Test-001');
    });

    it('应该补齐为3位数', () => {
      expect(generateDeviceName('Device', 1)).toBe('Device-001');
      expect(generateDeviceName('Device', 10)).toBe('Device-010');
      expect(generateDeviceName('Device', 100)).toBe('Device-100');
    });

    it('不同索引应该生成不同名称', () => {
      const name1 = generateDeviceName('Test', 1);
      const name2 = generateDeviceName('Test', 2);
      expect(name1).not.toBe(name2);
    });
  });

  describe('generateDefaultPrefix 函数', () => {
    it('应该返回字符串', () => {
      const result = generateDefaultPrefix();
      expect(typeof result).toBe('string');
    });

    it('应该包含"Device-"', () => {
      const result = generateDefaultPrefix();
      expect(result).toContain('Device-');
    });

    it('应该包含日期', () => {
      const result = generateDefaultPrefix();
      expect(result).toMatch(/Device-\d{8}/);
    });
  });

  describe('createTemplateColumns 函数', () => {
    const mockHandlers = {
      onViewDetail: vi.fn(),
      onToggleFavorite: vi.fn(),
      onUseTemplate: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };

    it('应该返回列配置数组', () => {
      const columns = createTemplateColumns(mockHandlers);
      expect(Array.isArray(columns)).toBe(true);
    });

    it('应该有7列', () => {
      const columns = createTemplateColumns(mockHandlers);
      expect(columns).toHaveLength(7);
    });

    it('应该包含所有必需的列', () => {
      const columns = createTemplateColumns(mockHandlers);
      const titles = columns.map((col) => col.title);

      expect(titles).toContain('模板名称');
      expect(titles).toContain('描述');
      expect(titles).toContain('Android版本');
      expect(titles).toContain('配置');
      expect(titles).toContain('使用次数');
      expect(titles).toContain('创建时间');
      expect(titles).toContain('操作');
    });

    it('所有列的key应该唯一', () => {
      const columns = createTemplateColumns(mockHandlers);
      const keys = columns.map((col) => col.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('使用次数列应该有sorter', () => {
      const columns = createTemplateColumns(mockHandlers);
      const usageColumn = columns.find((col) => col.title === '使用次数');
      expect(usageColumn?.sorter).toBeDefined();
    });

    it('操作列应该固定在右侧', () => {
      const columns = createTemplateColumns(mockHandlers);
      const actionsColumn = columns.find((col) => col.title === '操作');
      expect(actionsColumn?.fixed).toBe('right');
    });

    it('所有带render的列都应该有render函数', () => {
      const columns = createTemplateColumns(mockHandlers);
      columns
        .filter((col) => col.render)
        .forEach((col) => {
          expect(typeof col.render).toBe('function');
        });
    });
  });

  describe('batchCreateConfig 批量创建配置', () => {
    it('应该有min、max和defaultCount', () => {
      expect(batchCreateConfig.min).toBeDefined();
      expect(batchCreateConfig.max).toBeDefined();
      expect(batchCreateConfig.defaultCount).toBeDefined();
    });

    it('min应该是1', () => {
      expect(batchCreateConfig.min).toBe(1);
    });

    it('max应该是100', () => {
      expect(batchCreateConfig.max).toBe(100);
    });

    it('defaultCount应该是1', () => {
      expect(batchCreateConfig.defaultCount).toBe(1);
    });

    it('min应该小于等于defaultCount', () => {
      expect(batchCreateConfig.min).toBeLessThanOrEqual(
        batchCreateConfig.defaultCount
      );
    });

    it('defaultCount应该小于等于max', () => {
      expect(batchCreateConfig.defaultCount).toBeLessThanOrEqual(
        batchCreateConfig.max
      );
    });
  });

  describe('mockTemplates 模拟数据', () => {
    it('应该是数组', () => {
      expect(Array.isArray(mockTemplates)).toBe(true);
    });

    it('应该有5个模板', () => {
      expect(mockTemplates).toHaveLength(5);
    });

    it('每个模板都应该有完整字段', () => {
      mockTemplates.forEach((template) => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.androidVersion).toBeDefined();
        expect(template.cpuCores).toBeDefined();
        expect(template.memoryMB).toBeDefined();
        expect(template.diskGB).toBeDefined();
        expect(template.resolution).toBeDefined();
        expect(template.dpi).toBeDefined();
        expect(typeof template.isSystem).toBe('boolean');
        expect(typeof template.isFavorite).toBe('boolean');
        expect(typeof template.usageCount).toBe('number');
        expect(template.createdAt).toBeDefined();
      });
    });

    it('应该包含系统模板和自定义模板', () => {
      const hasSystem = mockTemplates.some((t) => t.isSystem);
      const hasCustom = mockTemplates.some((t) => !t.isSystem);
      expect(hasSystem).toBe(true);
      expect(hasCustom).toBe(true);
    });

    it('所有id应该唯一', () => {
      const ids = mockTemplates.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('数据一致性', () => {
    it('配置选项应该可序列化', () => {
      expect(() => {
        JSON.stringify({
          androidVersionOptions,
          cpuCoresOptions,
          memoryConfig,
          diskConfig,
          resolutionOptions,
          dpiOptions,
          batchCreateConfig,
        });
      }).not.toThrow();
    });

    it('内存配置范围应该合理', () => {
      expect(memoryConfig.min).toBeGreaterThanOrEqual(1024);
      expect(memoryConfig.max).toBeLessThanOrEqual(32768);
    });

    it('存储配置范围应该合理', () => {
      expect(diskConfig.min).toBeGreaterThanOrEqual(8);
      expect(diskConfig.max).toBeLessThanOrEqual(512);
    });
  });
});
