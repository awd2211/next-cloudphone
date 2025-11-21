/**
 * 列自定义按钮组件
 *
 * 提供一个下拉菜单,用户可以选择显示/隐藏列
 */

import { memo, useMemo } from 'react';
import { Button, Dropdown, Checkbox, Space, Typography } from 'antd';
import { SettingOutlined, EyeOutlined, EyeInvisibleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { ColumnConfig } from './useColumnCustomizer';

const { Text } = Typography;

export interface ColumnCustomizerButtonProps {
  /** 列配置数组 */
  configs: ColumnConfig[];

  /** 切换列显示的回调 */
  onToggle: (key: string) => void;

  /** 显示所有列的回调 */
  onShowAll?: () => void;

  /** 隐藏所有列的回调 */
  onHideAll?: () => void;

  /** 重置到默认状态的回调 */
  onReset?: () => void;

  /** 按钮文本 */
  buttonText?: string;

  /** 按钮图标 */
  buttonIcon?: React.ReactNode;
}

/**
 * 列自定义按钮组件
 *
 * @example
 * ```tsx
 * <ColumnCustomizerButton
 *   configs={columnConfigs}
 *   onToggle={toggleColumn}
 *   onShowAll={showAllColumns}
 *   onHideAll={hideAllColumns}
 *   onReset={resetColumns}
 * />
 * ```
 */
export const ColumnCustomizerButton = memo<ColumnCustomizerButtonProps>(
  ({
    configs,
    onToggle,
    onShowAll,
    onHideAll,
    onReset,
    buttonText = '列设置',
    buttonIcon = <SettingOutlined />,
  }) => {
    // 计算统计信息
    const stats = useMemo(() => {
      const visible = configs.filter(c => c.visible).length;
      const total = configs.length;
      const hidden = total - visible;
      return { visible, total, hidden };
    }, [configs]);

    // 构建下拉菜单项
    const menuItems: MenuProps['items'] = useMemo(() => {
      const items: MenuProps['items'] = [
        // 统计信息
        {
          key: 'stats',
          label: (
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                显示 {stats.visible} / {stats.total} 列
              </Text>
            </Space>
          ),
          disabled: true,
        },
        { key: 'divider-1', type: 'divider' },
      ];

      // 列复选框
      configs.forEach(config => {
        items.push({
          key: config.key,
          label: (
            <Checkbox
              checked={config.visible}
              disabled={config.fixed}
              onChange={() => onToggle(config.key)}
            >
              {config.title}
              {config.fixed && (
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                  (固定)
                </Text>
              )}
            </Checkbox>
          ),
          onClick: (e) => {
            // 阻止菜单关闭
            e.domEvent.stopPropagation();
            e.domEvent.preventDefault();
          },
        });
      });

      // 操作按钮
      if (onShowAll || onHideAll || onReset) {
        items.push({ key: 'divider-2', type: 'divider' });

        if (onShowAll) {
          items.push({
            key: 'show-all',
            label: (
              <Space>
                <EyeOutlined />
                显示全部
              </Space>
            ),
            onClick: () => onShowAll(),
          });
        }

        if (onHideAll) {
          items.push({
            key: 'hide-all',
            label: (
              <Space>
                <EyeInvisibleOutlined />
                隐藏全部
              </Space>
            ),
            onClick: () => onHideAll(),
          });
        }

        if (onReset) {
          items.push({
            key: 'reset',
            label: (
              <Space>
                <ReloadOutlined />
                重置默认
              </Space>
            ),
            onClick: () => onReset(),
          });
        }
      }

      return items;
    }, [configs, stats, onToggle, onShowAll, onHideAll, onReset]);

    return (
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        placement="bottomRight"
      >
        <Button icon={buttonIcon}>
          {buttonText}
          {stats.hidden > 0 && (
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
              ({stats.hidden} 隐藏)
            </Text>
          )}
        </Button>
      </Dropdown>
    );
  }
);

ColumnCustomizerButton.displayName = 'ColumnCustomizerButton';
