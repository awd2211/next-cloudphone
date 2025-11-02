import React from 'react';
import { Modal, Form, Input, Alert } from 'antd';
import type { FormInstance } from 'antd';
import { MODAL_TEXTS } from './constants';

interface DeletePatternModalProps {
  visible: boolean;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

export const DeletePatternModal: React.FC<DeletePatternModalProps> = React.memo(
  ({ visible, form, onOk, onCancel }) => {
    return (
      <Modal
        title={MODAL_TEXTS.deletePattern.title}
        open={visible}
        onOk={onOk}
        onCancel={onCancel}
        okText={MODAL_TEXTS.deletePattern.okText}
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="pattern"
            label="匹配模式"
            rules={[{ required: true, message: '请输入匹配模式' }]}
          >
            <Input placeholder={MODAL_TEXTS.deletePattern.placeholder} />
          </Form.Item>
          <Alert
            message={MODAL_TEXTS.deletePattern.alertMessage}
            description={
              <div>
                <div>
                  <code>*</code> - 匹配任意数量的字符
                </div>
                <div>
                  <code>?</code> - 匹配单个字符
                </div>
                <div>
                  示例: <code>user:*</code> 匹配所有以 user: 开头的键
                </div>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: 8 }}
          />
        </Form>
      </Modal>
    );
  }
);

DeletePatternModal.displayName = 'DeletePatternModal';
