import { memo } from 'react';
import { Modal, Form, Input, Select, DatePicker } from 'antd';
import type { FormInstance } from 'antd';
import type { ApiKey } from '@/types';
import { commonScopes } from './apiKeyUtils';

const { TextArea } = Input;

interface CreateEditApiKeyModalProps {
  visible: boolean;
  editingKey: ApiKey | null;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
  confirmLoading: boolean;
}

export const CreateEditApiKeyModal = memo<CreateEditApiKeyModalProps>(({
  visible,
  editingKey,
  form,
  onOk,
  onCancel,
  confirmLoading,
}) => {
  return (
    <Modal
      title={editingKey ? '编辑API密钥' : '新建API密钥'}
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="密钥名称"
          rules={[
            { required: true, message: '请输入密钥名称' },
            { max: 100, message: '名称不能超过100个字符' },
          ]}
        >
          <Input placeholder="例如：生产环境密钥" />
        </Form.Item>

        <Form.Item
          name="scopes"
          label="权限范围"
          rules={[{ required: true, message: '请选择权限范围' }]}
        >
          <Select
            mode="multiple"
            placeholder="选择API密钥的权限范围"
            options={commonScopes}
          />
        </Form.Item>

        <Form.Item
          name="expiresAt"
          label="过期时间"
          rules={[{ required: true, message: '请选择过期时间' }]}
        >
          <DatePicker
            showTime
            style={{ width: '100%' }}
            placeholder="选择密钥过期时间"
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述"
          rules={[{ max: 500, message: '描述不能超过500个字符' }]}
        >
          <TextArea
            rows={4}
            placeholder="描述此API密钥的用途和使用场景"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
});

CreateEditApiKeyModal.displayName = 'CreateEditApiKeyModal';
