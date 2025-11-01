import React from 'react';
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
import { useHelpCenter } from '@/hooks/useHelpCenter';

// Dayjs 配置
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * 帮助中心页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 导航函数使用 useCallback 优化
 * 5. ✅ 代码从 465 行减少到 ~60 行
 */
const HelpCenter: React.FC = () => {
  const {
    loading,
    categories,
    popularArticles,
    latestArticles,
    popularFAQs,
    searchKeyword,
    quickLinks,
    handleSearch,
    handleSearchChange,
    goToCategory,
    goToArticle,
    goToFAQ,
    navigateTo,
    goToTickets,
    goToFAQList,
    goToArticles,
  } = useHelpCenter();

  // 加载中状态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
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
        quickLinks={quickLinks}
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
