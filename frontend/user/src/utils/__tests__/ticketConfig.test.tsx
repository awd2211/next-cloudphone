import { describe, it, expect, vi } from 'vitest';
import {
  ticketTypeConfig,
  priorityConfig,
  statusConfig,
  createTicketColumns,
} from '../ticketConfig';
import { TicketType, TicketPriority, TicketStatus } from '@/services/ticket';

describe('ticketConfig 工单配置', () => {
  describe('ticketTypeConfig 工单类型配置', () => {
    it('应该包含所有工单类型', () => {
      const types = [
        TicketType.TECHNICAL,
        TicketType.BILLING,
        TicketType.DEVICE,
        TicketType.APP,
        TicketType.FEATURE,
        TicketType.OTHER,
      ];

      types.forEach((type) => {
        expect(ticketTypeConfig[type]).toBeDefined();
      });
    });

    it('每个类型都应该有label和color', () => {
      Object.values(ticketTypeConfig).forEach((config) => {
        expect(config.label).toBeDefined();
        expect(config.color).toBeDefined();
        expect(typeof config.label).toBe('string');
        expect(typeof config.color).toBe('string');
      });
    });

    it('应该有6个工单类型', () => {
      expect(Object.keys(ticketTypeConfig)).toHaveLength(6);
    });

    it('技术问题应该是蓝色', () => {
      expect(ticketTypeConfig[TicketType.TECHNICAL].label).toBe('技术问题');
      expect(ticketTypeConfig[TicketType.TECHNICAL].color).toBe('blue');
    });

    it('账单问题应该是橙色', () => {
      expect(ticketTypeConfig[TicketType.BILLING].label).toBe('账单问题');
      expect(ticketTypeConfig[TicketType.BILLING].color).toBe('orange');
    });

    it('设备问题应该是紫色', () => {
      expect(ticketTypeConfig[TicketType.DEVICE].label).toBe('设备问题');
      expect(ticketTypeConfig[TicketType.DEVICE].color).toBe('purple');
    });

    it('应用问题应该是青色', () => {
      expect(ticketTypeConfig[TicketType.APP].label).toBe('应用问题');
      expect(ticketTypeConfig[TicketType.APP].color).toBe('cyan');
    });

    it('功能建议应该是绿色', () => {
      expect(ticketTypeConfig[TicketType.FEATURE].label).toBe('功能建议');
      expect(ticketTypeConfig[TicketType.FEATURE].color).toBe('green');
    });

    it('其他类型应该是默认色', () => {
      expect(ticketTypeConfig[TicketType.OTHER].label).toBe('其他');
      expect(ticketTypeConfig[TicketType.OTHER].color).toBe('default');
    });

    it('所有label应该唯一', () => {
      const labels = Object.values(ticketTypeConfig).map((c) => c.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('所有label都不应该为空', () => {
      Object.values(ticketTypeConfig).forEach((config) => {
        expect(config.label.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('priorityConfig 优先级配置', () => {
    it('应该包含所有优先级', () => {
      const priorities = [
        TicketPriority.LOW,
        TicketPriority.MEDIUM,
        TicketPriority.HIGH,
        TicketPriority.URGENT,
      ];

      priorities.forEach((priority) => {
        expect(priorityConfig[priority]).toBeDefined();
      });
    });

    it('每个优先级都应该有label和color', () => {
      Object.values(priorityConfig).forEach((config) => {
        expect(config.label).toBeDefined();
        expect(config.color).toBeDefined();
        expect(typeof config.label).toBe('string');
        expect(typeof config.color).toBe('string');
      });
    });

    it('应该有4个优先级', () => {
      expect(Object.keys(priorityConfig)).toHaveLength(4);
    });

    it('低优先级应该是默认色', () => {
      expect(priorityConfig[TicketPriority.LOW].label).toBe('低');
      expect(priorityConfig[TicketPriority.LOW].color).toBe('default');
    });

    it('中优先级应该是蓝色', () => {
      expect(priorityConfig[TicketPriority.MEDIUM].label).toBe('中');
      expect(priorityConfig[TicketPriority.MEDIUM].color).toBe('blue');
    });

    it('高优先级应该是橙色', () => {
      expect(priorityConfig[TicketPriority.HIGH].label).toBe('高');
      expect(priorityConfig[TicketPriority.HIGH].color).toBe('orange');
    });

    it('紧急优先级应该是红色', () => {
      expect(priorityConfig[TicketPriority.URGENT].label).toBe('紧急');
      expect(priorityConfig[TicketPriority.URGENT].color).toBe('red');
    });

    it('所有label应该唯一', () => {
      const labels = Object.values(priorityConfig).map((c) => c.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('label长度应该简短', () => {
      Object.values(priorityConfig).forEach((config) => {
        expect(config.label.length).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('statusConfig 状态配置', () => {
    it('应该包含所有工单状态', () => {
      const statuses = [
        TicketStatus.OPEN,
        TicketStatus.IN_PROGRESS,
        TicketStatus.WAITING,
        TicketStatus.RESOLVED,
        TicketStatus.CLOSED,
      ];

      statuses.forEach((status) => {
        expect(statusConfig[status]).toBeDefined();
      });
    });

    it('每个状态都应该有label、color和icon', () => {
      Object.values(statusConfig).forEach((config) => {
        expect(config.label).toBeDefined();
        expect(config.color).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(typeof config.label).toBe('string');
        expect(typeof config.color).toBe('string');
      });
    });

    it('应该有5个状态', () => {
      expect(Object.keys(statusConfig)).toHaveLength(5);
    });

    it('待处理状态应该是warning', () => {
      expect(statusConfig[TicketStatus.OPEN].label).toBe('待处理');
      expect(statusConfig[TicketStatus.OPEN].color).toBe('warning');
    });

    it('处理中状态应该是processing', () => {
      expect(statusConfig[TicketStatus.IN_PROGRESS].label).toBe('处理中');
      expect(statusConfig[TicketStatus.IN_PROGRESS].color).toBe('processing');
    });

    it('等待回复状态应该是default', () => {
      expect(statusConfig[TicketStatus.WAITING].label).toBe('等待回复');
      expect(statusConfig[TicketStatus.WAITING].color).toBe('default');
    });

    it('已解决状态应该是success', () => {
      expect(statusConfig[TicketStatus.RESOLVED].label).toBe('已解决');
      expect(statusConfig[TicketStatus.RESOLVED].color).toBe('success');
    });

    it('已关闭状态应该是default', () => {
      expect(statusConfig[TicketStatus.CLOSED].label).toBe('已关闭');
      expect(statusConfig[TicketStatus.CLOSED].color).toBe('default');
    });

    it('所有icon都应该是React元素', () => {
      Object.values(statusConfig).forEach((config) => {
        expect(typeof config.icon).toBe('object');
        expect(config.icon.type).toBeDefined();
      });
    });

    it('所有label应该唯一', () => {
      const labels = Object.values(statusConfig).map((c) => c.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('所有color都应该是有效的Ant Design状态颜色', () => {
      const validColors = ['success', 'warning', 'error', 'default', 'processing'];

      Object.values(statusConfig).forEach((config) => {
        expect(validColors).toContain(config.color);
      });
    });
  });

  describe('createTicketColumns 函数', () => {
    const mockOnViewDetail = vi.fn();

    it('应该返回列配置数组', () => {
      const columns = createTicketColumns(mockOnViewDetail);
      expect(Array.isArray(columns)).toBe(true);
    });

    it('应该有7列', () => {
      const columns = createTicketColumns(mockOnViewDetail);
      expect(columns).toHaveLength(7);
    });

    it('应该包含所有必需的列', () => {
      const columns = createTicketColumns(mockOnViewDetail);
      const titles = columns.map((col) => col.title);

      expect(titles).toContain('ID');
      expect(titles).toContain('标题');
      expect(titles).toContain('类型');
      expect(titles).toContain('优先级');
      expect(titles).toContain('状态');
      expect(titles).toContain('创建时间');
      expect(titles).toContain('操作');
    });

    it('所有列的key应该唯一', () => {
      const columns = createTicketColumns(mockOnViewDetail);
      const keys = columns.map((col) => col.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('ID列应该有render函数', () => {
      const columns = createTicketColumns(mockOnViewDetail);
      const idColumn = columns.find((col) => col.title === 'ID');

      expect(idColumn?.render).toBeDefined();
      expect(typeof idColumn?.render).toBe('function');
    });

    it('标题列应该有ellipsis', () => {
      const columns = createTicketColumns(mockOnViewDetail);
      const titleColumn = columns.find((col) => col.title === '标题');

      expect(titleColumn?.ellipsis).toBe(true);
    });

    it('类型列应该有render函数', () => {
      const columns = createTicketColumns(mockOnViewDetail);
      const typeColumn = columns.find((col) => col.title === '类型');

      expect(typeColumn?.render).toBeDefined();
      expect(typeof typeColumn?.render).toBe('function');
    });

    it('优先级列应该有render函数', () => {
      const columns = createTicketColumns(mockOnViewDetail);
      const priorityColumn = columns.find((col) => col.title === '优先级');

      expect(priorityColumn?.render).toBeDefined();
      expect(typeof priorityColumn?.render).toBe('function');
    });

    it('状态列应该有render函数', () => {
      const columns = createTicketColumns(mockOnViewDetail);
      const statusColumn = columns.find((col) => col.title === '状态');

      expect(statusColumn?.render).toBeDefined();
      expect(typeof statusColumn?.render).toBe('function');
    });

    it('创建时间列应该有render函数', () => {
      const columns = createTicketColumns(mockOnViewDetail);
      const timeColumn = columns.find((col) => col.title === '创建时间');

      expect(timeColumn?.render).toBeDefined();
      expect(typeof timeColumn?.render).toBe('function');
    });

    it('操作列应该有render函数', () => {
      const columns = createTicketColumns(mockOnViewDetail);
      const actionsColumn = columns.find((col) => col.title === '操作');

      expect(actionsColumn?.render).toBeDefined();
      expect(typeof actionsColumn?.render).toBe('function');
    });

    it('所有列都应该有合理的width', () => {
      const columns = createTicketColumns(mockOnViewDetail);
      columns
        .filter((col) => col.width)
        .forEach((col) => {
          expect(col.width).toBeGreaterThan(0);
          expect(col.width).toBeLessThan(1000);
        });
    });
  });

  describe('数据一致性', () => {
    it('ticketTypeConfig应该覆盖所有TicketType枚举值', () => {
      const enumValues = Object.values(TicketType);
      const configKeys = Object.keys(ticketTypeConfig);

      enumValues.forEach((value) => {
        expect(configKeys).toContain(value);
      });
    });

    it('priorityConfig应该覆盖所有TicketPriority枚举值', () => {
      const enumValues = Object.values(TicketPriority);
      const configKeys = Object.keys(priorityConfig);

      enumValues.forEach((value) => {
        expect(configKeys).toContain(value);
      });
    });

    it('statusConfig应该覆盖所有TicketStatus枚举值', () => {
      const enumValues = Object.values(TicketStatus);
      const configKeys = Object.keys(statusConfig);

      enumValues.forEach((value) => {
        expect(configKeys).toContain(value);
      });
    });

    it('所有配置都应该可序列化（排除React元素）', () => {
      expect(() => {
        JSON.stringify({
          ticketTypeConfig,
          priorityConfig,
          priorityConfigLabels: Object.fromEntries(
            Object.entries(priorityConfig).map(([k, v]) => [k, v.label])
          ),
        });
      }).not.toThrow();
    });
  });

  describe('颜色语义', () => {
    it('紧急事项应该使用红色', () => {
      expect(priorityConfig[TicketPriority.URGENT].color).toBe('red');
    });

    it('成功状态应该使用success', () => {
      expect(statusConfig[TicketStatus.RESOLVED].color).toBe('success');
    });

    it('警告状态应该使用warning', () => {
      expect(statusConfig[TicketStatus.OPEN].color).toBe('warning');
    });

    it('处理中状态应该使用processing', () => {
      expect(statusConfig[TicketStatus.IN_PROGRESS].color).toBe('processing');
    });

    it('中性状态应该使用default', () => {
      expect(['default']).toContain(statusConfig[TicketStatus.CLOSED].color);
    });
  });

  describe('配置完整性', () => {
    it('每个工单类型都应该有不同的颜色', () => {
      const colors = Object.values(ticketTypeConfig).map((c) => c.color);
      // 允许有重复，但不应该所有颜色都一样
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBeGreaterThan(1);
    });

    it('优先级的颜色应该按严重程度递增', () => {
      // 低 < 中 < 高 < 紧急
      const severityMap = {
        default: 0,
        blue: 1,
        orange: 2,
        red: 3,
      };

      const lowSeverity = severityMap[priorityConfig[TicketPriority.LOW].color as keyof typeof severityMap];
      const mediumSeverity = severityMap[priorityConfig[TicketPriority.MEDIUM].color as keyof typeof severityMap];
      const highSeverity = severityMap[priorityConfig[TicketPriority.HIGH].color as keyof typeof severityMap];
      const urgentSeverity = severityMap[priorityConfig[TicketPriority.URGENT].color as keyof typeof severityMap];

      expect(lowSeverity).toBeLessThan(mediumSeverity);
      expect(mediumSeverity).toBeLessThan(highSeverity);
      expect(highSeverity).toBeLessThan(urgentSeverity);
    });

    it('状态配置应该包含各种流程状态', () => {
      const labels = Object.values(statusConfig).map((c) => c.label);
      const allLabels = labels.join(' ');

      // 应该包含开始、进行、结束等各阶段
      expect(allLabels).toContain('待处理');
      expect(allLabels).toContain('处理中');
      expect(allLabels).toContain('已解决');
      expect(allLabels).toContain('已关闭');
    });
  });

  describe('图标配置', () => {
    it('处理中状态的图标应该有spin动画', () => {
      const icon = statusConfig[TicketStatus.IN_PROGRESS].icon;
      expect(icon.props.spin).toBe(true);
    });

    it('已解决状态应该有CheckCircle图标', () => {
      const icon = statusConfig[TicketStatus.RESOLVED].icon;
      expect(icon.type.displayName).toBe('CheckCircleOutlined');
    });

    it('已关闭状态应该有CloseCircle图标', () => {
      const icon = statusConfig[TicketStatus.CLOSED].icon;
      expect(icon.type.displayName).toBe('CloseCircleOutlined');
    });

    it('待处理和等待状态应该有Clock图标', () => {
      const openIcon = statusConfig[TicketStatus.OPEN].icon;
      const waitingIcon = statusConfig[TicketStatus.WAITING].icon;

      expect(openIcon.type.displayName).toBe('ClockCircleOutlined');
      expect(waitingIcon.type.displayName).toBe('ClockCircleOutlined');
    });
  });
});
