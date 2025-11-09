/**
 * Menu Icon Helper
 * 提供菜单图标映射功能
 */
import {
  AppstoreOutlined,
  DashboardOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { GlobalToken } from 'antd';

/**
 * 获取菜单图标
 * @param iconName 图标名称
 * @param token Ant Design token (从 theme.useToken() 获取)
 */
export const getMenuIcon = (iconName?: string, token?: GlobalToken) => {
  const primaryColor = token?.colorPrimary || '#1890ff';

  if (!iconName) return <AppstoreOutlined style={{ fontSize: 14, color: primaryColor }} />;

  const iconMap: Record<string, React.ReactNode> = {
    DashboardOutlined: <DashboardOutlined style={{ fontSize: 14, color: primaryColor }} />,
    AppstoreOutlined: <AppstoreOutlined style={{ fontSize: 14, color: '#52c41a' }} />,
    UserOutlined: <UserOutlined style={{ fontSize: 14, color: '#722ed1' }} />,
    default: <AppstoreOutlined style={{ fontSize: 14, color: primaryColor }} />,
  };

  return iconMap[iconName] || iconMap['default'];
};
