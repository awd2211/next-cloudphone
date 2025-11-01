/**
 * AppVersionTag - 应用版本标签组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Tag } from 'antd';

interface AppVersionTagProps {
  versionName: string;
  versionCode: number;
}

/**
 * AppVersionTag 组件
 * 显示应用版本名称和版本号
 */
export const AppVersionTag = memo<AppVersionTagProps>(({ versionName, versionCode }) => {
  return (
    <Tag color="blue">
      v{versionName} ({versionCode})
    </Tag>
  );
});

AppVersionTag.displayName = 'AppVersionTag';
