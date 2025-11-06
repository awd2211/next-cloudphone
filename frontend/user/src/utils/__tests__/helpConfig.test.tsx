import { describe, it, expect } from 'vitest';
import {
  categoryIcons,
  categoryColors,
  quickLinks,
  icons,
} from '../helpConfig';

describe('helpConfig 配置', () => {
  describe('categoryIcons 分类图标', () => {
    it('应该包含所有预定义分类的图标', () => {
      const categories = [
        'getting-started',
        'account',
        'device',
        'app',
        'billing',
        'technical',
        'security',
      ];

      categories.forEach((category) => {
        expect(categoryIcons[category]).toBeDefined();
      });
    });

    it('所有图标都应该是React元素', () => {
      Object.values(categoryIcons).forEach((icon) => {
        expect(icon).toBeDefined();
        expect(typeof icon).toBe('object');
      });
    });

    it('应该有7个分类图标', () => {
      expect(Object.keys(categoryIcons)).toHaveLength(7);
    });
  });

  describe('categoryColors 分类颜色', () => {
    it('应该包含所有预定义分类的颜色', () => {
      const categories = [
        'getting-started',
        'account',
        'device',
        'app',
        'billing',
        'technical',
        'security',
      ];

      categories.forEach((category) => {
        expect(categoryColors[category]).toBeDefined();
      });
    });

    it('所有颜色都应该是有效的十六进制颜色值', () => {
      Object.values(categoryColors).forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('应该有7个分类颜色', () => {
      expect(Object.keys(categoryColors)).toHaveLength(7);
    });

    it('分类图标和颜色的键应该一致', () => {
      const iconKeys = Object.keys(categoryIcons).sort();
      const colorKeys = Object.keys(categoryColors).sort();
      expect(iconKeys).toEqual(colorKeys);
    });

    it('不同分类应该有不同的颜色', () => {
      const colors = Object.values(categoryColors);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });

  describe('quickLinks 快速入口', () => {
    it('应该有4个快速入口', () => {
      expect(quickLinks).toHaveLength(4);
    });

    it('所有快速入口都应该有完整的字段', () => {
      quickLinks.forEach((link) => {
        expect(link.icon).toBeDefined();
        expect(link.iconColor).toBeDefined();
        expect(link.title).toBeDefined();
        expect(link.description).toBeDefined();
        expect(link.path).toBeDefined();
      });
    });

    it('所有路径都应该是有效的', () => {
      quickLinks.forEach((link) => {
        expect(link.path).toMatch(/^\//);
        expect(link.path.length).toBeGreaterThan(1);
      });
    });

    it('所有标题都不应该为空', () => {
      quickLinks.forEach((link) => {
        expect(link.title.trim().length).toBeGreaterThan(0);
      });
    });

    it('所有描述都不应该为空', () => {
      quickLinks.forEach((link) => {
        expect(link.description.trim().length).toBeGreaterThan(0);
      });
    });

    it('所有iconColor都应该是有效的十六进制颜色值', () => {
      quickLinks.forEach((link) => {
        expect(link.iconColor).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('应该包含帮助文档入口', () => {
      const helpDocs = quickLinks.find((link) => link.title === '帮助文档');
      expect(helpDocs).toBeDefined();
      expect(helpDocs?.path).toBe('/help/articles');
    });

    it('应该包含常见问题入口', () => {
      const faqs = quickLinks.find((link) => link.title === '常见问题');
      expect(faqs).toBeDefined();
      expect(faqs?.path).toBe('/help/faqs');
    });

    it('应该包含视频教程入口', () => {
      const tutorials = quickLinks.find((link) => link.title === '视频教程');
      expect(tutorials).toBeDefined();
      expect(tutorials?.path).toBe('/help/tutorials');
    });

    it('应该包含联系客服入口', () => {
      const contact = quickLinks.find((link) => link.title === '联系客服');
      expect(contact).toBeDefined();
      expect(contact?.path).toBe('/tickets');
    });

    it('所有path应该唯一', () => {
      const paths = quickLinks.map((link) => link.path);
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(paths.length);
    });

    it('所有title应该唯一', () => {
      const titles = quickLinks.map((link) => link.title);
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(titles.length);
    });
  });

  describe('icons 图标常量', () => {
    it('应该导出所有必需的图标', () => {
      expect(icons.fire).toBeDefined();
      expect(icons.clock).toBeDefined();
      expect(icons.eye).toBeDefined();
      expect(icons.like).toBeDefined();
      expect(icons.question).toBeDefined();
      expect(icons.customerService).toBeDefined();
    });

    it('所有图标都应该是有效的', () => {
      Object.values(icons).forEach((Icon) => {
        // 图标可能是函数或对象（取决于导入方式）
        expect(['function', 'object']).toContain(typeof Icon);
        expect(Icon).toBeDefined();
      });
    });

    it('应该有6个图标', () => {
      expect(Object.keys(icons)).toHaveLength(6);
    });

    it('图标键名应该是驼峰命名', () => {
      Object.keys(icons).forEach((key) => {
        // 驼峰命名：首字母小写
        expect(key[0]).toBe(key[0].toLowerCase());
        // 不应包含下划线或连字符
        expect(key).not.toMatch(/[-_]/);
      });
    });
  });

  describe('数据一致性', () => {
    it('分类图标和颜色数量应该相同', () => {
      expect(Object.keys(categoryIcons).length).toBe(
        Object.keys(categoryColors).length
      );
    });

    it('快速入口的路径应该不冲突', () => {
      const paths = quickLinks.map((link) => link.path);
      // 检查是否有重复路径
      const hasDuplicates = paths.some(
        (path, index) => paths.indexOf(path) !== index
      );
      expect(hasDuplicates).toBe(false);
    });

    it('所有配置都应该可序列化', () => {
      // 测试能否序列化（排除React元素）
      expect(() => {
        JSON.stringify({
          categoryColors,
          quickLinksData: quickLinks.map((link) => ({
            ...link,
            icon: undefined, // 排除React元素
          })),
        });
      }).not.toThrow();
    });
  });

  describe('颜色配置验证', () => {
    it('getting-started应该是蓝色', () => {
      expect(categoryColors['getting-started']).toBe('#1890ff');
    });

    it('account应该是绿色', () => {
      expect(categoryColors.account).toBe('#52c41a');
    });

    it('security应该是红色', () => {
      expect(categoryColors.security).toBe('#f5222d');
    });

    it('不同重要程度的分类应该有不同的视觉效果', () => {
      // 安全相关应该用红色等警示色
      expect(['#f5222d', '#ff4d4f']).toContain(categoryColors.security);
    });
  });
});
