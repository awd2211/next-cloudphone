import React from 'react';
import { Card, Input, Typography } from 'antd';
import { SearchOutlined, QuestionCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface HelpSearchHeaderProps {
  searchValue: string;
  onSearch: (value: string) => void;
}

/**
 * 帮助中心搜索头部组件
 * 渐变背景 + 大标题 + 搜索框
 */
export const HelpSearchHeader: React.FC<HelpSearchHeaderProps> = React.memo(({
  searchValue,
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
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <QuestionCircleOutlined
          style={{
            fontSize: 64,
            color: '#fff',
            marginBottom: 16,
          }}
        />
        <Title level={2} style={{ color: '#fff', marginBottom: 8 }}>
          帮助中心
        </Title>
        <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 16 }}>
          搜索您需要的帮助文档和常见问题
        </Text>
        <div style={{ maxWidth: 600, margin: '24px auto 0' }}>
          <Input
            size="large"
            placeholder="搜索帮助文档、常见问题..."
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            style={{
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          />
        </div>
      </div>
    </Card>
  );
});

HelpSearchHeader.displayName = 'HelpSearchHeader';
