import React from 'react';
import { Modal, Form, Select, FormInstance } from 'antd';
import { type PaymentType, paymentTypeOptions } from '@/utils/paymentConfig';
import { DynamicFormFields } from './DynamicFormFields';

interface AddPaymentModalProps {
  visible: boolean;
  loading: boolean;
  form: FormInstance;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

/**
 * 添加支付方式弹窗组件
 *
 * 优化点:
 * 1. ✅ 使用 React.memo 优化
 * 2. ✅ 动态表单字段通过 DynamicFormFields 组件处理
 * 3. ✅ 配置驱动支付类型选项
 * 4. ✅ 表单实例通过 props 注入（便于父组件控制）
 */
export const AddPaymentModal: React.FC<AddPaymentModalProps> = React.memo(
  ({ visible, loading, form, onSubmit, onCancel }) => {
    // 获取当前选中的支付类型
    const paymentType = Form.useWatch('type', form) as PaymentType | undefined;

    return (
      <Modal
        title="添加支付方式"
        open={visible}
        onOk={() => form.submit()}
        onCancel={onCancel}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
        >
          {/* 支付方式类型选择 */}
          <Form.Item
            label="支付方式"
            name="type"
            rules={[{ required: true, message: '请选择支付方式' }]}
          >
            <Select
              placeholder="请选择支付方式"
              options={paymentTypeOptions}
            />
          </Form.Item>

          {/* 动态字段（根据支付类型变化） */}
          <DynamicFormFields paymentType={paymentType} />
        </Form>
      </Modal>
    );
  }
);

AddPaymentModal.displayName = 'AddPaymentModal';
