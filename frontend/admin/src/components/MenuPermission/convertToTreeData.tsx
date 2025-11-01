/**
 * Convert Menu to Tree Data
 * 转换菜单为 Ant Design Tree 节点格式
 */
import { Space, Tag } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { MenuItem } from '@/types';
import { getMenuIcon } from './menuIconHelper';

/**
 * 转换菜单为Tree节点
 */
export const convertToTreeData = (items: MenuItem[]): DataNode[] => {
  return items.map((item) => {
    const hasChildren = item.children && item.children.length > 0;
    const icon = getMenuIcon(item.icon);

    return {
      key: item.id,
      title: (
        <Space>
          {icon}
          <span style={{ fontWeight: hasChildren ? 600 : 400 }}>{item.name}</span>
          {item.permission && (
            <Tag color="blue" style={{ fontSize: 11 }}>
              <LockOutlined style={{ fontSize: 10, marginRight: 2 }} />
              {item.permission}
            </Tag>
          )}
          {!item.permission && (
            <Tag color="default" style={{ fontSize: 11 }}>
              公开
            </Tag>
          )}
          <span style={{ fontSize: 12, color: '#999' }}>{item.path}</span>
        </Space>
      ),
      children: item.children ? convertToTreeData(item.children) : undefined,
    };
  });
};
