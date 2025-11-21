/**
 * 批量编辑模态框组件
 *
 * 提供批量编辑的 UI 界面
 */

import React, { memo } from 'react';
import { Modal, Form, Input, InputNumber, Select, DatePicker, Switch, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { EditField } from '@/hooks/useBatchEdit';

const { TextArea } = Input;

export interface BatchEditModalProps<T = Record<string, any>> {
  /** 是否显示 */
  visible: boolean;

  /** 关闭回调 */
  onClose: () => void;

  /** 标题 */
  title?: string;

  /** 要编辑的项目数量 */
  count?: number;

  /** 可编辑的字段列表 */
  fields: EditField<T>[];

  /** 字段值 */
  values: Partial<T>;

  /** 字段值改变回调 */
  onValueChange: <K extends keyof T>(field: K, value: T[K]) => void;

  /** 提交回调 */
  onSubmit: () => Promise<void>;

  /** 是否正在提交 */
  submitting?: boolean;
}

/**
 * 渲染表单项
 */
const renderFormItem = <T extends Record<string, any>>(
  field: EditField<T>,
  value: any,
  onChange: (value: any) => void
) => {
  const commonProps = {
    placeholder: field.placeholder || `请输入${field.label}`,
    value,
    onChange: (e: any) => {
      // 处理不同类型的 onChange 事件
      if (field.type === 'select' || field.type === 'date' || field.type === 'boolean') {
        onChange(e);
      } else if (field.type === 'number') {
        onChange(e);
      } else {
        onChange(e.target.value);
      }
    },
  };

  switch (field.type) {
    case 'text':
      return <Input {...commonProps} allowClear />;

    case 'textarea':
      return <TextArea {...commonProps} rows={4} allowClear />;

    case 'number':
      return <InputNumber {...commonProps} style={{ width: '100%' }} />;

    case 'select':
      return (
        <Select
          {...commonProps}
          options={field.options}
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      );

    case 'date':
      return <DatePicker {...commonProps} style={{ width: '100%' }} />;

    case 'boolean':
      return (
        <Switch
          checked={value}
          onChange={onChange}
          checkedChildren="是"
          unCheckedChildren="否"
        />
      );

    default:
      return <Input {...commonProps} />;
  }
};

/**
 * 批量编辑模态框组件
 *
 * @example
 * ```tsx
 * <BatchEditModal
 *   visible={visible}
 *   onClose={close}
 *   count={selectedIds.length}
 *   fields={fields}
 *   values={values}
 *   onValueChange={setValue}
 *   onSubmit={submit}
 *   submitting={submitting}
 * />
 * ```
 */
export const BatchEditModal = memo(
  <T extends Record<string, any> = Record<string, any>>({
    visible,
    onClose,
    title = '批量编辑',
    count,
    fields,
    values,
    onValueChange,
    onSubmit,
    submitting = false,
  }: BatchEditModalProps<T>) => {
    const handleSubmit = async () => {
      try {
        await onSubmit();
      } catch (error) {
        message.error((error as Error).message || '批量编辑失败');
      }
    };

    return (
      <Modal
        title={
          <span>
            <EditOutlined style={{ marginRight: 8 }} />
            {title}
            {count !== undefined && ` (${count} 项)`}
          </span>
        }
        open={visible}
        onOk={handleSubmit}
        onCancel={onClose}
        confirmLoading={submitting}
        okText="确认编辑"
        cancelText="取消"
        width={600}
        maskClosable={false}
      >
        <div style={{ marginBottom: 16, color: '#8c8c8c', fontSize: 14 }}>
          提示: 只需填写要修改的字段,未填写的字段不会被修改
        </div>

        <Form layout="vertical">
          {fields.map((field) => (
            <Form.Item
              key={String(field.name)}
              label={field.label}
              required={field.required}
              style={{ marginBottom: 16 }}
            >
              {renderFormItem(field, values[field.name], (value) =>
                onValueChange(field.name, value)
              )}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    );
  }
) as <T extends Record<string, any> = Record<string, any>>(
  props: BatchEditModalProps<T>
) => React.ReactElement;

// Display name for React DevTools
(BatchEditModal as any).displayName = 'BatchEditModal';
