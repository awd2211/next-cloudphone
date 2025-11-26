import { memo } from 'react';
import { Modal, Form, Select, InputNumber, Input, Switch, type FormInstance } from 'antd';
import type { Role } from '@/types';
import type { DataScope } from '@/hooks/useDataScope';
import { NEUTRAL_LIGHT } from '@/theme';
import { ScopeType } from '@/hooks/useDataScope';
import { resourceTypes } from './constants';

interface CreateEditDataScopeModalProps {
  visible: boolean;
  editingScope: DataScope | null;
  form: FormInstance;
  roles: Role[];
  scopeTypes: Array<{ value: ScopeType; label: string; description?: string }>;
  onFinish: (values: any) => void;
  onOk: () => void;
  onCancel: () => void;
}

export const CreateEditDataScopeModal = memo<CreateEditDataScopeModalProps>(
  ({ visible, editingScope, form, roles, scopeTypes, onFinish, onOk, onCancel }) => {
    return (
      <Modal
        title={editingScope ? '编辑数据范围配置' : '创建数据范围配置'}
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
        width={700}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item label="角色" name="roleId" rules={[{ required: true, message: '请选择角色' }]}>
            <Select placeholder="选择角色" disabled={!!editingScope}>
              {roles.map((role) => (
                <Select.Option key={role.id} value={role.id}>
                  {role.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="资源类型"
            name="resourceType"
            rules={[{ required: true, message: '请选择资源类型' }]}
          >
            <Select placeholder="选择资源类型" disabled={!!editingScope}>
              {resourceTypes.map((type) => (
                <Select.Option key={type.value} value={type.value}>
                  {type.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="范围类型"
            name="scopeType"
            rules={[{ required: true, message: '请选择范围类型' }]}
          >
            <Select placeholder="选择范围类型">
              {scopeTypes.map((type) => (
                <Select.Option key={type.value} value={type.value}>
                  <div>
                    <div>{type.label}</div>
                    {type.description && (
                      <div style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary }}>{type.description}</div>
                    )}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.scopeType !== currentValues.scopeType
            }
          >
            {({ getFieldValue }) => {
              const scopeType = getFieldValue('scopeType');

              return (
                <>
                  {scopeType === ScopeType.CUSTOM && (
                    <Form.Item label="自定义过滤器" name="filter">
                      <Input.TextArea
                        placeholder='JSON 格式，例如：{"status": "active", "region": "cn"}'
                        rows={4}
                      />
                    </Form.Item>
                  )}

                  {(scopeType === ScopeType.DEPARTMENT ||
                    scopeType === ScopeType.DEPARTMENT_ONLY) && (
                    <>
                      <Form.Item label="部门ID列表" name="departmentIds">
                        <Select mode="tags" placeholder="输入部门ID，回车添加" />
                      </Form.Item>

                      <Form.Item
                        label="包含子部门"
                        name="includeSubDepartments"
                        valuePropName="checked"
                      >
                        <Switch checkedChildren="是" unCheckedChildren="否" />
                      </Form.Item>
                    </>
                  )}
                </>
              );
            }}
          </Form.Item>

          <Form.Item label="优先级" name="priority" initialValue={100}>
            <InputNumber
              min={0}
              max={999}
              style={{ width: '100%' }}
              placeholder="数值越小优先级越高"
            />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="配置描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

CreateEditDataScopeModal.displayName = 'CreateEditDataScopeModal';
