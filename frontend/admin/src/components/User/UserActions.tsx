/**
 * 用户操作按钮组件（Memo 优化）
 *
 * 优化原理：
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 接收稳定的回调函数（useCallback）
 * 3. 只在 user 或回调函数变化时重渲染
 */
import { memo } from 'react';
import { Button, Space, Popconfirm } from 'antd';
import {
  EditOutlined,
  KeyOutlined,
  DollarOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import type { User } from '@/types';
import { UserStatus } from '@/types';
import { PermissionGuard } from '@/hooks/usePermission';

interface UserActionsProps {
  user: User;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onRecharge: (user: User) => void;
  onDeduct: (user: User) => void;
  onUpdateStatus: (userId: string, status: UserStatus) => void;
  onDelete: (userId: string) => void;
}

export const UserActions = memo<UserActionsProps>(
  ({ user, onEdit, onResetPassword, onRecharge, onDeduct, onUpdateStatus, onDelete }) => {
    return (
      <Space size="small">
        <PermissionGuard permission="user:update">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(user)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<KeyOutlined />}
            onClick={() => onResetPassword(user)}
          >
            重置密码
          </Button>
        </PermissionGuard>

        <PermissionGuard permission="billing:manage">
          <Button
            type="link"
            size="small"
            icon={<DollarOutlined />}
            onClick={() => onRecharge(user)}
          >
            充值
          </Button>
          <Button
            type="link"
            size="small"
            icon={<MinusOutlined />}
            onClick={() => onDeduct(user)}
          >
            扣减
          </Button>
        </PermissionGuard>

        <PermissionGuard permission="user:update">
          {user.status === UserStatus.ACTIVE && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => onUpdateStatus(user.id, UserStatus.BANNED)}
            >
              封禁
            </Button>
          )}
          {user.status === UserStatus.BANNED && (
            <Button
              type="link"
              size="small"
              onClick={() => onUpdateStatus(user.id, UserStatus.ACTIVE)}
            >
              解封
            </Button>
          )}
        </PermissionGuard>

        <PermissionGuard permission="user:delete">
          <Popconfirm
            title="确定要删除这个用户吗?"
            onConfirm={() => onDelete(user.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </PermissionGuard>
      </Space>
    );
  }
);

UserActions.displayName = 'UserActions';
