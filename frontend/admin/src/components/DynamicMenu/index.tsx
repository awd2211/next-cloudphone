/**
 * 动态菜单组件
 * 根据用户角色动态渲染菜单
 */

import React, { useEffect, useState } from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';
import * as Icons from '@ant-design/icons';
import { fetchUserMenus, type MenuItem } from '../../utils/route-guard';

type MenuItemType = Required<MenuProps>['items'][number];

/**
 * 动态获取图标组件
 */
function getIcon(iconName?: string) {
  if (!iconName) return null;

  const IconComponent = (Icons as any)[iconName];
  if (IconComponent) {
    return React.createElement(IconComponent);
  }
  return null;
}

/**
 * 将后端菜单数据转换为 Ant Design Menu 所需的格式
 */
function transformMenuItems(menus: MenuItem[]): MenuItemType[] {
  return menus.map(menu => {
    const item: MenuItemType = {
      key: menu.path,
      label: menu.title,
      icon: getIcon(menu.icon),
    };

    if (menu.children && menu.children.length > 0) {
      return {
        ...item,
        children: transformMenuItems(menu.children),
      } as MenuItemType;
    }

    return item;
  });
}

interface DynamicMenuProps {
  mode?: 'inline' | 'horizontal' | 'vertical';
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
}

export const DynamicMenu: React.FC<DynamicMenuProps> = ({
  mode = 'inline',
  theme = 'dark',
  className,
  style,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // 加载菜单数据
  useEffect(() => {
    async function loadMenus() {
      try {
        const menus = await fetchUserMenus();
        const items = transformMenuItems(menus);
        setMenuItems(items);
      } catch (error) {
        console.error('Failed to load menus:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMenus();
  }, []);

  // 根据当前路由设置选中和展开的菜单项
  useEffect(() => {
    const currentPath = location.pathname;
    setSelectedKeys([currentPath]);

    // 展开父菜单
    const pathSegments = currentPath.split('/').filter(Boolean);
    const openKeysArray: string[] = [];

    for (let i = 1; i <= pathSegments.length; i++) {
      const path = '/' + pathSegments.slice(0, i).join('/');
      openKeysArray.push(path);
    }

    setOpenKeys(openKeysArray);
  }, [location.pathname]);

  // 菜单点击事件
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  // 子菜单展开/收起事件
  const handleOpenChange: MenuProps['onOpenChange'] = (keys) => {
    setOpenKeys(keys);
  };

  if (loading) {
    return <div>Loading menus...</div>;
  }

  return (
    <Menu
      mode={mode}
      theme={theme}
      selectedKeys={selectedKeys}
      openKeys={openKeys}
      items={menuItems}
      onClick={handleMenuClick}
      onOpenChange={handleOpenChange}
      className={className}
      style={style}
    />
  );
};

export default DynamicMenu;
