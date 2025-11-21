/**
 * 无障碍增强的 Button 组件
 *
 * 在 Ant Design Button 基础上添加完整的无障碍支持：
 * - 自动 ARIA 标签（特别是图标按钮）
 * - 键盘导航支持
 * - 加载状态的屏幕阅读器提示
 * - Toggle 按钮的 aria-pressed 支持
 */

import { Button, ButtonProps, Tooltip } from 'antd';
import { VisuallyHidden } from '@/utils/accessibility';
import { useMemo } from 'react';

export interface AccessibleButtonProps extends ButtonProps {
  /**
   * 按钮的无障碍标签（必填，特别是图标按钮）
   * 如果按钮只有图标没有文字，必须提供此属性
   */
  ariaLabel?: string;

  /**
   * 按钮的详细描述（可选，会显示为 tooltip）
   */
  ariaDescription?: string;

  /**
   * 是否为 toggle 按钮（会添加 aria-pressed）
   */
  toggle?: boolean;

  /**
   * toggle 按钮的按下状态
   */
  pressed?: boolean;

  /**
   * 是否为展开/收起按钮（会添加 aria-expanded）
   */
  expandable?: boolean;

  /**
   * 展开状态
   */
  expanded?: boolean;

  /**
   * 是否打开菜单/弹出层（会添加 aria-haspopup）
   */
  hasPopup?: 'menu' | 'dialog' | 'listbox' | 'tree' | 'grid' | boolean;
}

/**
 * 无障碍增强的 Button 组件
 *
 * 使用示例：
 * ```tsx
 * // 图标按钮（必须提供 ariaLabel）
 * <AccessibleButton
 *   icon={<EditOutlined />}
 *   ariaLabel="编辑用户"
 *   ariaDescription="点击编辑用户信息"
 * />
 *
 * // Toggle 按钮
 * <AccessibleButton
 *   toggle
 *   pressed={isActive}
 *   ariaLabel="切换状态"
 * >
 *   {isActive ? '已激活' : '未激活'}
 * </AccessibleButton>
 *
 * // 展开/收起按钮
 * <AccessibleButton
 *   expandable
 *   expanded={isExpanded}
 *   ariaLabel="展开详情"
 * />
 *
 * // 菜单按钮
 * <AccessibleButton
 *   hasPopup="menu"
 *   expanded={menuVisible}
 *   ariaLabel="打开菜单"
 * />
 * ```
 */
const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  ariaLabel,
  ariaDescription,
  toggle = false,
  pressed = false,
  expandable = false,
  expanded = false,
  hasPopup,
  loading,
  disabled,
  children,
  ...restProps
}) => {
  // 生成 ARIA 属性
  const ariaProps = useMemo(() => {
    const props: Record<string, unknown> = {
      'aria-label': ariaLabel,
      'aria-disabled': disabled,
      'aria-busy': loading,
    };

    // Toggle 按钮
    if (toggle) {
      props['aria-pressed'] = pressed;
    }

    // 展开/收起按钮
    if (expandable) {
      props['aria-expanded'] = expanded;
    }

    // 有弹出层的按钮
    if (hasPopup) {
      props['aria-haspopup'] = hasPopup === true ? 'menu' : hasPopup;
      props['aria-expanded'] = expanded;
    }

    return props;
  }, [ariaLabel, disabled, loading, toggle, pressed, expandable, expanded, hasPopup]);

  // 检查：如果只有图标没有文字，必须提供 ariaLabel
  const hasOnlyIcon = restProps.icon && !children;
  if (hasOnlyIcon && !ariaLabel) {
    console.warn(
      '[AccessibleButton] 图标按钮必须提供 ariaLabel 属性以支持屏幕阅读器'
    );
  }

  const buttonNode = (
    <Button {...restProps} {...ariaProps} disabled={disabled} loading={loading}>
      {/* 加载状态的屏幕阅读器提示 */}
      {loading && (
        <VisuallyHidden>
          <span aria-live="polite">正在加载</span>
        </VisuallyHidden>
      )}

      {children}
    </Button>
  );

  // 如果有描述，包裹在 Tooltip 中
  if (ariaDescription) {
    return (
      <Tooltip title={ariaDescription} mouseEnterDelay={0.5}>
        {buttonNode}
      </Tooltip>
    );
  }

  return buttonNode;
};

export { AccessibleButton };
export default AccessibleButton;
