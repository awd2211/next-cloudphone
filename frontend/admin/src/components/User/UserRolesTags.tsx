/**
 * 用户角色标签组件（Memo 优化）
 *
 * 优化原理：
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 只在 roles 数组变化时重渲染
 * 3. 避免在表格 render 函数中创建内联 JSX
 */
import { memo } from 'react';
import { Tag } from 'antd';

interface Role {
  id: string;
  name: string;
}

interface UserRolesTagsProps {
  roles?: Role[];
}

export const UserRolesTags = memo<UserRolesTagsProps>(({ roles }) => {
  if (!roles || roles.length === 0) {
    return <Tag color="default">无角色</Tag>;
  }

  return (
    <>
      {roles.map((role) => (
        <Tag key={role.id} color="blue">
          {role.name}
        </Tag>
      ))}
    </>
  );
});

UserRolesTags.displayName = 'UserRolesTags';
