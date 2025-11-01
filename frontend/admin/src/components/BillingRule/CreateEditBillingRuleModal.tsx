import { memo } from 'react';
import { Modal, Form, Input, Select, Row, Col, InputNumber, DatePicker, Divider, Space, Button, message } from 'antd';
import type { FormInstance } from 'antd';
import type { BillingRule } from '@/types';

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface CreateEditBillingRuleModalProps {
  visible: boolean;
  editingRule: BillingRule | null;
  form: FormInstance;
  templates: any[];
  onOk: () => void;
  onCancel: () => void;
  onApplyTemplate: (template: any) => void;
}

export const CreateEditBillingRuleModal = memo<CreateEditBillingRuleModalProps>(
  ({ visible, editingRule, form, templates, onOk, onCancel, onApplyTemplate }) => {
    return (
      <Modal
        title={editingRule ? '编辑计费规则' : '创建计费规则'}
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
        width={800}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="规则名称"
            name="name"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如: 标准时长计费" />
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
                <Select placeholder="选择类型">
                  <Option value="time-based">按时长计费</Option>
                  <Option value="usage-based">按用量计费</Option>
                  <Option value="tiered">阶梯式计费</Option>
                  <Option value="custom">自定义公式</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="优先级" name="priority" initialValue={0}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={
              <span>
                计费公式{' '}
                <a onClick={() => message.info('支持变量: hours, cpuCores, memoryMB, storageMB')}>
                  查看帮助
                </a>
              </span>
            }
            name="formula"
            rules={[{ required: true, message: '请输入计费公式' }]}
          >
            <Input placeholder="例如: hours * cpuCores * 0.5 + memoryMB * 0.001" />
          </Form.Item>

          <Form.Item
            label="参数 (JSON格式)"
            name="parameters"
            rules={[
              {
                validator: async (_, value) => {
                  if (value) {
                    try {
                      JSON.parse(value);
                    } catch {
                      throw new Error('JSON格式不正确');
                    }
                  }
                },
              },
            ]}
          >
            <TextArea rows={4} placeholder='{"basePrice": 0.5, "cpuPricePerCore": 0.3}' />
          </Form.Item>

          <Form.Item label="有效期" name="validRange">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          {templates.length > 0 && (
            <>
              <Divider>快速应用模板</Divider>
              <Space wrap>
                {templates.map((template: any) => (
                  <Button key={template.id} size="small" onClick={() => onApplyTemplate(template)}>
                    {template.name}
                  </Button>
                ))}
              </Space>
            </>
          )}
        </Form>
      </Modal>
    );
  }
);

CreateEditBillingRuleModal.displayName = 'CreateEditBillingRuleModal';
