import { memo } from 'react';
import { Modal, Form, Input, InputNumber, Select, Row, Col, Divider } from 'antd';
import type { FormInstance } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

interface CreateTemplateModalProps {
  visible: boolean;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

export const CreateTemplateModal = memo<CreateTemplateModalProps>(
  ({ visible, form, onOk, onCancel }) => {
    return (
      <Modal
        title="新建设备模板"
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item label="模板描述" name="description">
            <TextArea rows={3} placeholder="请输入模板描述" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="分类" name="category">
                <Select placeholder="请选择分类">
                  <Option value="开发测试">开发测试</Option>
                  <Option value="游戏">游戏</Option>
                  <Option value="社交">社交</Option>
                  <Option value="办公">办公</Option>
                  <Option value="其他">其他</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="可见性" name="isPublic" initialValue={true}>
                <Select>
                  <Option value={true}>公开（所有用户可见）</Option>
                  <Option value={false}>私有（仅自己可见）</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Divider>设备配置</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Android 版本"
                name="androidVersion"
                rules={[{ required: true, message: '请输入 Android 版本' }]}
                initialValue="11"
              >
                <Select>
                  <Option value="9">Android 9</Option>
                  <Option value="10">Android 10</Option>
                  <Option value="11">Android 11</Option>
                  <Option value="12">Android 12</Option>
                  <Option value="13">Android 13</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="CPU 核心数"
                name="cpuCores"
                rules={[{ required: true, message: '请输入 CPU 核心数' }]}
                initialValue={2}
              >
                <InputNumber min={1} max={8} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="内存 (MB)"
                name="memoryMB"
                rules={[{ required: true, message: '请输入内存大小' }]}
                initialValue={2048}
              >
                <InputNumber min={512} max={16384} step={512} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="存储 (MB)"
                name="storageMB"
                rules={[{ required: true, message: '请输入存储大小' }]}
                initialValue={8192}
              >
                <InputNumber min={1024} max={102400} step={1024} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="标签" name="tags">
            <Select mode="tags" placeholder="输入标签后按回车添加" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

CreateTemplateModal.displayName = 'CreateTemplateModal';
