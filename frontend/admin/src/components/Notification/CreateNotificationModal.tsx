import React from 'react';
import { Modal, Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd';
import type { CreateNotificationDto } from '@/services/notification';

interface CreateNotificationModalProps {
  visible: boolean;
  form: FormInstance;
  onFinish: (values: CreateNotificationDto) => void;
  onCancel: () => void;
}

export const CreateNotificationModal: React.FC<CreateNotificationModalProps> = React.memo(
  ({ visible, form, onFinish, onCancel }) => {
    return (
      <Modal
        title="发送通知"
        open={visible}
        onCancel={onCancel}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            label="通知类型"
            name="type"
            rules={[{ required: true, message: '请选择通知类型' }]}
            initialValue="info"
          >
            <Select>
              <Select.Option value="info">信息</Select.Option>
              <Select.Option value="warning">警告</Select.Option>
              <Select.Option value="error">错误</Select.Option>
              <Select.Option value="success">成功</Select.Option>
              <Select.Option value="announcement">公告</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="通知标题"
            name="title"
            rules={[{ required: true, message: '请输入通知标题' }]}
          >
            <Input placeholder="请输入通知标题" />
          </Form.Item>

          <Form.Item
            label="通知内容"
            name="content"
            rules={[{ required: true, message: '请输入通知内容' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入通知内容" />
          </Form.Item>

          <Form.Item label="接收对象" name="sendToAll" initialValue={true}>
            <Select>
              <Select.Option value={true}>所有用户</Select.Option>
              <Select.Option value={false}>指定用户</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.sendToAll !== currentValues.sendToAll
            }
          >
            {({ getFieldValue }) =>
              !getFieldValue('sendToAll') && (
                <Form.Item
                  label="用户ID列表"
                  name="userIds"
                  rules={[{ required: true, message: '请输入用户ID' }]}
                >
                  <Select
                    mode="tags"
                    placeholder="输入用户ID，按回车添加"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

CreateNotificationModal.displayName = 'CreateNotificationModal';
