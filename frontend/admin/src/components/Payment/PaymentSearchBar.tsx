import { memo } from 'react';
import { Card, Input, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export interface PaymentSearchBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
}

/**
 * 支付搜索栏组件
 */
export const PaymentSearchBar = memo<PaymentSearchBarProps>(
  ({ searchValue, onSearchChange, onSearch, onClear }) => {
    return (
      <Card>
        <Space.Compact style={{ width: '100%', maxWidth: 600 }}>
          <Input
            placeholder="搜索支付单号、订单号、交易号..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onPressEnter={onSearch}
            prefix={<SearchOutlined />}
          />
          <Button type="primary" onClick={onSearch}>
            搜索
          </Button>
          {searchValue && <Button onClick={onClear}>清空</Button>}
        </Space.Compact>
      </Card>
    );
  }
);

PaymentSearchBar.displayName = 'PaymentSearchBar';
