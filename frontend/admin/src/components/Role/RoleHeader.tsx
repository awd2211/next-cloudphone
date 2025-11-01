import React from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface RoleHeaderProps {
  onCreate: () => void;
}

export const RoleHeader: React.FC<RoleHeaderProps> = React.memo(({ onCreate }) => {
  return (
    <div>
      <h2>角色管理</h2>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          创建角色
        </Button>
      </div>
    </div>
  );
});

RoleHeader.displayName = 'RoleHeader';
