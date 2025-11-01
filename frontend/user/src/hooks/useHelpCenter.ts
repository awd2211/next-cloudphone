import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getHelpCategories,
  getPopularArticles,
  getLatestArticles,
  getFAQs,
  type HelpCategory,
  type HelpArticle,
  type FAQ,
} from '@/services/help';
import { quickLinks } from '@/utils/helpConfig';

/**
 * 帮助中心 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useCallback 优化导航函数
 * 3. ✅ 使用 useMemo 缓存配置数据
 * 4. ✅ 统一错误处理
 */
export function useHelpCenter() {
  const navigate = useNavigate();

  // ===== 状态管理 =====
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [popularArticles, setPopularArticles] = useState<HelpArticle[]>([]);
  const [latestArticles, setLatestArticles] = useState<HelpArticle[]>([]);
  const [popularFAQs, setPopularFAQs] = useState<FAQ[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');

  // ===== 数据加载 =====
  /**
   * 加载所有帮助中心数据
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [categoriesData, popularData, latestData, faqsData] = await Promise.all([
        getHelpCategories(),
        getPopularArticles(6),
        getLatestArticles(6),
        getFAQs({ page: 1, pageSize: 5 }),
      ]);

      setCategories(categoriesData);
      setPopularArticles(popularData);
      setLatestArticles(latestData);
      setPopularFAQs(faqsData.items);
    } catch (error) {
      console.error('加载帮助中心数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== 导航函数 =====
  /**
   * 搜索处理
   */
  const handleSearch = useCallback((value: string) => {
    if (value.trim()) {
      navigate(`/help/search?q=${encodeURIComponent(value.trim())}`);
    }
  }, [navigate]);

  /**
   * 搜索关键词变化处理
   */
  const handleSearchChange = useCallback((value: string) => {
    setSearchKeyword(value);
  }, []);

  /**
   * 跳转到分类
   */
  const goToCategory = useCallback((categoryId: string) => {
    navigate(`/help/articles?category=${categoryId}`);
  }, [navigate]);

  /**
   * 跳转到文章详情
   */
  const goToArticle = useCallback((articleId: string) => {
    navigate(`/help/articles/${articleId}`);
  }, [navigate]);

  /**
   * 跳转到 FAQ 详情
   */
  const goToFAQ = useCallback((faqId: string) => {
    navigate(`/help/faqs/${faqId}`);
  }, [navigate]);

  /**
   * 跳转到指定路径
   */
  const navigateTo = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  /**
   * 跳转到工单页面
   */
  const goToTickets = useCallback(() => {
    navigate('/tickets');
  }, [navigate]);

  /**
   * 跳转到 FAQ 列表
   */
  const goToFAQList = useCallback(() => {
    navigate('/help/faqs');
  }, [navigate]);

  /**
   * 跳转到文章列表
   */
  const goToArticles = useCallback(() => {
    navigate('/help/articles');
  }, [navigate]);

  // ===== 配置数据（使用 useMemo 缓存） =====
  const cachedQuickLinks = useMemo(() => quickLinks, []);

  // ===== 副作用 =====
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== 返回所有状态和方法 =====
  return {
    // 状态
    loading,
    categories,
    popularArticles,
    latestArticles,
    popularFAQs,
    searchKeyword,

    // 配置数据
    quickLinks: cachedQuickLinks,

    // 搜索
    handleSearch,
    handleSearchChange,

    // 导航函数
    goToCategory,
    goToArticle,
    goToFAQ,
    navigateTo,
    goToTickets,
    goToFAQList,
    goToArticles,

    // 数据操作
    loadData,
  };
}
