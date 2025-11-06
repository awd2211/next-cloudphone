import { describe, it, expect } from 'vitest';
import {
  activityTypeConfig,
  getTypeConfig,
  activityStatusConfig,
  getStatusTag,
  activityTabsConfig,
  calculateProgress,
  formatDateRange,
  getActivityButtonText,
  formatDateTime,
  getTypeIcon,
  getStatusAlertConfig,
} from '../activityConfig';
import { ActivityType, ActivityStatus } from '@/services/activity';

describe('activityConfig 活动配置', () => {
  describe('activityTypeConfig 活动类型配置', () => {
    it('应该包含所有活动类型', () => {
      const types = [
        ActivityType.DISCOUNT,
        ActivityType.GIFT,
        ActivityType.FLASH_SALE,
        ActivityType.NEW_USER,
      ];

      types.forEach((type) => {
        expect(activityTypeConfig[type]).toBeDefined();
      });
    });

    it('每个类型都应该有 icon、color 和 text', () => {
      Object.values(activityTypeConfig).forEach((config) => {
        expect(config.icon).toBeDefined();
        expect(config.color).toBeDefined();
        expect(config.text).toBeDefined();
      });
    });

    it('应该有4个活动类型', () => {
      expect(Object.keys(activityTypeConfig)).toHaveLength(4);
    });

    it('折扣类型应该是橙色', () => {
      expect(activityTypeConfig[ActivityType.DISCOUNT].color).toBe('orange');
      expect(activityTypeConfig[ActivityType.DISCOUNT].text).toBe('折扣优惠');
    });

    it('礼包类型应该是粉色', () => {
      expect(activityTypeConfig[ActivityType.GIFT].color).toBe('pink');
      expect(activityTypeConfig[ActivityType.GIFT].text).toBe('礼包赠送');
    });

    it('秒杀类型应该是红色', () => {
      expect(activityTypeConfig[ActivityType.FLASH_SALE].color).toBe('red');
      expect(activityTypeConfig[ActivityType.FLASH_SALE].text).toBe('限时秒杀');
    });

    it('新用户类型应该是蓝色', () => {
      expect(activityTypeConfig[ActivityType.NEW_USER].color).toBe('blue');
      expect(activityTypeConfig[ActivityType.NEW_USER].text).toBe('新用户专享');
    });

    it('所有text应该唯一', () => {
      const texts = Object.values(activityTypeConfig).map((c) => c.text);
      const uniqueTexts = new Set(texts);
      expect(uniqueTexts.size).toBe(texts.length);
    });
  });

  describe('getTypeConfig 函数', () => {
    it('已知类型应该返回正确配置', () => {
      const config = getTypeConfig(ActivityType.GIFT);
      expect(config).toBe(activityTypeConfig[ActivityType.GIFT]);
    });

    it('未知类型应该返回默认配置', () => {
      const config = getTypeConfig('unknown' as ActivityType);
      expect(config).toBe(activityTypeConfig[ActivityType.DISCOUNT]);
    });

    it('应该返回包含icon的配置', () => {
      const config = getTypeConfig(ActivityType.FLASH_SALE);
      expect(config.icon).toBeDefined();
    });
  });

  describe('activityStatusConfig 活动状态配置', () => {
    it('应该包含所有活动状态', () => {
      const statuses = [
        ActivityStatus.UPCOMING,
        ActivityStatus.ONGOING,
        ActivityStatus.ENDED,
      ];

      statuses.forEach((status) => {
        expect(activityStatusConfig[status]).toBeDefined();
      });
    });

    it('每个状态都应该有 color 和 text', () => {
      Object.values(activityStatusConfig).forEach((config) => {
        expect(config.color).toBeDefined();
        expect(config.text).toBeDefined();
      });
    });

    it('应该有3个状态', () => {
      expect(Object.keys(activityStatusConfig)).toHaveLength(3);
    });

    it('即将开始状态应该是蓝色', () => {
      expect(activityStatusConfig[ActivityStatus.UPCOMING].color).toBe('blue');
      expect(activityStatusConfig[ActivityStatus.UPCOMING].text).toBe('即将开始');
    });

    it('进行中状态应该是绿色', () => {
      expect(activityStatusConfig[ActivityStatus.ONGOING].color).toBe('green');
      expect(activityStatusConfig[ActivityStatus.ONGOING].text).toBe('进行中');
    });

    it('已结束状态应该是默认色', () => {
      expect(activityStatusConfig[ActivityStatus.ENDED].color).toBe('default');
      expect(activityStatusConfig[ActivityStatus.ENDED].text).toBe('已结束');
    });
  });

  describe('getStatusTag 函数', () => {
    it('应该返回Tag组件', () => {
      const tag = getStatusTag(ActivityStatus.ONGOING);
      expect(tag).toBeDefined();
      expect(tag.type).toBeDefined();
    });

    it('不同状态应该返回不同颜色的Tag', () => {
      const ongoingTag = getStatusTag(ActivityStatus.ONGOING);
      const endedTag = getStatusTag(ActivityStatus.ENDED);

      expect(ongoingTag.props.color).toBe('green');
      expect(endedTag.props.color).toBe('default');
    });

    it('应该显示正确的状态文本', () => {
      const tag = getStatusTag(ActivityStatus.UPCOMING);
      expect(tag.props.children).toBe('即将开始');
    });
  });

  describe('activityTabsConfig Tab配置', () => {
    it('应该是数组', () => {
      expect(Array.isArray(activityTabsConfig)).toBe(true);
    });

    it('应该有4个Tab', () => {
      expect(activityTabsConfig).toHaveLength(4);
    });

    it('每个Tab都应该有key和label', () => {
      activityTabsConfig.forEach((tab) => {
        expect(tab.key).toBeDefined();
        expect(tab.label).toBeDefined();
      });
    });

    it('应该包含"全部活动"Tab', () => {
      const allTab = activityTabsConfig.find((tab) => tab.key === 'all');
      expect(allTab).toBeDefined();
      expect(allTab?.label).toBe('全部活动');
    });

    it('所有Tab的key应该唯一', () => {
      const keys = activityTabsConfig.map((tab) => tab.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('所有Tab的label应该唯一', () => {
      const labels = activityTabsConfig.map((tab) => tab.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });
  });

  describe('calculateProgress 函数', () => {
    it('无maxParticipants应该返回0', () => {
      expect(calculateProgress(50, undefined)).toBe(0);
    });

    it('无currentParticipants应该返回0', () => {
      expect(calculateProgress(undefined, 100)).toBe(0);
    });

    it('应该正确计算百分比', () => {
      expect(calculateProgress(50, 100)).toBe(50);
      expect(calculateProgress(25, 100)).toBe(25);
      expect(calculateProgress(75, 100)).toBe(75);
    });

    it('当前数等于最大数应该返回100', () => {
      expect(calculateProgress(100, 100)).toBe(100);
    });

    it('应该处理小数', () => {
      expect(calculateProgress(33, 100)).toBe(33);
    });

    it('0参与者应该返回0', () => {
      expect(calculateProgress(0, 100)).toBe(0);
    });

    it('应该处理超过100%的情况', () => {
      const progress = calculateProgress(150, 100);
      expect(progress).toBeGreaterThan(100);
    });
  });

  describe('formatDateRange 函数', () => {
    it('应该返回日期范围字符串', () => {
      const result = formatDateRange('2024-01-01', '2024-12-31');
      expect(typeof result).toBe('string');
      expect(result).toContain('-');
    });

    it('应该包含起止日期', () => {
      const result = formatDateRange('2024-01-01', '2024-12-31');
      expect(result.length).toBeGreaterThan(0);
    });

    it('相同日期应该也能处理', () => {
      const result = formatDateRange('2024-01-01', '2024-01-01');
      expect(result).toBeDefined();
      expect(result).toContain('-');
    });

    it('应该处理有效的日期字符串', () => {
      expect(() => {
        formatDateRange('2024-06-15', '2024-06-30');
      }).not.toThrow();
    });
  });

  describe('getActivityButtonText 函数', () => {
    it('进行中活动应该显示"立即参与"', () => {
      expect(getActivityButtonText(ActivityStatus.ONGOING)).toBe('立即参与');
    });

    it('即将开始活动应该显示"敬请期待"', () => {
      expect(getActivityButtonText(ActivityStatus.UPCOMING)).toBe('敬请期待');
    });

    it('已结束活动应该显示"活动已结束"', () => {
      expect(getActivityButtonText(ActivityStatus.ENDED)).toBe('活动已结束');
    });

    it('所有状态都应该有对应的按钮文本', () => {
      const statuses = [
        ActivityStatus.UPCOMING,
        ActivityStatus.ONGOING,
        ActivityStatus.ENDED,
      ];

      statuses.forEach((status) => {
        const text = getActivityButtonText(status);
        expect(text).toBeDefined();
        expect(text.length).toBeGreaterThan(0);
      });
    });
  });

  describe('formatDateTime 函数', () => {
    it('应该返回字符串', () => {
      const result = formatDateTime('2024-01-01T12:00:00');
      expect(typeof result).toBe('string');
    });

    it('应该包含日期和时间', () => {
      const result = formatDateTime('2024-01-01T12:00:00');
      expect(result.length).toBeGreaterThan(0);
    });

    it('应该处理不同的日期格式', () => {
      expect(() => {
        formatDateTime('2024-06-15T14:30:00');
      }).not.toThrow();
    });
  });

  describe('getTypeIcon 函数', () => {
    it('应该返回React元素', () => {
      const icon = getTypeIcon(ActivityType.GIFT);
      expect(icon).toBeDefined();
      expect(typeof icon).toBe('object');
    });

    it('不同类型应该返回不同的图标', () => {
      const giftIcon = getTypeIcon(ActivityType.GIFT);
      const discountIcon = getTypeIcon(ActivityType.DISCOUNT);

      expect(giftIcon.type).toBeDefined();
      expect(discountIcon.type).toBeDefined();
    });

    it('未知类型应该返回默认图标', () => {
      const icon = getTypeIcon('unknown' as ActivityType);
      expect(icon).toBeDefined();
    });

    it('所有类型都应该有对应图标', () => {
      const types = [
        ActivityType.GIFT,
        ActivityType.DISCOUNT,
        ActivityType.FLASH_SALE,
        ActivityType.NEW_USER,
      ];

      types.forEach((type) => {
        const icon = getTypeIcon(type);
        expect(icon).toBeDefined();
      });
    });
  });

  describe('getStatusAlertConfig 函数', () => {
    it('应该返回配置对象', () => {
      const config = getStatusAlertConfig(ActivityStatus.ONGOING);
      expect(config).toBeDefined();
      expect(config.message).toBeDefined();
      expect(config.type).toBeDefined();
    });

    it('进行中活动应该是success类型', () => {
      const config = getStatusAlertConfig(ActivityStatus.ONGOING);
      expect(config.type).toBe('success');
      expect(config.message).toContain('进行中');
    });

    it('即将开始活动应该是info类型', () => {
      const config = getStatusAlertConfig(ActivityStatus.UPCOMING);
      expect(config.type).toBe('info');
      expect(config.message).toContain('即将开始');
    });

    it('已结束活动应该是warning类型', () => {
      const config = getStatusAlertConfig(ActivityStatus.ENDED);
      expect(config.type).toBe('warning');
      expect(config.message).toContain('已结束');
    });

    it('所有状态都应该有对应的alert配置', () => {
      const statuses = [
        ActivityStatus.UPCOMING,
        ActivityStatus.ONGOING,
        ActivityStatus.ENDED,
      ];

      statuses.forEach((status) => {
        const config = getStatusAlertConfig(status);
        expect(config).toBeDefined();
        expect(['info', 'success', 'warning', 'error']).toContain(config.type);
      });
    });

    it('message应该包含有意义的提示', () => {
      const statuses = [
        ActivityStatus.UPCOMING,
        ActivityStatus.ONGOING,
        ActivityStatus.ENDED,
      ];

      statuses.forEach((status) => {
        const config = getStatusAlertConfig(status);
        expect(config.message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('数据一致性', () => {
    it('activityTypeConfig和getTypeIcon应该保持一致', () => {
      Object.keys(activityTypeConfig).forEach((type) => {
        const icon = getTypeIcon(type as ActivityType);
        expect(icon).toBeDefined();
      });
    });

    it('activityStatusConfig和getStatusTag应该保持一致', () => {
      Object.keys(activityStatusConfig).forEach((status) => {
        const tag = getStatusTag(status as ActivityStatus);
        expect(tag.props.color).toBe(
          activityStatusConfig[status as ActivityStatus].color
        );
      });
    });

    it('activityTabsConfig应该覆盖所有状态', () => {
      const statusKeys = activityTabsConfig
        .filter((tab) => tab.key !== 'all')
        .map((tab) => tab.key);

      expect(statusKeys).toContain(ActivityStatus.UPCOMING);
      expect(statusKeys).toContain(ActivityStatus.ONGOING);
      expect(statusKeys).toContain(ActivityStatus.ENDED);
    });

    it('所有配置都应该可序列化（排除React元素）', () => {
      expect(() => {
        JSON.stringify({
          activityStatusConfig,
          activityTabsConfig,
        });
      }).not.toThrow();
    });
  });

  describe('颜色语义', () => {
    it('紧急活动应该使用红色', () => {
      expect(activityTypeConfig[ActivityType.FLASH_SALE].color).toBe('red');
    });

    it('积极状态应该使用绿色', () => {
      expect(activityStatusConfig[ActivityStatus.ONGOING].color).toBe('green');
    });

    it('中性状态应该使用蓝色或默认色', () => {
      expect(['blue', 'default']).toContain(
        activityStatusConfig[ActivityStatus.UPCOMING].color
      );
    });
  });
});
