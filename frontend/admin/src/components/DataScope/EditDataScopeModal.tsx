import { memo } from 'react';
import { Modal, Form, Select, Switch, InputNumber, Input, Tag, type FormInstance } from 'antd';
import type { ScopeType } from '@/types';
import { getScopeTypeColor } from './dataScopeUtils';

const { TextArea } = Input;

interface EditDataScopeModalProps {
  visible: boolean;
  form: FormInstance;
  scopeTypes: Array<{ value: ScopeType; label: string }>;
  onOk: () => void;
  onCancel: () => void;
}

export const EditDataScopeModal = memo<EditDataScopeModalProps>(
  ({ visible, form, scopeTypes, onOk, onCancel }) => {
    return (
      <Modal
        title="编辑数据范围配置"
        open={visible}
        onOk={onOk}
        onCancel={onCancel}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="scopeType" label="范围类型">
            <Select placeholder="请选择范围类型">
              {scopeTypes.map((type) => (
                <Select.Option key={type.value} value={type.value}>
                  <Tag color={getScopeTypeColor(type.value)}>{type.label}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="includeSubDepartments" label="包含子部门" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="priority" label="优先级" tooltip="数字越小优先级越高">
            <InputNumber min={1} max={999} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="isActive" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入配置描述" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

EditDataScopeModal.displayName = 'EditDataScopeModal';
