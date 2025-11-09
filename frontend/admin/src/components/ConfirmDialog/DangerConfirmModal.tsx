/**
 * 危险操作确认对话框
 *
 * 用于需要用户明确确认的危险操作（如删除、重置等）
 * 提供多重确认机制，防止误操作
 */

import { Modal, Typography, Alert, Checkbox, Input } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useState } from 'react';

const { Text } = Typography;

/**
 * 危险操作确认选项
 */
export interface DangerConfirmOptions {
  /** 对话框标题 */
  title: string;

  /** 主要说明内容 */
  content: string | React.ReactNode;

  /** 确认按钮文本 */
  okText?: string;

  /** 取消按钮文本 */
  cancelText?: string;

  /** 需要输入的确认文本（强制确认） */
  requiresTyping?: string;

  /** 是否需要勾选确认 */
  requiresCheckbox?: boolean;

  /** 确认复选框文本 */
  checkboxText?: string;

  /** 操作后果列表（警告提示） */
  consequences?: string[];

  /** 对话框宽度 */
  width?: number;
}

/**
 * 显示危险操作确认对话框
 *
 * @param options 确认选项
 * @returns Promise<boolean> - 用户确认返回 true，取消返回 false
 *
 * @example
 * ```tsx
 * // 基本使用
 * const confirmed = await dangerConfirm({
 *   title: '删除设备',
 *   content: `确定要删除设备 "${device.name}" 吗？`,
 *   consequences: ['设备数据将被永久删除', '此操作无法撤销'],
 * });
 *
 * if (confirmed) {
 *   await deleteDevice(device.id);
 * }
 *
 * // 需要输入确认
 * const confirmed = await dangerConfirm({
 *   title: '删除所有设备',
 *   content: '此操作将删除所有设备，无法恢复',
 *   requiresTyping: 'DELETE ALL',
 *   consequences: ['所有设备将被永久删除', '所有快照和备份也将被删除'],
 * });
 * ```
 */
export const dangerConfirm = (options: DangerConfirmOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    const {
      title,
      content,
      okText = '确认删除',
      cancelText = '取消',
      requiresTyping,
      requiresCheckbox = true,
      checkboxText = '我了解此操作无法撤销',
      consequences = [],
      width = 520,
    } = options;

    // 状态管理（通过闭包）
    let confirmTyped = !requiresTyping;
    let checkboxChecked = !requiresCheckbox;
    let updateButtonState: (() => void) | null = null;

    // 内容组件
    const Content = () => {
      const [typedText, setTypedText] = useState('');
      const [checked, setChecked] = useState(false);

      // 更新按钮状态的函数
      updateButtonState = () => {
        const okButton = document.querySelector<HTMLButtonElement>(
          '.ant-modal-confirm-btns .ant-btn-dangerous'
        );
        if (okButton) {
          okButton.disabled = !confirmTyped || !checkboxChecked;
        }
      };

      return (
        <div style={{ marginTop: 16 }}>
          <Typography.Paragraph>{content}</Typography.Paragraph>

          {/* 操作后果警告 */}
          {consequences.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message="此操作将导致以下后果："
              description={
                <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                  {consequences.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              }
              style={{ marginBottom: 16 }}
            />
          )}

          {/* 输入确认文本 */}
          {requiresTyping && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>
                请输入 "<span style={{ color: '#ff4d4f' }}>{requiresTyping}</span>" 以确认删除：
              </Text>
              <Input
                placeholder={requiresTyping}
                style={{ marginTop: 8 }}
                onChange={(e) => {
                  const value = e.target.value;
                  setTypedText(value);
                  confirmTyped = value === requiresTyping;
                  updateButtonState?.();
                }}
                value={typedText}
                autoFocus
              />
            </div>
          )}

          {/* 确认复选框 */}
          {requiresCheckbox && (
            <Checkbox
              checked={checked}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setChecked(isChecked);
                checkboxChecked = isChecked;
                updateButtonState?.();
              }}
            >
              {checkboxText}
            </Checkbox>
          )}
        </div>
      );
    };

    // 创建并显示对话框
    const modal = Modal.confirm({
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 22 }} />
          <span>{title}</span>
        </div>
      ),
      icon: null,
      content: <Content />,
      width,
      okText,
      okType: 'danger',
      okButtonProps: {
        disabled: !confirmTyped || !checkboxChecked,
      },
      cancelText,
      onOk() {
        resolve(true);
      },
      onCancel() {
        resolve(false);
      },
      afterOpenChange: (open) => {
        if (open) {
          // 对话框打开后初始化按钮状态
          setTimeout(() => {
            updateButtonState?.();
          }, 100);
        }
      },
    });
  });
};

/**
 * 简化版：用于快速删除操作
 */
export const dangerDelete = (itemName: string): Promise<boolean> => {
  return dangerConfirm({
    title: '确认删除',
    content: `确定要删除 "${itemName}" 吗？`,
    okText: '确认删除',
    cancelText: '取消',
    consequences: ['此操作无法撤销'],
  });
};

/**
 * 批量删除确认
 */
export const dangerBatchDelete = (count: number, itemType: string = '项'): Promise<boolean> => {
  return dangerConfirm({
    title: '批量删除确认',
    content: `确定要删除选中的 ${count} ${itemType}吗？`,
    okText: '确认删除',
    cancelText: '取消',
    consequences: [
      `将删除 ${count} ${itemType}`,
      '所有相关数据将被永久删除',
      '此操作无法撤销',
    ],
    requiresCheckbox: true,
  });
};

/**
 * 危险的批量删除（需要输入确认）
 */
export const dangerCriticalBatchDelete = (
  count: number,
  itemType: string = '项'
): Promise<boolean> => {
  return dangerConfirm({
    title: '⚠️ 危险操作警告',
    content: `您即将删除 ${count} ${itemType}，此操作极其危险！`,
    okText: '我确定要删除',
    cancelText: '取消',
    requiresTyping: 'DELETE',
    consequences: [
      `将永久删除 ${count} ${itemType}`,
      '所有关联数据也将被删除',
      '备份和快照也将被删除',
      '此操作无法撤销，无法恢复',
    ],
    width: 600,
  });
};
