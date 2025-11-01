/**
 * AppNameDisplay - 应用名称显示组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Space } from 'antd';

interface AppNameDisplayProps {
  name: string;
  packageName: string;
}

/**
 * AppNameDisplay 组件
 * 显示应用名称和包名（包名以灰色小字显示）
 */
export const AppNameDisplay = memo<AppNameDisplayProps>(({ name, packageName }) => {
  return (
    <Space direction="vertical" size={0}>
      <span style={{ fontWeight: 500 }}>{name}</span>
      <span style={{ fontSize: '12px', color: '#999' }}>{packageName}</span>
    </Space>
  );
});

AppNameDisplay.displayName = 'AppNameDisplay';
