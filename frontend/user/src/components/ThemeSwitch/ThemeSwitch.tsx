/**
 * 主题切换按钮组件
 *
 * 提供主题切换的 UI 控制
 */

import { memo } from 'react';
import { Dropdown, Button, Space, Tooltip, theme } from 'antd';
import { BulbOutlined, BulbFilled, SettingOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { ThemeMode } from '@/hooks/useTheme';

export interface ThemeSwitchProps {
  /** 当前主题模式 */
  mode: ThemeMode;

  /** 实际使用的主题 */
  actualTheme: 'light' | 'dark';

  /** 切换主题模式 */
  onModeChange: (mode: ThemeMode) => void;

  /** 快速切换 (light ⇄ dark) */
  onToggle: () => void;

  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';

  /** 显示模式 (icon-only: 仅图标, dropdown: 下拉菜单) */
  variant?: 'icon-only' | 'dropdown';
}

/**
 * 主题切换按钮组件
 *
 * @example
 * ```tsx
 * // 仅图标模式 (快速切换)
 * <ThemeSwitch
 *   mode={mode}
 *   actualTheme={actualTheme}
 *   onModeChange={setMode}
 *   onToggle={toggleTheme}
 *   variant="icon-only"
 * />
 *
 * // 下拉菜单模式 (完整选项)
 * <ThemeSwitch
 *   mode={mode}
 *   actualTheme={actualTheme}
 *   onModeChange={setMode}
 *   onToggle={toggleTheme}
 *   variant="dropdown"
 * />
 * ```
 */
export const ThemeSwitch = memo<ThemeSwitchProps>(({
  mode,
  actualTheme,
  onModeChange,
  onToggle,
  size = 'middle',
  variant = 'icon-only',
}) => {
  const { token } = theme.useToken();

  // 下拉菜单项
  const menuItems: MenuProps['items'] = [
    {
      key: 'light',
      label: (
        <Space>
          <BulbOutlined />
          <span>亮色模式</span>
          {mode === 'light' && <span style={{ color: token.colorPrimary }}>✓</span>}
        </Space>
      ),
      onClick: () => onModeChange('light'),
    },
    {
      key: 'dark',
      label: (
        <Space>
          <BulbFilled />
          <span>暗色模式</span>
          {mode === 'dark' && <span style={{ color: token.colorPrimary }}>✓</span>}
        </Space>
      ),
      onClick: () => onModeChange('dark'),
    },
    {
      key: 'auto',
      label: (
        <Space>
          <SettingOutlined />
          <span>跟随系统</span>
          {mode === 'auto' && <span style={{ color: token.colorPrimary }}>✓</span>}
        </Space>
      ),
      onClick: () => onModeChange('auto'),
    },
  ];

  // 仅图标模式 (快速切换)
  if (variant === 'icon-only') {
    const tooltipTitle = actualTheme === 'dark' ? '切换到亮色模式' : '切换到暗色模式';

    return (
      <Tooltip title={tooltipTitle}>
        <Button
          type="text"
          size={size}
          icon={actualTheme === 'dark' ? <BulbFilled /> : <BulbOutlined />}
          onClick={onToggle}
        />
      </Tooltip>
    );
  }

  // 下拉菜单模式 (完整选项)
  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <Button
        type="text"
        size={size}
        icon={actualTheme === 'dark' ? <BulbFilled /> : <BulbOutlined />}
      >
        {mode === 'light' && '亮色'}
        {mode === 'dark' && '暗色'}
        {mode === 'auto' && '自动'}
      </Button>
    </Dropdown>
  );
});

ThemeSwitch.displayName = 'ThemeSwitch';
