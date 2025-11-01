import { memo } from 'react';
import { Modal, Form, Input, Select, Switch, InputNumber, Tag, type FormInstance } from 'antd';
import type { ScopeType } from '@/types';
import { getScopeTypeColor } from './dataScopeUtils';

const { TextArea } = Input;

interface CreateDataScopeModalProps {
  visible: boolean;
  form: FormInstance;
  scopeTypes: Array<{ value: ScopeType; label: string }>;
  onOk: () => void;
  onCancel: () => void;
}

export const CreateDataScopeModal = memo<CreateDataScopeModalProps>(
  ({ visible, form, scopeTypes, onOk, onCancel }) => {
    return (
      <Modal
        title="创建数据范围配置"
        open={visible}
        onOk={onOk}
        onCancel={onCancel}
        okText="创建"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="roleId"
            label="角色ID"
            rules={[{ required: true, message: '请输入角色ID' }]}
          >
            <Input placeholder="请输入角色ID" />
          </Form.Item>

          <Form.Item
            name="resourceType"
            label="资源类型"
            rules={[{ required: true, message: '请输入资源类型' }]}
          >
            <Select placeholder="请选择资源类型">
              <Select.Option value="user">用户 (user)</Select.Option>
              <Select.Option value="device">设备 (device)</Select.Option>
              <Select.Option value="order">订单 (order)</Select.Option>
              <Select.Option value="billing">账单 (billing)</Select.Option>
              <Select.Option value="ticket">工单 (ticket)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="scopeType"
            label="范围类型"
            rules={[{ required: true, message: '请选择范围类型' }]}
          >
            <Select placeholder="请选择范围类型">
              {scopeTypes.map((type) => (
                <Select.Option key={type.value} value={type.value}>
                  <Tag color={getScopeTypeColor(type.value)}>{type.label}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="includeSubDepartments"
            label="包含子部门"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          <Form.Item name="priority" label="优先级" initialValue={100} tooltip="数字越小优先级越高">
            <InputNumber min={1} max={999} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入配置描述" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

CreateDataScopeModal.displayName = 'CreateDataScopeModal';
