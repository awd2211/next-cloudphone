/**
 * Menu Icon Helper
 * 提供菜单图标映射功能
 */
import {
  AppstoreOutlined,
  DashboardOutlined,
  UserOutlined,
} from '@ant-design/icons';

/**
 * 获取菜单图标
 */
export const getMenuIcon = (iconName?: string) => {
  if (!iconName) return <AppstoreOutlined style={{ fontSize: 14, color: '#1890ff' }} />;

  const iconMap: Record<string, React.ReactNode> = {
    DashboardOutlined: <DashboardOutlined style={{ fontSize: 14, color: '#1890ff' }} />,
    AppstoreOutlined: <AppstoreOutlined style={{ fontSize: 14, color: '#52c41a' }} />,
    UserOutlined: <UserOutlined style={{ fontSize: 14, color: '#722ed1' }} />,
    default: <AppstoreOutlined style={{ fontSize: 14, color: '#1890ff' }} />,
  };

  return iconMap[iconName] || iconMap['default'];
};
