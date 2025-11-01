/**
 * AppIcon - 应用图标组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Image, Avatar } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

interface AppIconProps {
  iconUrl?: string;
  size?: number;
  borderRadius?: string;
}

/**
 * AppIcon 组件
 * 显示应用图标，如果没有图标则显示默认 Avatar
 */
export const AppIcon = memo<AppIconProps>(
  ({ iconUrl, size = 48, borderRadius = '8px' }) => {
    if (iconUrl) {
      return <Image src={iconUrl} width={size} height={size} style={{ borderRadius }} />;
    }

    return (
      <Avatar size={size} icon={<AppstoreOutlined />} style={{ backgroundColor: '#1890ff' }} />
    );
  }
);

AppIcon.displayName = 'AppIcon';
