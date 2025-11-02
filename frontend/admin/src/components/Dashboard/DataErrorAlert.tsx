import { Alert } from 'antd';
import { memo } from 'react';

interface DataErrorAlertProps {
  title: string;
  description: string;
  onRetry: () => void;
  style?: React.CSSProperties;
}

/**
 * 数据加载错误提示组件
 * 用于 Dashboard 页面的统一错误提示
 */
export const DataErrorAlert = memo<DataErrorAlertProps>(
  ({ title, description, onRetry, style }) => {
    return (
      <Alert
        message={title}
        description={description}
        type="error"
        showIcon
        closable
        action={
          <a onClick={onRetry} style={{ textDecoration: 'underline' }}>
            重试
          </a>
        }
        style={style}
      />
    );
  }
);

DataErrorAlert.displayName = 'DataErrorAlert';
