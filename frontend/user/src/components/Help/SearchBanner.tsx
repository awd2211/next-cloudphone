import React from 'react';
import { Input, Button, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { Search } = Input;

interface SearchBannerProps {
  searchKeyword: string;
  onSearchChange: (value: string) => void;
  onSearch: (value: string) => void;
}

/**
 * 帮助中心搜索横幅组件（优化版）
 */
export const SearchBanner: React.FC<SearchBannerProps> = React.memo(({
  searchKeyword,
  onSearchChange,
  onSearch,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        marginBottom: 32,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <style>
        {`
          @keyframes bannerFloat {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(20px, 20px) scale(1.05); }
          }
          @keyframes bannerFadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      {/* 背景装饰 */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'bannerFloat 8s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-50%',
          left: '-10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'bannerFloat 6s ease-in-out infinite reverse',
        }}
      />

      {/* 内容 */}
      <div style={{ position: 'relative', textAlign: 'center', padding: '60px 24px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 16px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 20,
            marginBottom: 16,
            animation: 'bannerFadeIn 0.6s ease-out',
          }}
        >
          <SearchOutlined style={{ color: '#fff', marginRight: 8 }} />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
            7×24 小时在线支持
          </span>
        </div>

        <Title
          level={1}
          style={{
            color: '#fff',
            marginBottom: 12,
            fontSize: 42,
            fontWeight: 700,
            animation: 'bannerFadeIn 0.6s ease-out 0.2s backwards',
          }}
        >
          帮助中心
        </Title>
        <Paragraph
          style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: 18,
            marginBottom: 40,
            animation: 'bannerFadeIn 0.6s ease-out 0.4s backwards',
          }}
        >
          我们随时为您提供帮助和支持，快速解决您的问题
        </Paragraph>

        <div style={{ animation: 'bannerFadeIn 0.6s ease-out 0.6s backwards' }}>
          <Search
            placeholder="搜索帮助文档、常见问题、教程..."
            size="large"
            enterButton={
              <Button type="primary" size="large" icon={<SearchOutlined />}>
                搜索
              </Button>
            }
            onSearch={onSearch}
            value={searchKeyword}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              maxWidth: 600,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            }}
          />
        </div>
      </div>
    </div>
  );
});

SearchBanner.displayName = 'SearchBanner';
