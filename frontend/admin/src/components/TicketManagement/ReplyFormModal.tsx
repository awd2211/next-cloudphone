/**
 * ReplyFormModal - 回复表单弹窗组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd';

interface ReplyFormModalProps {
  visible: boolean;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

/**
 * ReplyFormModal 组件
 * 添加工单回复的表单弹窗
 */
export const ReplyFormModal = memo<ReplyFormModalProps>(({ visible, form, onOk, onCancel }) => {
  return (
    <Modal
      title="添加回复"
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      width={600}
      okText="提交"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="userId"
          label="用户ID"
          rules={[{ required: true, message: '请输入用户ID' }]}
        >
          <Input placeholder="请输入用户ID" />
        </Form.Item>

        <Form.Item
          name="type"
          label="回复类型"
          rules={[{ required: true, message: '请选择回复类型' }]}
          initialValue="staff"
        >
          <Select>
            <Select.Option value="user">用户回复</Select.Option>
            <Select.Option value="staff">客服回复</Select.Option>
            <Select.Option value="system">系统消息</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="content"
          label="回复内容"
          rules={[{ required: true, message: '请输入回复内容' }]}
        >
          <Input.TextArea placeholder="请输入回复内容" rows={4} />
        </Form.Item>

        <Form.Item name="isInternal" valuePropName="checked">
          <Input type="checkbox" /> 内部备注（客户不可见）
        </Form.Item>
      </Form>
    </Modal>
  );
});

ReplyFormModal.displayName = 'ReplyFormModal';
