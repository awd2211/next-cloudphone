import React from 'react';
import { Modal, Form, Input, Alert } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import { MODAL_TEXTS } from './constants';

interface CheckKeyModalProps {
  visible: boolean;
  form: FormInstance;
  checkResult: { key: string; exists: boolean } | null;
  onOk: () => void;
  onCancel: () => void;
}

export const CheckKeyModal: React.FC<CheckKeyModalProps> = React.memo(
  ({ visible, form, checkResult, onOk, onCancel }) => {
    return (
      <Modal
        title={MODAL_TEXTS.checkKey.title}
        open={visible}
        onOk={onOk}
        onCancel={onCancel}
        okText={MODAL_TEXTS.checkKey.okText}
        cancelText="关闭"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="key"
            label="缓存键"
            rules={[{ required: true, message: '请输入缓存键' }]}
          >
            <Input placeholder={MODAL_TEXTS.checkKey.placeholder} />
          </Form.Item>
        </Form>

        {checkResult && (
          <Alert
            message={checkResult.exists ? '键存在' : '键不存在'}
            description={`缓存键: ${checkResult.key}`}
            type={checkResult.exists ? 'success' : 'warning'}
            showIcon
            icon={checkResult.exists ? <CheckCircleOutlined /> : undefined}
            style={{ marginTop: 16 }}
          />
        )}
      </Modal>
    );
  }
);

CheckKeyModal.displayName = 'CheckKeyModal';
