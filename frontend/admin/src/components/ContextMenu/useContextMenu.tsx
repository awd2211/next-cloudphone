/**
 * 右键菜单 Hook
 *
 * 提供表格行右键菜单功能
 * 支持：
 * 1. 右键显示菜单
 * 2. 自定义菜单项
 * 3. 菜单项权限控制
 * 4. 点击外部自动关闭
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';

export interface ContextMenuItem<T = any> {
  /** 菜单项 key */
  key: string;

  /** 菜单项标签 */
  label: React.ReactNode;

  /** 图标 */
  icon?: React.ReactNode;

  /** 点击回调 */
  onClick?: (record: T) => void;

  /** 是否危险操作（红色） */
  danger?: boolean;

  /** 是否禁用 */
  disabled?: boolean | ((record: T) => boolean);

  /** 是否显示（条件渲染） */
  visible?: boolean | ((record: T) => boolean);

  /** 分组分隔符 */
  type?: 'divider';
}

export interface UseContextMenuOptions<T> {
  /** 菜单项配置 */
  items: ContextMenuItem<T>[];

  /** 是否禁用右键菜单 */
  disabled?: boolean;
}

export interface UseContextMenuResult<T> {
  /** 右键事件处理器 */
  onContextMenu: (record: T, event: React.MouseEvent) => void;

  /** 上下文菜单组件 */
  contextMenu: React.ReactNode;

  /** 关闭菜单 */
  closeContextMenu: () => void;
}

/**
 * 右键菜单 Hook
 *
 * @example
 * ```tsx
 * const { onContextMenu, contextMenu } = useContextMenu({
 *   items: [
 *     {
 *       key: 'view',
 *       label: '查看详情',
 *       icon: <EyeOutlined />,
 *       onClick: (device) => navigate(`/devices/${device.id}`),
 *     },
 *     {
 *       key: 'edit',
 *       label: '编辑',
 *       icon: <EditOutlined />,
 *       onClick: (device) => openEditModal(device),
 *     },
 *     { type: 'divider' },
 *     {
 *       key: 'delete',
 *       label: '删除',
 *       icon: <DeleteOutlined />,
 *       danger: true,
 *       onClick: (device) => handleDelete(device.id),
 *     },
 *   ],
 * });
 *
 * return (
 *   <>
 *     <Table
 *       onRow={(record) => ({
 *         onContextMenu: (e) => onContextMenu(record, e),
 *       })}
 *     />
 *     {contextMenu}
 *   </>
 * );
 * ```
 */
export const useContextMenu = <T extends Record<string, any>>({
  items,
  disabled = false,
}: UseContextMenuOptions<T>): UseContextMenuResult<T> => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [currentRecord, setCurrentRecord] = useState<T | null>(null);

  /**
   * 右键事件处理
   */
  const onContextMenu = useCallback(
    (record: T, event: React.MouseEvent) => {
      if (disabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setCurrentRecord(record);
      setPosition({ x: event.clientX, y: event.clientY });
      setVisible(true);
    },
    [disabled]
  );

  /**
   * 关闭菜单
   */
  const closeContextMenu = useCallback(() => {
    setVisible(false);
    setCurrentRecord(null);
  }, []);

  /**
   * 点击外部关闭菜单
   */
  useEffect(() => {
    const handleClickOutside = () => {
      if (visible) {
        closeContextMenu();
      }
    };

    if (visible) {
      // 延迟绑定，避免立即触发
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [visible, closeContextMenu]);

  /**
   * 构建菜单项
   */
  const menuItems = useMemo<MenuProps['items']>(() => {
    if (!currentRecord) {
      return [];
    }

    return items
      .filter((item) => {
        // 过滤不可见的项
        if (typeof item.visible === 'function') {
          return item.visible(currentRecord);
        }
        return item.visible !== false;
      })
      .map((item) => {
        if (item.type === 'divider') {
          return { type: 'divider' as const, key: item.key };
        }

        const isDisabled =
          typeof item.disabled === 'function'
            ? item.disabled(currentRecord)
            : item.disabled;

        return {
          key: item.key,
          label: item.label,
          icon: item.icon,
          danger: item.danger,
          disabled: isDisabled,
          onClick: () => {
            if (!isDisabled && item.onClick) {
              item.onClick(currentRecord);
            }
            closeContextMenu();
          },
        };
      });
  }, [currentRecord, items, closeContextMenu]);

  /**
   * 渲染上下文菜单
   */
  const contextMenu = useMemo(() => {
    if (!visible || !currentRecord) {
      return null;
    }

    return (
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 9999,
        }}
      >
        <Dropdown
          menu={{ items: menuItems }}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              closeContextMenu();
            }
          }}
        >
          <div style={{ width: 0, height: 0 }} />
        </Dropdown>
      </div>
    );
  }, [visible, currentRecord, position, menuItems, closeContextMenu]);

  return {
    onContextMenu,
    contextMenu,
    closeContextMenu,
  };
};
