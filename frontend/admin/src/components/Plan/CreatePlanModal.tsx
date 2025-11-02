import React from 'react';
import { Modal, Form, Input, InputNumber, Select } from 'antd';
import type { FormInstance } from 'antd';
import type { CreatePlanDto } from '@/types';

interface CreatePlanModalProps {
  visible: boolean;
  form: FormInstance;
  editingPlan: boolean;
  confirmLoading: boolean;
  onCancel: () => void;
  onFinish: (values: CreatePlanDto) => void;
}

/**
 * 创建/编辑套餐模态框
 */
export const CreatePlanModal: React.FC<CreatePlanModalProps> = React.memo(
  ({ visible, form, editingPlan, confirmLoading, onCancel, onFinish }) => {
    return (
      <Modal
        title={editingPlan ? '编辑套餐' : '创建套餐'}
        open={visible}
        onCancel={onCancel}
        onOk={() => form.submit()}
        confirmLoading={confirmLoading}
        width={600}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            label="套餐名称"
            name="name"
            rules={[{ required: true, message: '请输入套餐名称' }]}
          >
            <Input placeholder="例如：基础版" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="套餐描述" rows={3} />
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择套餐类型' }]}
          >
            <Select placeholder="请选择">
              <Select.Option value="monthly">月付</Select.Option>
              <Select.Option value="yearly">年付</Select.Option>
              <Select.Option value="one-time">一次性</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="价格(元)"
            name="price"
            rules={[{ required: true, message: '请输入价格' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>

          <Form.Item
            label="时长(天)"
            name="duration"
            rules={[{ required: true, message: '请输入时长' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="30" />
          </Form.Item>

          <Form.Item
            label="设备数量"
            name="deviceLimit"
            rules={[{ required: true, message: '请输入设备数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="5" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

CreatePlanModal.displayName = 'CreatePlanModal';
