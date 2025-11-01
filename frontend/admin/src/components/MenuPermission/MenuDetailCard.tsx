/**
 * MenuDetailCard - 菜单详情卡片组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Card, Descriptions, Tag, Empty } from 'antd';
import type { MenuItem } from '@/types';

interface MenuDetailCardProps {
  selectedMenu: MenuItem | null;
}

/**
 * MenuDetailCard 组件
 * 显示选中菜单的详细信息
 */
export const MenuDetailCard = memo<MenuDetailCardProps>(({ selectedMenu }) => {
  return (
    <Card title="菜单详情">
      {selectedMenu ? (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="菜单名称">{selectedMenu.name}</Descriptions.Item>
          <Descriptions.Item label="路由路径">
            <code>{selectedMenu.path}</code>
          </Descriptions.Item>
          <Descriptions.Item label="权限代码">
            {selectedMenu.permission ? (
              <Tag color="blue">{selectedMenu.permission}</Tag>
            ) : (
              <Tag color="default">无需权限（公开）</Tag>
            )}
          </Descriptions.Item>
          {selectedMenu.icon && (
            <Descriptions.Item label="图标">{selectedMenu.icon}</Descriptions.Item>
          )}
          {selectedMenu.component && (
            <Descriptions.Item label="组件">
              <code>{selectedMenu.component}</code>
            </Descriptions.Item>
          )}
          {selectedMenu.children && (
            <Descriptions.Item label="子菜单">{selectedMenu.children.length} 个</Descriptions.Item>
          )}
          {selectedMenu.meta && (
            <Descriptions.Item label="元数据">
              <pre style={{ fontSize: 12, margin: 0, maxHeight: 200, overflow: 'auto' }}>
                {JSON.stringify(selectedMenu.meta, null, 2)}
              </pre>
            </Descriptions.Item>
          )}
        </Descriptions>
      ) : (
        <Empty
          description="请从左侧选择菜单项查看详情"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  );
});

MenuDetailCard.displayName = 'MenuDetailCard';
