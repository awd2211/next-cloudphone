/**
 * RuleFormModal - 规则表单弹窗组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, Row, Col, Alert, Divider } from 'antd';
import type { FormInstance } from 'antd';
import type { LifecycleRule } from '@/types';
import { renderConfigForm } from './lifecycleConfigForms';

const { Option } = Select;
const { TextArea } = Input;

interface RuleFormModalProps {
  visible: boolean;
  editingRule: LifecycleRule | null;
  form: FormInstance;
  configForm: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

/**
 * RuleFormModal 组件
 * 创建或编辑生命周期规则的表单弹窗
 */
export const RuleFormModal = memo<RuleFormModalProps>(
  ({ visible, editingRule, form, configForm, onOk, onCancel }) => {
    return (
      <Modal
        title={editingRule ? '编辑生命周期规则' : '创建生命周期规则'}
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
        width={700}
        destroyOnClose
      >
        <Alert
          message="生命周期规则可以自动管理设备状态，减少人工干预"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Form form={form} layout="vertical">
          <Form.Item
            label="规则名称"
            name="name"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如: 空闲设备自动清理" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <TextArea rows={2} placeholder="规则说明" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="规则类型"
                name="type"
                rules={[{ required: true, message: '请选择规则类型' }]}
              >
                <Select
                  placeholder="选择类型"
                  onChange={(value) => {
                    configForm.resetFields();
                    form.setFieldsValue({ type: value });
                  }}
                >
                  <Option value="cleanup">自动清理</Option>
                  <Option value="autoscaling">自动扩缩容</Option>
                  <Option value="backup">自动备份</Option>
                  <Option value="expiration-warning">到期提醒</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="优先级" name="priority" initialValue={0}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="调度计划 (Cron)" name="schedule">
            <Input placeholder="例如: 0 2 * * * (每天凌晨2点)" />
          </Form.Item>

          <Form.Item label="启用规则" name="enabled" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>

          <Divider>规则配置</Divider>

          <Form form={configForm} layout="vertical">
            {form.getFieldValue('type') && renderConfigForm(form.getFieldValue('type'))}
          </Form>
        </Form>
      </Modal>
    );
  }
);

RuleFormModal.displayName = 'RuleFormModal';
