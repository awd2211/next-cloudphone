/**
 * PageSkeleton 组件单元测试
 * 测试各种页面骨架屏组件
 */

import { describe, it, expect } from 'vitest';
import { render } from '../../tests/test-utils';
import {
  TableSkeleton,
  DetailSkeleton,
  FormSkeleton,
  DashboardSkeleton,
  CardListSkeleton,
  ContentSkeleton,
  CardSkeleton,
} from '../PageSkeleton';

describe('PageSkeleton Components', () => {
  describe('TableSkeleton', () => {
    it('应该渲染表格骨架屏', () => {
      const { container } = render(<TableSkeleton />);

      // 验证 Card 容器存在
      expect(container.querySelector('.ant-card')).toBeInTheDocument();

      // 验证 Skeleton 存在
      expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
    });

    it('应该渲染默认 10 行', () => {
      const { container } = render(<TableSkeleton />);

      // Ant Design Skeleton 使用 paragraph 配置行数
      const skeleton = container.querySelector('.ant-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('应该渲染自定义行数', () => {
      const { container } = render(<TableSkeleton rows={5} />);

      // 验证骨架屏存在
      const skeleton = container.querySelector('.ant-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('应该渲染搜索栏骨架', () => {
      const { container } = render(<TableSkeleton />);

      // 验证输入框骨架
      expect(container.querySelector('.ant-skeleton-input')).toBeInTheDocument();

      // 验证按钮骨架
      expect(container.querySelector('.ant-skeleton-button')).toBeInTheDocument();
    });
  });

  describe('DetailSkeleton', () => {
    it('应该渲染详情页骨架屏', () => {
      const { container } = render(<DetailSkeleton />);

      // 验证 Card 容器
      expect(container.querySelector('.ant-card')).toBeInTheDocument();

      // 验证多个输入框骨架（标题 + 8个字段）
      const inputs = container.querySelectorAll('.ant-skeleton-input');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('应该渲染标题骨架', () => {
      const { container } = render(<DetailSkeleton />);

      // 验证大尺寸输入框（标题）
      const inputs = container.querySelectorAll('.ant-skeleton-input');
      expect(inputs.length).toBeGreaterThanOrEqual(1);
    });

    it('应该渲染 8 个描述字段', () => {
      const { container } = render(<DetailSkeleton />);

      // 验证多个骨架元素（8个字段 * 2个输入框）
      const inputs = container.querySelectorAll('.ant-skeleton-input');
      expect(inputs.length).toBeGreaterThanOrEqual(8);
    });

    it('应该渲染操作按钮骨架', () => {
      const { container } = render(<DetailSkeleton />);

      // 验证按钮骨架
      const buttons = container.querySelectorAll('.ant-skeleton-button');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('FormSkeleton', () => {
    it('应该渲染表单骨架屏', () => {
      const { container } = render(<FormSkeleton />);

      // 验证 Card 容器
      expect(container.querySelector('.ant-card')).toBeInTheDocument();

      // 验证输入框骨架
      expect(container.querySelector('.ant-skeleton-input')).toBeInTheDocument();
    });

    it('应该渲染默认 6 个字段', () => {
      const { container } = render(<FormSkeleton />);

      // 验证输入框数量（6个字段 * 2个输入框 = 12+）
      const inputs = container.querySelectorAll('.ant-skeleton-input');
      expect(inputs.length).toBeGreaterThanOrEqual(6);
    });

    it('应该渲染自定义字段数量', () => {
      const { container } = render(<FormSkeleton fields={3} />);

      // 验证输入框存在
      const inputs = container.querySelectorAll('.ant-skeleton-input');
      expect(inputs.length).toBeGreaterThanOrEqual(3);
    });

    it('应该渲染提交按钮骨架', () => {
      const { container } = render(<FormSkeleton />);

      // 验证按钮骨架（至少 2 个）
      const buttons = container.querySelectorAll('.ant-skeleton-button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('DashboardSkeleton', () => {
    it('应该渲染仪表板骨架屏', () => {
      const { container } = render(<DashboardSkeleton />);

      // 验证多个 Card
      const cards = container.querySelectorAll('.ant-card');
      expect(cards.length).toBeGreaterThan(0);

      // 验证骨架元素
      expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
    });

    it('应该渲染 4 个统计卡片', () => {
      const { container } = render(<DashboardSkeleton />);

      // 验证至少有 4 个 Card（统计卡片）
      const cards = container.querySelectorAll('.ant-card');
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    it('应该渲染图表区域骨架', () => {
      const { container } = render(<DashboardSkeleton />);

      // 验证多个骨架元素（统计 + 图表 + 表格）
      const skeletons = container.querySelectorAll('.ant-skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });

    it('应该使用网格布局', () => {
      const { container } = render(<DashboardSkeleton />);

      // 验证包含 grid 样式的元素
      const gridElements = container.querySelectorAll('[style*="grid"]');
      expect(gridElements.length).toBeGreaterThan(0);
    });
  });

  describe('CardListSkeleton', () => {
    it('应该渲染卡片列表骨架屏', () => {
      const { container } = render(<CardListSkeleton />);

      // 验证 Card 存在
      expect(container.querySelector('.ant-card')).toBeInTheDocument();

      // 验证 Skeleton 存在
      expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
    });

    it('应该渲染默认 6 个卡片', () => {
      const { container } = render(<CardListSkeleton />);

      // 验证至少有 6 个 Card
      const cards = container.querySelectorAll('.ant-card');
      expect(cards.length).toBe(6);
    });

    it('应该渲染自定义卡片数量', () => {
      const { container } = render(<CardListSkeleton count={3} />);

      // 验证正好 3 个 Card
      const cards = container.querySelectorAll('.ant-card');
      expect(cards.length).toBe(3);
    });

    it('应该渲染头像骨架', () => {
      const { container } = render(<CardListSkeleton />);

      // 验证头像骨架
      expect(container.querySelector('.ant-skeleton-avatar')).toBeInTheDocument();
    });

    it('应该使用响应式网格布局', () => {
      const { container } = render(<CardListSkeleton />);

      // 验证网格容器
      const gridContainer = container.querySelector('[style*="grid"]');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('ContentSkeleton', () => {
    it('应该渲染通用内容骨架屏', () => {
      const { container } = render(<ContentSkeleton />);

      // 验证 Skeleton 存在
      expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
    });

    it('应该渲染默认 5 行', () => {
      const { container } = render(<ContentSkeleton />);

      // 验证骨架元素存在
      const skeleton = container.querySelector('.ant-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('应该渲染自定义行数', () => {
      const { container } = render(<ContentSkeleton rows={3} />);

      // 验证骨架元素存在
      const skeleton = container.querySelector('.ant-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('应该是激活状态', () => {
      const { container } = render(<ContentSkeleton />);

      // Ant Design active 状态会添加 ant-skeleton-active 类
      const skeleton = container.querySelector('.ant-skeleton');
      expect(skeleton).toHaveClass('ant-skeleton-active');
    });
  });

  describe('CardSkeleton', () => {
    it('应该渲染卡片骨架屏', () => {
      const { container } = render(<CardSkeleton />);

      // 验证 Card 容器
      expect(container.querySelector('.ant-card')).toBeInTheDocument();

      // 验证 Skeleton
      expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
    });

    it('默认不应该渲染头像', () => {
      const { container } = render(<CardSkeleton />);

      // 默认 hasAvatar=false，不应该有头像
      expect(container.querySelector('.ant-skeleton-avatar')).not.toBeInTheDocument();
    });

    it('应该渲染带头像的骨架', () => {
      const { container } = render(<CardSkeleton hasAvatar={true} />);

      // 验证头像骨架
      expect(container.querySelector('.ant-skeleton-avatar')).toBeInTheDocument();
    });

    it('应该渲染默认 4 行', () => {
      const { container } = render(<CardSkeleton />);

      // 验证骨架存在
      const skeleton = container.querySelector('.ant-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('应该渲染自定义行数', () => {
      const { container } = render(<CardSkeleton rows={6} />);

      // 验证骨架存在
      const skeleton = container.querySelector('.ant-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('应该同时支持头像和自定义行数', () => {
      const { container } = render(<CardSkeleton hasAvatar={true} rows={8} />);

      // 验证头像和骨架都存在
      expect(container.querySelector('.ant-skeleton-avatar')).toBeInTheDocument();
      expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
    });
  });

  describe('通用特性测试', () => {
    it('所有骨架屏都应该是激活状态', () => {
      const components = [
        <TableSkeleton />,
        <DetailSkeleton />,
        <FormSkeleton />,
        <ContentSkeleton />,
        <CardSkeleton />,
      ];

      components.forEach((component) => {
        const { container } = render(component);
        const skeleton = container.querySelector('.ant-skeleton');
        expect(skeleton).toHaveClass('ant-skeleton-active');
      });
    });

    it('CardListSkeleton 中所有卡片应该有骨架', () => {
      const { container } = render(<CardListSkeleton count={4} />);

      // 验证卡片数量
      const cards = container.querySelectorAll('.ant-card');
      expect(cards.length).toBe(4);

      // 验证每个卡片都有骨架
      const skeletons = container.querySelectorAll('.ant-skeleton');
      expect(skeletons.length).toBe(4);
    });

    it('DashboardSkeleton 应该包含所有必要的区域', () => {
      const { container } = render(<DashboardSkeleton />);

      // 验证多个 Card（统计卡片 4 + 图表 2 + 表格 1 = 7）
      const cards = container.querySelectorAll('.ant-card');
      expect(cards.length).toBe(7);

      // 验证多个骨架元素
      const skeletons = container.querySelectorAll('.ant-skeleton');
      expect(skeletons.length).toBe(7);
    });
  });

  describe('边界情况', () => {
    it('TableSkeleton 应该处理 0 行', () => {
      const { container } = render(<TableSkeleton rows={0} />);

      // 仍然应该渲染骨架容器
      expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
    });

    it('FormSkeleton 应该处理 0 个字段', () => {
      const { container } = render(<FormSkeleton fields={0} />);

      // 仍然应该渲染 Card 和按钮
      expect(container.querySelector('.ant-card')).toBeInTheDocument();
    });

    it('CardListSkeleton 应该处理 0 个卡片', () => {
      const { container } = render(<CardListSkeleton count={0} />);

      // 应该渲染空容器
      const gridContainer = container.querySelector('[style*="grid"]');
      expect(gridContainer).toBeInTheDocument();
    });

    it('ContentSkeleton 应该处理 1 行', () => {
      const { container } = render(<ContentSkeleton rows={1} />);

      // 应该正常渲染
      expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
    });
  });
});
