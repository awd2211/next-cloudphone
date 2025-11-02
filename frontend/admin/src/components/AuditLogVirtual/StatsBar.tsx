import React from 'react';
import { Space, Tag } from 'antd';

interface StatsBarProps {
  totalCount: number;
  filteredCount: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({ totalCount, filteredCount }) => {
  return (
    <div className="log-stats">
      <Space size="large">
        <span>
          总记录数: <strong>{totalCount.toLocaleString()}</strong>
        </span>
        <span>
          过滤后: <strong>{filteredCount.toLocaleString()}</strong>
        </span>
        <Tag color="green">✅ 虚拟滚动已启用</Tag>
      </Space>
    </div>
  );
};
