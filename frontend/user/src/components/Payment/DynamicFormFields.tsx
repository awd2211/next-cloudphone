import React from 'react';
import { Form, Input, Alert, Select } from 'antd';
import {
  type PaymentType,
  type FormFieldConfig,
  getFormFieldsByType,
} from '@/utils/paymentConfig';

interface DynamicFormFieldsProps {
  paymentType: PaymentType | undefined;
}

/**
 * 动态表单字段组件
 *
 * 优化点:
 * 1. ✅ 配置驱动动态字段生成
 * 2. ✅ 支持多种输入类型（input、alert、select）
 * 3. ✅ 使用 React.memo 优化
 * 4. ✅ 完全替代原有的 Form.Item noStyle + shouldUpdate 复杂逻辑
 */
export const DynamicFormFields: React.FC<DynamicFormFieldsProps> = React.memo(
  ({ paymentType }) => {
    const fields = getFormFieldsByType(paymentType);

    if (fields.length === 0) return null;

    return (
      <>
        {fields.map((field: FormFieldConfig) => {
          // Alert 类型（微信支付二维码提示）
          if (field.inputType === 'alert') {
            return (
              <Form.Item key={field.name}>
                <Alert
                  message={field.alertMessage}
                  description={field.alertDescription}
                  type="info"
                  showIcon
                />
              </Form.Item>
            );
          }

          // Select 类型（银行选择）
          if (field.inputType === 'select') {
            return (
              <Form.Item
                key={field.name}
                label={field.label}
                name={field.name}
                rules={field.rules}
              >
                <Select placeholder={field.placeholder} options={field.options} />
              </Form.Item>
            );
          }

          // 默认 Input 类型
          return (
            <Form.Item
              key={field.name}
              label={field.label}
              name={field.name}
              rules={field.rules}
            >
              <Input placeholder={field.placeholder} />
            </Form.Item>
          );
        })}
      </>
    );
  }
);

DynamicFormFields.displayName = 'DynamicFormFields';
