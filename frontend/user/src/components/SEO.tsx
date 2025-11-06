import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * SEO 组件
 * 管理页面 meta 标签、Open Graph、Twitter Card
 * 提升搜索引擎优化和社交分享效果
 */
const SEO: React.FC<SEOProps> = ({
  title = 'Ultrathink - 企业级云手机平台 | Cloud Phone Platform',
  description = 'Ultrathink 提供稳定高效的云端 Android 设备服务，支持应用测试、自动化运营、游戏多开等场景。专业的云手机解决方案，助力企业数字化转型。',
  keywords = '云手机,云端Android,应用测试,自动化运营,游戏多开,移动设备云,云测试平台,Ultrathink',
  image = 'https://ultrathink.com/og-image.jpg',
  url = 'https://ultrathink.com',
  type = 'website',
  author = 'Ultrathink Team',
  publishedTime,
  modifiedTime,
}) => {
  const siteTitle = 'Ultrathink';
  const fullTitle = title.includes(siteTitle) ? title : `${title} | ${siteTitle}`;

  return (
    <Helmet>
      {/* 基础 Meta 标签 */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />

      {/* Open Graph (Facebook, LinkedIn) */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:locale" content="zh_CN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@ultrathink" />

      {/* 文章特定标签 */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}

      {/* 移动端优化 */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content="#6366f1" />

      {/* 搜索引擎爬虫指令 */}
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />

      {/* 规范链接 */}
      <link rel="canonical" href={url} />

      {/* JSON-LD 结构化数据 */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Ultrathink',
          url: 'https://ultrathink.com',
          logo: 'https://ultrathink.com/logo.png',
          description: description,
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+86-400-123-4567',
            contactType: 'Customer Service',
            availableLanguage: ['Chinese', 'English'],
          },
          sameAs: [
            'https://github.com/ultrathink',
            'https://twitter.com/ultrathink',
            'https://linkedin.com/company/ultrathink',
          ],
        })}
      </script>

      {/* WebSite 结构化数据（用于搜索框） */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Ultrathink',
          url: 'https://ultrathink.com',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://ultrathink.com/search?q={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        })}
      </script>
    </Helmet>
  );
};

export default SEO;
