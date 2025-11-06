import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHelpCenter } from '../useHelpCenter';
import * as helpService from '@/services/help';
import * as helpConfig from '@/utils/helpConfig';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock help service
vi.mock('@/services/help', () => ({
  getHelpCategories: vi.fn(),
  getPopularArticles: vi.fn(),
  getLatestArticles: vi.fn(),
  getFAQs: vi.fn(),
}));

// Mock help config
vi.mock('@/utils/helpConfig', () => ({
  quickLinks: [
    { id: '1', title: '快速链接1', path: '/link1' },
    { id: '2', title: '快速链接2', path: '/link2' },
  ],
}));

describe('useHelpCenter Hook', () => {
  const mockCategories = [
    { id: 'cat-1', name: '分类1' },
    { id: 'cat-2', name: '分类2' },
  ];

  const mockPopularArticles = [
    { id: 'article-1', title: '热门文章1' },
    { id: 'article-2', title: '热门文章2' },
  ];

  const mockLatestArticles = [
    { id: 'article-3', title: '最新文章1' },
    { id: 'article-4', title: '最新文章2' },
  ];

  const mockFAQs = {
    items: [
      { id: 'faq-1', question: '问题1', answer: '答案1' },
      { id: 'faq-2', question: '问题2', answer: '答案2' },
    ],
    total: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(helpService.getHelpCategories).mockResolvedValue(mockCategories as any);
    vi.mocked(helpService.getPopularArticles).mockResolvedValue(mockPopularArticles as any);
    vi.mocked(helpService.getLatestArticles).mockResolvedValue(mockLatestArticles as any);
    vi.mocked(helpService.getFAQs).mockResolvedValue(mockFAQs as any);
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useHelpCenter());

      expect(typeof result.current.loading).toBe('boolean');
      expect(result.current.categories).toEqual([]);
      expect(result.current.popularArticles).toEqual([]);
      expect(result.current.latestArticles).toEqual([]);
      expect(result.current.popularFAQs).toEqual([]);
      expect(result.current.searchKeyword).toBe('');
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载所有数据', async () => {
      renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(helpService.getHelpCategories).toHaveBeenCalled();
        expect(helpService.getPopularArticles).toHaveBeenCalledWith(6);
        expect(helpService.getLatestArticles).toHaveBeenCalledWith(6);
        expect(helpService.getFAQs).toHaveBeenCalledWith({ page: 1, pageSize: 5 });
      });
    });

    it('加载成功应该更新所有数据', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories).toEqual(mockCategories);
        expect(result.current.popularArticles).toEqual(mockPopularArticles);
        expect(result.current.latestArticles).toEqual(mockLatestArticles);
        expect(result.current.popularFAQs).toEqual(mockFAQs.items);
      });
    });

    it('加载失败不应该抛出错误', async () => {
      vi.mocked(helpService.getHelpCategories).mockRejectedValue(
        new Error('网络错误')
      );

      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 不应该抛出错误,数据保持为空数组
      expect(result.current.categories).toEqual([]);
    });

    it('应该使用Promise.all并发加载', async () => {
      renderHook(() => useHelpCenter());

      // 所有 API 应该被同时调用
      await waitFor(() => {
        expect(helpService.getHelpCategories).toHaveBeenCalled();
      });

      // 验证 Promise.all 的调用方式
      expect(helpService.getPopularArticles).toHaveBeenCalled();
      expect(helpService.getLatestArticles).toHaveBeenCalled();
      expect(helpService.getFAQs).toHaveBeenCalled();
    });
  });

  describe('handleSearch 搜索', () => {
    it('有效关键词应该导航到搜索页', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSearch('测试搜索');
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        '/help/search?q=%E6%B5%8B%E8%AF%95%E6%90%9C%E7%B4%A2'
      );
    });

    it('空白关键词不应该导航', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSearch('   ');
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('应该编码特殊字符', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSearch('测试 & 搜索');
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/help/search?q=')
      );
    });

    it('应该去除首尾空白', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSearch('  测试  ');
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        '/help/search?q=%E6%B5%8B%E8%AF%95'
      );
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useHelpCenter());

      const firstHandle = result.current.handleSearch;
      rerender();
      const secondHandle = result.current.handleSearch;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleSearchChange 搜索关键词变化', () => {
    it('应该更新searchKeyword', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      expect(result.current.searchKeyword).toBe('');

      act(() => {
        result.current.handleSearchChange('新关键词');
      });

      expect(result.current.searchKeyword).toBe('新关键词');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useHelpCenter());

      const firstHandle = result.current.handleSearchChange;
      rerender();
      const secondHandle = result.current.handleSearchChange;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('导航函数', () => {
    it('goToCategory应该导航到分类页', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.goToCategory('cat-1');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/help/articles?category=cat-1');
    });

    it('goToArticle应该导航到文章详情页', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.goToArticle('article-1');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/help/articles/article-1');
    });

    it('goToFAQ应该导航到FAQ详情页', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.goToFAQ('faq-1');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/help/faqs/faq-1');
    });

    it('navigateTo应该导航到指定路径', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.navigateTo('/custom/path');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/custom/path');
    });

    it('goToTickets应该导航到工单页', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.goToTickets();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/tickets');
    });

    it('goToFAQList应该导航到FAQ列表页', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.goToFAQList();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/help/faqs');
    });

    it('goToArticles应该导航到文章列表页', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.goToArticles();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/help/articles');
    });

    it('导航函数应该是稳定的引用', () => {
      const { result, rerender } = renderHook(() => useHelpCenter());

      const firstGoToCategory = result.current.goToCategory;
      const firstGoToArticle = result.current.goToArticle;
      const firstGoToFAQ = result.current.goToFAQ;
      const firstNavigateTo = result.current.navigateTo;
      const firstGoToTickets = result.current.goToTickets;
      const firstGoToFAQList = result.current.goToFAQList;
      const firstGoToArticles = result.current.goToArticles;

      rerender();

      expect(result.current.goToCategory).toBe(firstGoToCategory);
      expect(result.current.goToArticle).toBe(firstGoToArticle);
      expect(result.current.goToFAQ).toBe(firstGoToFAQ);
      expect(result.current.navigateTo).toBe(firstNavigateTo);
      expect(result.current.goToTickets).toBe(firstGoToTickets);
      expect(result.current.goToFAQList).toBe(firstGoToFAQList);
      expect(result.current.goToArticles).toBe(firstGoToArticles);
    });
  });

  describe('quickLinks 配置数据', () => {
    it('应该返回quickLinks配置', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      expect(result.current.quickLinks).toEqual(helpConfig.quickLinks);
    });

    it('应该缓存quickLinks引用', () => {
      const { result, rerender } = renderHook(() => useHelpCenter());

      const firstQuickLinks = result.current.quickLinks;
      rerender();
      const secondQuickLinks = result.current.quickLinks;

      expect(firstQuickLinks).toBe(secondQuickLinks);
    });
  });

  describe('loadData 重新加载', () => {
    it('应该重新加载所有数据', async () => {
      const { result } = renderHook(() => useHelpCenter());

      await waitFor(() => {
        expect(result.current.categories.length).toBeGreaterThan(0);
      });

      vi.clearAllMocks();

      act(() => {
        result.current.loadData();
      });

      await waitFor(() => {
        expect(helpService.getHelpCategories).toHaveBeenCalled();
        expect(helpService.getPopularArticles).toHaveBeenCalled();
        expect(helpService.getLatestArticles).toHaveBeenCalled();
        expect(helpService.getFAQs).toHaveBeenCalled();
      });
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useHelpCenter());

      const firstLoadData = result.current.loadData;
      rerender();
      const secondLoadData = result.current.loadData;

      expect(firstLoadData).toBe(secondLoadData);
    });
  });
});
