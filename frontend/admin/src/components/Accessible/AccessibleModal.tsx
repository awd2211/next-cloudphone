/**
 * 无障碍增强的 Modal 组件
 *
 * 在 Ant Design Modal 基础上添加完整的无障碍支持：
 * - 焦点捕获（Focus Trap）
 * - Escape 键关闭
 * - 焦点恢复
 * - 正确的 ARIA 属性
 * - 屏幕阅读器提示
 */

import { Modal, ModalProps } from 'antd';
import { useEffect, useRef } from 'react';
import { ariaLabels, focusManagement, keyboardNav } from '@/utils/accessibility';

export interface AccessibleModalProps extends ModalProps {
  /**
   * 模态框的标题（用于 ARIA 标签）
   */
  title: React.ReactNode;

  /**
   * 模态框的描述（可选，用于 aria-describedby）
   */
  description?: string;

  /**
   * 是否启用焦点捕获（默认 true）
   */
  trapFocus?: boolean;

  /**
   * 关闭时的回调（增强的版本，确保焦点恢复）
   */
  onClose?: () => void;
}

/**
 * 无障碍增强的 Modal 组件
 *
 * 特性：
 * - 自动焦点管理
 * - 键盘导航支持（Escape 关闭）
 * - ARIA 属性完整
 * - 焦点捕获和恢复
 *
 * 使用示例：
 * ```tsx
 * <AccessibleModal
 *   open={visible}
 *   title="编辑用户"
 *   description="在此表单中修改用户信息"
 *   onClose={() => setVisible(false)}
 *   onOk={handleSubmit}
 * >
 *   <Form>...</Form>
 * </AccessibleModal>
 * ```
 */
const AccessibleModal: React.FC<AccessibleModalProps> = ({
  open,
  title,
  description,
  trapFocus = true,
  onClose,
  onCancel,
  children,
  ...restProps
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<(() => void) | null>(null);

  // 当模态框打开时，保存当前焦点并设置焦点捕获
  useEffect(() => {
    if (!open) return;

    // 保存当前焦点，以便关闭时恢复
    restoreFocusRef.current = focusManagement.saveFocus();

    // 设置焦点捕获
    if (trapFocus && modalRef.current) {
      const cleanup = focusManagement.trapFocus(modalRef.current);
      return cleanup;
    }
  }, [open, trapFocus]);

  // 处理关闭
  const handleClose = (e?: React.MouseEvent<HTMLElement>) => {
    // 恢复焦点
    if (restoreFocusRef.current) {
      restoreFocusRef.current();
      restoreFocusRef.current = null;
    }

    // 调用关闭回调
    if (onClose) {
      onClose();
    }

    if (onCancel) {
      onCancel(e!);
    }
  };

  // 生成 ARIA 属性
  const ariaProps = ariaLabels.modal.dialog(
    typeof title === 'string' ? title : '对话框'
  );

  return (
    <Modal
      {...restProps}
      open={open}
      title={<span id={ariaProps.titleId}>{title}</span>}
      onCancel={handleClose}
      // 添加 ARIA 属性到模态框容器
      modalRender={(node) => (
        <div
          ref={modalRef}
          role={ariaProps.role}
          aria-modal={ariaProps['aria-modal']}
          aria-labelledby={ariaProps['aria-labelledby']}
          aria-describedby={description ? ariaProps['aria-describedby'] : undefined}
          onKeyDown={keyboardNav.handleEscape(handleClose)}
        >
          {description && (
            <div
              id={ariaProps.descId}
              style={{
                position: 'absolute',
                left: '-9999px',
                width: '1px',
                height: '1px',
              }}
            >
              {description}
            </div>
          )}
          {node}
        </div>
      )}
      closeIcon={
        <span {...ariaLabels.modal.closeButton()}>
          {restProps.closeIcon || '×'}
        </span>
      }
    >
      {children}
    </Modal>
  );
};

export default AccessibleModal;
