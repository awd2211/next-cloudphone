/**
 * MenuTreeCard - 菜单树卡片组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Card, Tree, Space, Button, Input, Spin, Empty } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { MenuItem } from '@/types';
import { convertToTreeData } from './convertToTreeData';

const { Search } = Input;

interface MenuTreeCardProps {
  filteredMenus: MenuItem[];
  loading: boolean;
  expandedKeys: string[];
  autoExpandParent: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onRefresh: () => void;
  onExpand: (keys: string[]) => void;
  onSelect: (selectedKeys: React.Key[]) => void;
}

/**
 * MenuTreeCard 组件
 * 菜单树展示卡片，包含搜索、展开/折叠、刷新功能
 */
export const MenuTreeCard = memo<MenuTreeCardProps>(
  ({
    filteredMenus,
    loading,
    expandedKeys,
    autoExpandParent,
    searchValue,
    onSearchChange,
    onExpandAll,
    onCollapseAll,
    onRefresh,
    onExpand,
    onSelect,
  }) => {
    return (
      <Card
        title="菜单结构"
        extra={
          <Space>
            <Search
              placeholder="搜索菜单名称或路径"
              allowClear
              style={{ width: 250 }}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              prefix={<SearchOutlined />}
            />
            <Button size="small" onClick={onExpandAll}>
              展开全部
            </Button>
            <Button size="small" onClick={onCollapseAll}>
              折叠全部
            </Button>
            <Button type="primary" icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
              刷新
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          {filteredMenus.length > 0 ? (
            <Tree
              showIcon
              expandedKeys={expandedKeys}
              autoExpandParent={autoExpandParent}
              onExpand={(keys) => onExpand(keys as string[])}
              onSelect={onSelect}
              treeData={convertToTreeData(filteredMenus)}
              style={{ fontSize: 14 }}
            />
          ) : (
            <Empty description="暂无菜单数据" />
          )}
        </Spin>
      </Card>
    );
  }
);

MenuTreeCard.displayName = 'MenuTreeCard';
