import { memo } from 'react';
import { Modal, Form, Input, Select, Tabs, InputNumber } from 'antd';
import type { FormInstance } from 'antd';
import type { FieldPermission, OperationType } from '@/types';

const { TabPane } = Tabs;

interface CreateEditFieldPermissionModalProps {
  visible: boolean;
  editingPermission: FieldPermission | null;
  form: FormInstance;
  operationTypes: Array<{ value: OperationType; label: string }>;
  onOk: () => void;
  onCancel: () => void;
}

export const CreateEditFieldPermissionModal = memo<CreateEditFieldPermissionModalProps>(({
  visible,
  editingPermission,
  form,
  operationTypes,
  onOk,
  onCancel,
}) => {
  return (
    <Modal
      title={editingPermission ? '编辑字段权限配置' : '新建字段权限配置'}
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      width={700}
      okText="确定"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="roleId"
          label="角色ID"
          rules={[{ required: true, message: '请输入角色ID' }]}
        >
          <Input placeholder="请输入角色ID" disabled={!!editingPermission} />
        </Form.Item>

        <Form.Item
          name="resourceType"
          label="资源类型"
          rules={[{ required: true, message: '请输入资源类型' }]}
        >
          <Input placeholder="如: user, device, app" disabled={!!editingPermission} />
        </Form.Item>

        <Form.Item
          name="operation"
          label="操作类型"
          rules={[{ required: true, message: '请选择操作类型' }]}
        >
          <Select placeholder="请选择操作类型" options={operationTypes} />
        </Form.Item>

        <Tabs defaultActiveKey="basic">
          <TabPane tab="基础字段配置" key="basic">
            <Form.Item name="hiddenFields" label="隐藏字段" tooltip="多个字段用逗号分隔">
              <Input.TextArea placeholder="如: password, secret, 多个用逗号分隔" rows={2} />
            </Form.Item>

            <Form.Item name="readOnlyFields" label="只读字段" tooltip="多个字段用逗号分隔">
              <Input.TextArea placeholder="如: id, createdAt, 多个用逗号分隔" rows={2} />
            </Form.Item>

            <Form.Item name="writableFields" label="可写字段" tooltip="多个字段用逗号分隔">
              <Input.TextArea placeholder="如: name, email, 多个用逗号分隔" rows={2} />
            </Form.Item>

            <Form.Item name="requiredFields" label="必填字段" tooltip="多个字段用逗号分隔">
              <Input.TextArea placeholder="如: name, email, 多个用逗号分隔" rows={2} />
            </Form.Item>
          </TabPane>

          <TabPane tab="高级配置" key="advanced">
            <Form.Item
              name="priority"
              label="优先级"
              tooltip="数值越小优先级越高"
              initialValue={100}
            >
              <InputNumber min={1} max={999} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="description" label="描述">
              <Input.TextArea placeholder="请输入配置描述" rows={3} />
            </Form.Item>
          </TabPane>
        </Tabs>
      </Form>
    </Modal>
  );
});

CreateEditFieldPermissionModal.displayName = 'CreateEditFieldPermissionModal';
