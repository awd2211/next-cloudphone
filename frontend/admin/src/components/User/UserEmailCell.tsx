/**
 * 用户邮箱显示组件（Memo 优化）
 *
 * 优化原理：
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 只在 email、isVisible 变化时重渲染
 * 3. maskEmail 函数在模块级别定义（避免重复创建）
 */
import { memo } from 'react';
import { Space, Button } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

interface UserEmailCellProps {
  email: string | undefined;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

// ✅ 邮箱脱敏函数在模块级别定义（避免每次渲染都创建）
const maskEmail = (email: string | undefined): string => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!domain) return email;
  const visiblePart = username.slice(0, 3);
  const maskedPart = '*'.repeat(Math.max(0, username.length - 3));
  return `${visiblePart}${maskedPart}@${domain}`;
};

export const UserEmailCell = memo<UserEmailCellProps>(
  ({ email, isVisible, onToggleVisibility }) => {
    return (
      <Space>
        <span>{isVisible ? email : maskEmail(email)}</span>
        <Button
          type="link"
          size="small"
          icon={isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={onToggleVisibility}
          style={{ padding: 0 }}
        />
      </Space>
    );
  }
);

UserEmailCell.displayName = 'UserEmailCell';
