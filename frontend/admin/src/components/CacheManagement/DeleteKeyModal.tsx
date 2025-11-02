import React from 'react';
import { Modal, Form, Input, Alert } from 'antd';
import type { FormInstance } from 'antd';
import { MODAL_TEXTS } from './constants';

interface DeleteKeyModalProps {
  visible: boolean;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

export const DeleteKeyModal: React.FC<DeleteKeyModalProps> = React.memo(
  ({ visible, form, onOk, onCancel }) => {
    return (
      <Modal
        title={MODAL_TEXTS.deleteKey.title}
        open={visible}
        onOk={onOk}
        onCancel={onCancel}
        okText={MODAL_TEXTS.deleteKey.okText}
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="key"
            label="缓存键"
            rules={[{ required: true, message: '请输入缓存键' }]}
          >
            <Input placeholder={MODAL_TEXTS.deleteKey.placeholder} />
          </Form.Item>
          <Alert
            message={MODAL_TEXTS.deleteKey.alertMessage}
            description={MODAL_TEXTS.deleteKey.alertDescription}
            type="warning"
            showIcon
            style={{ marginTop: 8 }}
          />
        </Form>
      </Modal>
    );
  }
);

DeleteKeyModal.displayName = 'DeleteKeyModal';
