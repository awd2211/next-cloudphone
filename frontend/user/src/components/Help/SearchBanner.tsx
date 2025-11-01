import React from 'react';
import { Card, Input, Button, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { Search } = Input;

interface SearchBannerProps {
  searchKeyword: string;
  onSearchChange: (value: string) => void;
  onSearch: (value: string) => void;
}

/**
 * 帮助中心搜索横幅组件
 */
export const SearchBanner: React.FC<SearchBannerProps> = React.memo(({
  searchKeyword,
  onSearchChange,
  onSearch,
}) => {
  return (
    <Card
      style={{
        marginBottom: 24,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
      }}
    >
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Title level={2} style={{ color: '#fff', marginBottom: 8 }}>
          帮助中心
        </Title>
        <Paragraph style={{ color: '#fff', fontSize: 16, marginBottom: 32 }}>
          我们随时为您提供帮助和支持
        </Paragraph>

        <Search
          placeholder="搜索帮助文档、常见问题..."
          size="large"
          enterButton={
            <Button type="primary" size="large" icon={<SearchOutlined />}>
              搜索
            </Button>
          }
          onSearch={onSearch}
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ maxWidth: 600 }}
        />
      </div>
    </Card>
  );
});

SearchBanner.displayName = 'SearchBanner';
