import React from 'react';
import { Card, Row, Col, Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface AppSearchBarProps {
  search: string;
  category: string;
  categories: { label: string; value: string }[];
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onCategoryChange: (value: string) => void;
}

/**
 * 应用搜索筛选栏组件
 * 包含搜索框和分类选择器
 */
export const AppSearchBar: React.FC<AppSearchBarProps> = React.memo(({
  search,
  category,
  categories,
  onSearchChange,
  onSearch,
  onCategoryChange,
}) => {
  return (
    <Card style={{ marginBottom: 24 }}>
      <Row gutter={16}>
        <Col flex="auto">
          <Input.Search
            size="large"
            placeholder="搜索应用名称或包名"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onSearch={onSearch}
            prefix={<SearchOutlined />}
            enterButton="搜索"
          />
        </Col>
        <Col>
          <Select
            size="large"
            value={category}
            onChange={onCategoryChange}
            style={{ width: 150 }}
            options={categories}
          />
        </Col>
      </Row>
    </Card>
  );
});

AppSearchBar.displayName = 'AppSearchBar';
