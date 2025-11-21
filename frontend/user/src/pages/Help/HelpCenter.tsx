import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Divider, Spin } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import {
  SearchBanner,
  QuickLinksGrid,
  CategoryGrid,
  ArticleSection,
  FAQSection,
  HelpFooter,
} from '@/components/Help';
import {
  useHelpCategories,
  usePopularArticles,
  useLatestArticles,
  useFAQs,
} from '@/hooks/queries';
import { quickLinks } from '@/utils/helpConfig';

// Dayjs 配置
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * 帮助中心页面
 *
 * 功能：
 * 1. 展示帮助分类、热门文章、最新文章、常见问题
 * 2. 搜索功能
 * 3. 快速入口导航
 * 4. 支持跳转到文章详情、FAQ 详情、工单等
 */
const HelpCenter: React.FC = () => {
  const navigate = useNavigate();

  // 本地状态
  const [searchKeyword, setSearchKeyword] = useState('');

  // React Query hooks - 并行查询
  const { data: categories = [], isLoading: loadingCategories } = useHelpCategories();
  const { data: popularArticles = [], isLoading: loadingPopular } = usePopularArticles(6);
  const { data: latestArticles = [], isLoading: loadingLatest } = useLatestArticles(6);
  const { data: faqsData, isLoading: loadingFAQs } = useFAQs({ page: 1, pageSize: 5 });

  const popularFAQs = faqsData?.items || [];
  const loading = loadingCategories || loadingPopular || loadingLatest || loadingFAQs;

  // 配置数据（静态）
  const cachedQuickLinks = useMemo(() => quickLinks, []);

  // 搜索处理
  const handleSearch = useCallback((value: string) => {
    if (value.trim()) {
      navigate(`/help/search?q=${encodeURIComponent(value.trim())}`);
    }
  }, [navigate]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchKeyword(value);
  }, []);

  // 导航函数
  const goToCategory = useCallback((categoryId: string) => {
    navigate(`/help/articles?category=${categoryId}`);
  }, [navigate]);

  const goToArticle = useCallback((articleId: string) => {
    navigate(`/help/articles/${articleId}`);
  }, [navigate]);

  const goToFAQ = useCallback((faqId: string) => {
    navigate(`/help/faqs/${faqId}`);
  }, [navigate]);

  const navigateTo = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const goToTickets = useCallback(() => {
    navigate('/tickets');
  }, [navigate]);

  const goToFAQList = useCallback(() => {
    navigate('/help/faqs');
  }, [navigate]);

  const goToArticles = useCallback(() => {
    navigate('/help/articles');
  }, [navigate]);

  // 加载中状态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载帮助中心数据..." />
      </div>
    );
  }

  return (
    <div>
      {/* 搜索横幅 */}
      <SearchBanner
        searchKeyword={searchKeyword}
        onSearchChange={handleSearchChange}
        onSearch={handleSearch}
      />

      {/* 快速入口 */}
      <QuickLinksGrid
        quickLinks={cachedQuickLinks}
        onLinkClick={navigateTo}
      />

      {/* 帮助分类 */}
      <CategoryGrid
        categories={categories}
        onCategoryClick={goToCategory}
      />

      {/* 热门和最新文章 */}
      <ArticleSection
        popularArticles={popularArticles}
        latestArticles={latestArticles}
        onArticleClick={goToArticle}
        onViewAllClick={goToArticles}
      />

      {/* 常见问题 */}
      <FAQSection
        popularFAQs={popularFAQs}
        onFAQClick={goToFAQ}
        onViewAllClick={goToFAQList}
      />

      <Divider />

      {/* 底部提示 */}
      <HelpFooter
        onContactClick={goToTickets}
        onFAQClick={goToFAQList}
      />
    </div>
  );
};

export default HelpCenter;
